// user.ts
import { z } from "zod";
import {
  type Token,
  type TrendData,
  type IntervalData,
  type RoutineData,
  type BedStateType,
  type Side,
  type AwayModeAction,
  type DegreeUnit,
  TrendDataSchema,
  TemperatureDataSchema,
  IntervalsDataSchema,
  RoutinesDataSchema,
  UserProfileSchema,
  type UserProfile,
  type HeatingStatus,
} from "./types";
import {
  CLIENT_API_URL,
  APP_API_URL,
  RAW_TO_CELSIUS_MAP,
  RAW_TO_FAHRENHEIT_MAP,
} from "./constants";
import { fetchWithAuth, getDeviceData } from "./eight";

export async function getUserProfile(token: Token): Promise<UserProfile> {
  const url = `${CLIENT_API_URL}/users/me`;
  const data = await fetchWithAuth(url, token, UserProfileSchema);
  return data.user;
}


export async function getTrendData(
  token: Token,
  userId: string,
  startDate: string,
  endDate: string,
  timezone: string,
): Promise<TrendData[]> {
  const url = `${CLIENT_API_URL}/users/${userId}/trends`;
  const params = new URLSearchParams({
    tz: timezone,
    from: startDate,
    to: endDate,
    "include-main": "false",
    "include-all-sessions": "false",
    "model-version": "v2",
  });

  const queryString = params.toString();
  const data = await fetchWithAuth(
    `${url}?${queryString}`,
    token,
    TrendDataSchema,
  );
  return data.result.days;
}

export async function getIntervalsData(
  token: Token,
  userId: string,
): Promise<IntervalData[]> {
  const url = `${CLIENT_API_URL}/users/${userId}/intervals`;
  const data = await fetchWithAuth(url, token, IntervalsDataSchema);
  return data.result.intervals;
}

export async function getRoutinesData(
  token: Token,
  userId: string,
): Promise<RoutineData> {
  const url = `${APP_API_URL}v2/users/${userId}/routines`;
  const data = await fetchWithAuth(url, token, RoutinesDataSchema);
  return data.result.state.nextAlarm;
}

export async function setAwayMode(
  token: Token,
  userId: string,
  action: AwayModeAction,
): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/away-mode`;
  const now = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const bodyData = { awayPeriod: { [action]: now } };

  await fetchWithAuth(url, token, z.object({}), {
    method: "PUT",
    body: JSON.stringify(bodyData),
  });
}

export async function getCurrentHeatingStatus(
  token: Token,
): Promise<HeatingStatus> {
  const userProfile = await getUserProfile(token);
  const userSide = userProfile.currentDevice.side;
  const deviceId = userProfile.devices[0]!;
  const deviceData = await getDeviceData(token, deviceId);

  if (userSide === "left") {
    return {
      heatingLevel: deviceData.leftHeatingLevel,
      isHeating: deviceData.leftNowHeating,
      heatingDuration: deviceData.leftHeatingDuration,
      targetHeatingLevel: deviceData.leftTargetHeatingLevel,
    };
  } else {
    return {
      heatingLevel: deviceData.rightHeatingLevel,
      isHeating: deviceData.rightNowHeating,
      heatingDuration: deviceData.rightHeatingDuration,
      targetHeatingLevel: deviceData.rightTargetHeatingLevel,
    };
  }
}

export async function primePod(
  token: Token,
  deviceId: string,
  userId: string,
): Promise<void> {
  const url = `${APP_API_URL}v1/devices/${deviceId}/priming/tasks`;
  const bodyData = {
    notifications: { users: [userId], meta: "rePriming" },
  };

  await fetchWithAuth(url, token, z.object({}), {
    method: "POST",
    body: JSON.stringify(bodyData),
  });
}

export async function alarmSnooze(
  token: Token,
  userId: string,
  alarmId: string,
  snoozeMinutes: number,
): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/routines`;
  const bodyData = {
    alarm: { alarmId, snoozeForMinutes: snoozeMinutes },
  };

  await fetchWithAuth(url, token, z.object({}), {
    method: "PUT",
    body: JSON.stringify(bodyData),
  });
}

export async function alarmStop(
  token: Token,
  userId: string,
  alarmId: string,
): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/routines`;
  const bodyData = {
    alarm: { alarmId, stopped: true },
  };

  await fetchWithAuth(url, token, z.object({}), {
    method: "PUT",
    body: JSON.stringify(bodyData),
  });
}

export async function alarmDismiss(
  token: Token,
  userId: string,
  alarmId: string,
): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/routines`;
  const bodyData = {
    alarm: { alarmId, dismissed: true },
  };

  await fetchWithAuth(url, token, z.object({}), {
    method: "PUT",
    body: JSON.stringify(bodyData),
  });
}

export async function getBedStateType(
  token: Token,
  userId: string,
): Promise<BedStateType> {
  const url = `${APP_API_URL}v1/users/${userId}/temperature`;
  const data = await fetchWithAuth(url, token, TemperatureDataSchema);
  return data.result.currentState.type;
}

export async function setBedSide(
  token: Token,
  userId: string,
  deviceId: string,
  side: Side,
): Promise<void> {
  const url = `${CLIENT_API_URL}/users/${userId}/current-device`;
  const bodyData = { id: deviceId, side };

  await fetchWithAuth(url, token, z.object({}), {
    method: "PUT",
    body: JSON.stringify(bodyData),
  });
}

export function convertRawBedTempToDegrees(
  rawValue: number,
  degreeUnit: DegreeUnit,
): number {
  const unitMap =
    degreeUnit.toLowerCase() === "c"
      ? RAW_TO_CELSIUS_MAP
      : RAW_TO_FAHRENHEIT_MAP;

  let lastRawUnit = -100;
  for (const [rawUnit, degreeValue] of Object.entries(unitMap)) {
    const numRawUnit = Number(rawUnit);
    if (rawValue === numRawUnit) {
      return degreeValue;
    }
    if (numRawUnit > rawValue) {
      const lastDegreeUnit = unitMap[lastRawUnit];
      if (lastDegreeUnit === undefined) {
        throw new Error(`No degree value found for raw unit ${lastRawUnit}`);
      }
      const ratio = (rawValue - lastRawUnit) / (numRawUnit - lastRawUnit);
      const deltaDegrees = degreeValue - lastDegreeUnit;
      return lastDegreeUnit + ratio * deltaDegrees;
    }
    lastRawUnit = numRawUnit;
  }
  throw new Error(`Raw value ${rawValue} unable to be mapped.`);
}

export function convertStringToDateTime(
  dateTimeStr: string,
  timezone: string,
): Date {
  const date = new Date(dateTimeStr);
  return new Date(date.toLocaleString("en-US", { timeZone: timezone }));
}
