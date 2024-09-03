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

function isWithinTimeRange(current: Date, target: Date, rangeMinutes: number): boolean {
  const diffMs = Math.abs(current.getTime() - target.getTime());
  return diffMs <= rangeMinutes * 60 * 1000;
}

async function retryApiCall<T>(apiCall: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("This should never happen due to the for loop, but TypeScript doesn't know that");
}

interface SleepCycle {
  preHeatingTime: Date;
  bedTime: Date;
  midStageTime: Date;
  finalStageTime: Date;
  wakeupTime: Date;
}

function createSleepCycle(baseDate: Date, bedTimeStr: string, wakeupTimeStr: string): SleepCycle {
  const preHeatingTime = createDateWithTime(baseDate, bedTimeStr);
  preHeatingTime.setHours(preHeatingTime.getHours() - 1); // Set pre-heating to 1 hour before bedtime
  
  const bedTime = createDateWithTime(baseDate, bedTimeStr);
  let wakeupTime = createDateWithTime(baseDate, wakeupTimeStr);
  
  // Adjust wakeupTime if it's before bedTime (i.e., it's on the next day)
  if (wakeupTime <= bedTime) {
    wakeupTime = addDays(wakeupTime, 1);
  }
  
  const midStageTime = new Date(bedTime.getTime() + 60 * 60 * 1000);
  const finalStageTime = new Date(wakeupTime.getTime() - 2 * 60 * 60 * 1000);
  
  return { preHeatingTime, bedTime, midStageTime, finalStageTime, wakeupTime };
}

function adjustTimeToCurrentCycle(cycleStart: Date, currentTime: Date, timeInCycle: Date): Date {
  let adjustedTime = new Date(timeInCycle);
  
  // If the time in the cycle is before the cycle start, it means it's on the next day
  if (timeInCycle < cycleStart) {
    adjustedTime = addDays(adjustedTime, 1);
  }
  
  // If the adjusted time is in the future relative to the current time, move it back by one day
  if (adjustedTime > currentTime && adjustedTime.getTime() - currentTime.getTime() > 12 * 60 * 60 * 1000) {
    adjustedTime = addDays(adjustedTime, -1);
  }
  
  return adjustedTime;
}

interface TestMode {
  enabled: boolean;
  currentTime: Date;
}

