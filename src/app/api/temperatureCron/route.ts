import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { userTemperatureProfile, users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { obtainFreshAccessToken } from "~/server/eight/auth";
import { type Token } from "~/server/eight/types";
import { setHeatingLevel, turnOnSide, turnOffSide } from "~/server/eight/eight";
import { getCurrentHeatingStatus } from "~/server/eight/user";

export const runtime = "nodejs";

function createDateWithTime(baseDate: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time string: ${timeString}`);
  }
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isTimeBetween(current: Date, start: Date, end: Date, bufferMinutes= 1): boolean {
  const bufferMs = bufferMinutes * 60 * 1000;
  
  // Normalize all dates to the same day
  const normalizeDate = (date: Date) => new Date(2000, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds());
  
  const normalizedCurrent = normalizeDate(current);
  let normalizedStart = normalizeDate(start);
  let normalizedEnd = normalizeDate(end);

  // If end is before start, it means the period crosses midnight
  if (normalizedEnd <= normalizedStart) {
    if (normalizedCurrent > normalizedStart) {
      normalizedEnd = addDays(normalizedEnd, 1);
    } else {
      normalizedStart = addDays(normalizedStart, -1);
    }
  }

  return normalizedCurrent >= new Date(normalizedStart.getTime() - bufferMs) && 
         normalizedCurrent < new Date(normalizedEnd.getTime() + bufferMs);
}

async function retryApiCall<T>(apiCall: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error("This should never happen due to the for loop, but TypeScript doesn't know that");
}

export async function adjustTemperature() {
  const profiles = await db
    .select()
    .from(userTemperatureProfile)
    .innerJoin(users, eq(userTemperatureProfile.email, users.email));

  for (const profile of profiles) {
    try {
      // Refresh the token if it's expired
      let token: Token = {
        eightAccessToken: profile.users.eightAccessToken,
        eightRefreshToken: profile.users.eightRefreshToken,
        eightExpiresAtPosix: profile.users.eightTokenExpiresAt.getTime(),
        eightUserId: profile.users.eightUserId,
      };

      const now = new Date();
      if (now.getTime() > token.eightExpiresAtPosix) {
        token = await obtainFreshAccessToken(
          token.eightRefreshToken,
          token.eightUserId,
        );
        await db
          .update(users)
          .set({
            eightAccessToken: token.eightAccessToken,
            eightRefreshToken: token.eightRefreshToken,
            eightTokenExpiresAt: new Date(token.eightExpiresAtPosix),
          })
          .where(eq(users.email, profile.users.email));
      }

      const userTemperatureProfile = profile.userTemperatureProfiles;

      // Get current time in user's timezone
      const userNow = new Date(
        now.toLocaleString("en-US", {
          timeZone: userTemperatureProfile.timezoneTZ,
        }),
      );

      // Create Date objects for bed time and wake-up time
      const bedTime = createDateWithTime(userNow, userTemperatureProfile.bedTime);
      let wakeupTime = createDateWithTime(userNow, userTemperatureProfile.wakeupTime);
      
      // Adjust wakeup time if it's before bed time (i.e., it's on the next day)
      if (wakeupTime <= bedTime) {
        wakeupTime = addDays(wakeupTime, 1);
      }

      // Calculate pre-heating time (1 hour before bed time)
      const preHeatingTime = new Date(bedTime.getTime() - 60 * 60 * 1000);

      const heatingStatus = await retryApiCall(() => getCurrentHeatingStatus(token));
      console.log(
        `heatingStatus: ${JSON.stringify(heatingStatus)} for user ${profile.users.email}`,
      );

      console.log(
        `User's current time: ${userNow.toISOString()} for user ${profile.users.email}`,
      );
      console.log(
        `bedTime: ${bedTime.toISOString()} for user ${profile.users.email}`,
      );
      console.log(
        `wakeupTime: ${wakeupTime.toISOString()} for user ${profile.users.email}`,
      );
      console.log(
        `preHeatingTime: ${preHeatingTime.toISOString()} for user ${profile.users.email}`,
      );

      // Determine if heating should be on
      const isHeatingPeriod = isTimeBetween(userNow, preHeatingTime, wakeupTime);

      if (isHeatingPeriod) {
        let currentLevel: number;
        let sleepStage: string;

        const midStageTime = new Date(bedTime.getTime() + 60 * 60 * 1000);
        const finalStageTime = new Date(wakeupTime.getTime() - 2 * 60 * 60 * 1000);

        if (isTimeBetween(userNow, preHeatingTime, bedTime)) {
          currentLevel = userTemperatureProfile.initialSleepLevel;
          sleepStage = "pre-heating";
        } else if (isTimeBetween(userNow, bedTime, midStageTime)) {
          currentLevel = userTemperatureProfile.initialSleepLevel;
          sleepStage = "initial";
        } else if (isTimeBetween(userNow, midStageTime, finalStageTime)) {
          currentLevel = userTemperatureProfile.midStageSleepLevel;
          sleepStage = "mid";
        } else {
          currentLevel = userTemperatureProfile.finalSleepLevel;
          sleepStage = "final";
        }
        
        console.log(
          `target sleepStage: ${sleepStage} for user ${profile.users.email}`,
        );

        if (!heatingStatus.isHeating) {
          await retryApiCall(() => turnOnSide(token, profile.users.eightUserId));
          console.log(`Heating turned on for user ${profile.users.email}`);
        }
        if (heatingStatus.heatingLevel !== currentLevel) {
          await retryApiCall(() => setHeatingLevel(token, profile.users.eightUserId, currentLevel));
          console.log(
            `Heating level set to ${currentLevel} for user ${profile.users.email}`,
          );
        }
      } else {
        // Turn off the side when not in sleep hours or pre-heating time
        if (heatingStatus.isHeating) {
          await retryApiCall(() => turnOffSide(token, profile.users.eightUserId));
          console.log(`Heating turned off for user ${profile.users.email}`);
        } else {
          console.log(
            `Heating is not on for user ${profile.users.email}. That's what we want.`,
          );
        }
      }
      console.log(
        `Successfully completed temperature adjustment cron for user ${profile.users.email}.`,
      );
    } catch (error) {
      console.error(
        `Error adjusting temperature for user ${profile.users.email}:`,
        error,
      );
    }
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  } else {
    try {
      await adjustTemperature();
    } catch (error) {
      console.error("Error in temperature adjustment cron job:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }
  return Response.json({ success: true });
}