export async function adjustTemperature(testMode?: TestMode): Promise<void> {
  try {
    const profiles = await db
      .select()
      .from(userTemperatureProfile)
      .innerJoin(users, eq(userTemperatureProfile.email, users.email));

    for (const profile of profiles) {
      try {
        let token: Token = {
          eightAccessToken: profile.users.eightAccessToken,
          eightRefreshToken: profile.users.eightRefreshToken,
          eightExpiresAtPosix: profile.users.eightTokenExpiresAt.getTime(),
          eightUserId: profile.users.eightUserId,
        };

        const now = testMode?.enabled ? testMode.currentTime : new Date();

        if (!testMode?.enabled && now.getTime() > token.eightExpiresAtPosix) {
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
        const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTemperatureProfile.timezoneTZ }));

        // Create the sleep cycle based on the user's bed time and wake-up time
        const sleepCycle = createSleepCycle(userNow, userTemperatureProfile.bedTime, userTemperatureProfile.wakeupTime);

        // Adjust all times in the cycle to the current day
        const cycleStart = sleepCycle.preHeatingTime;
        const adjustedCycle: SleepCycle = {
          preHeatingTime: adjustTimeToCurrentCycle(cycleStart, userNow, sleepCycle.preHeatingTime),
          bedTime: adjustTimeToCurrentCycle(cycleStart, userNow, sleepCycle.bedTime),
          midStageTime: adjustTimeToCurrentCycle(cycleStart, userNow, sleepCycle.midStageTime),
          finalStageTime: adjustTimeToCurrentCycle(cycleStart, userNow, sleepCycle.finalStageTime),
          wakeupTime: adjustTimeToCurrentCycle(cycleStart, userNow, sleepCycle.wakeupTime),
        };

        let heatingStatus;
        if (testMode?.enabled) {
          heatingStatus = { isHeating: false, heatingLevel: 0 }; // Mock heating status for test mode
          console.log(`[TEST MODE] Current time set to: ${userNow.toISOString()}`);
        } else {
          heatingStatus = await retryApiCall(() => getCurrentHeatingStatus(token));
        }

        console.log(`Current heating status for user ${profile.users.email}:`, JSON.stringify(heatingStatus));
        console.log(`User's current time: ${userNow.toISOString()} for user ${profile.users.email}`);
        console.log(`Adjusted times for user ${profile.users.email}:`);
        console.log(`Pre-heating: ${adjustedCycle.preHeatingTime.toISOString()}`);
        console.log(`Bed time: ${adjustedCycle.bedTime.toISOString()}`);
        console.log(`Mid stage: ${adjustedCycle.midStageTime.toISOString()}`);
        console.log(`Final stage: ${adjustedCycle.finalStageTime.toISOString()}`);
        console.log(`Wake-up: ${adjustedCycle.wakeupTime.toISOString()}`);

        const isNearPreHeating = isWithinTimeRange(userNow, adjustedCycle.preHeatingTime, 15);
        const isNearBedTime = isWithinTimeRange(userNow, adjustedCycle.bedTime, 15);
        const isNearMidStage = isWithinTimeRange(userNow, adjustedCycle.midStageTime, 15);
        const isNearFinalStage = isWithinTimeRange(userNow, adjustedCycle.finalStageTime, 15);
        const isNearWakeup = isWithinTimeRange(userNow, adjustedCycle.wakeupTime, 15);

        // Determine current sleep stage
        let currentSleepStage = "outside sleep cycle";
        if (userNow >= adjustedCycle.preHeatingTime && userNow < adjustedCycle.bedTime) {
          currentSleepStage = "pre-heating";
        } else if (userNow >= adjustedCycle.bedTime && userNow < adjustedCycle.midStageTime) {
          currentSleepStage = "initial";
        } else if (userNow >= adjustedCycle.midStageTime && userNow < adjustedCycle.finalStageTime) {
          currentSleepStage = "mid";
        } else if (userNow >= adjustedCycle.finalStageTime && userNow < adjustedCycle.wakeupTime) {
          currentSleepStage = "final";
        }

        console.log(`Current sleep stage for user ${profile.users.email}: ${currentSleepStage}`);

        if (isNearPreHeating || isNearBedTime || isNearMidStage || isNearFinalStage || isNearWakeup) {
          let targetLevel: number;
          let sleepStage: string;

          if (isNearPreHeating || (isNearBedTime && userNow < adjustedCycle.bedTime)) {
            targetLevel = userTemperatureProfile.initialSleepLevel;
            sleepStage = "pre-heating";
          } else if (isNearBedTime || (isNearMidStage && userNow < adjustedCycle.midStageTime)) {
            targetLevel = userTemperatureProfile.initialSleepLevel;
            sleepStage = "initial";
          } else if (isNearMidStage || (isNearFinalStage && userNow < adjustedCycle.finalStageTime)) {
            targetLevel = userTemperatureProfile.midStageSleepLevel;
            sleepStage = "mid";
          } else {
            targetLevel = userTemperatureProfile.finalSleepLevel;
            sleepStage = "final";
          }

          console.log(`Adjusting temperature for ${sleepStage} stage for user ${profile.users.email}`);

          if (!heatingStatus.isHeating) {
            if (testMode?.enabled) {
              console.log(`[TEST MODE] Would turn on heating for user ${profile.users.email}`);
            } else {
              await retryApiCall(() => turnOnSide(token, profile.users.eightUserId));
              console.log(`Heating turned on for user ${profile.users.email}`);
            }
          }
          if (heatingStatus.heatingLevel !== targetLevel) {
            if (testMode?.enabled) {
              console.log(`[TEST MODE] Would set heating level to ${targetLevel} for user ${profile.users.email}`);
            } else {
              await retryApiCall(() => setHeatingLevel(token, profile.users.eightUserId, targetLevel));
              console.log(`Heating level set to ${targetLevel} for user ${profile.users.email}`);
            }
          }
        } else if (heatingStatus.isHeating && userNow > adjustedCycle.wakeupTime && !isWithinTimeRange(userNow, adjustedCycle.wakeupTime, 15)) {
          // Only turn off heating if it's more than 15 minutes past wake-up time
          if (testMode?.enabled) {
            console.log(`[TEST MODE] Would turn off heating for user ${profile.users.email}`);
          } else {
            await retryApiCall(() => turnOffSide(token, profile.users.eightUserId));
            console.log(`Heating turned off for user ${profile.users.email}`);
          }
        } else {
          console.log(`No temperature change needed for user ${profile.users.email}`);
        }

        console.log(`Successfully completed temperature adjustment check for user ${profile.users.email}`);
      } catch (error) {
        console.error(`Error adjusting temperature for user ${profile.users.email}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.error("Error fetching user profiles:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  } else {
    try {
      const testTimeParam = request.nextUrl.searchParams.get("testTime");
      if (testTimeParam) {
        const testTime = new Date(Number(testTimeParam)* 1000);
        if (isNaN(testTime.getTime())) {
          throw new Error("Invalid testTime parameter");
        }
        console.log(`[TEST MODE] Running temperature adjustment cron job with test time: ${testTime.toISOString()}`);
        await adjustTemperature({ enabled: true, currentTime: testTime });
      } else {
        await adjustTemperature();
      }
      return Response.json({ success: true });
    } catch (error) {
      console.error("Error in temperature adjustment cron job:", error instanceof Error ? error.message : String(error));
      return new Response("Internal server error", { status: 500 });
    }
  }
}