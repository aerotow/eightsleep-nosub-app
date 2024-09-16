// types.ts
import { z } from "zod";

export interface Token {
  eightAccessToken: string;
  eightRefreshToken: string;
  eightExpiresAtPosix: number;
  eightUserId: string;
}

export const EightTokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  userId: z.string().optional(),
});

export type TokenResponse = z.infer<typeof EightTokenSchema>;

export const DeviceListSchema = z.object({
  user: z.object({
    devices: z.array(z.string()),
  }),
});

export const UserProfileSchema = z.object({
  user: z.object({
    userId: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    gender: z.string().optional(),
    tempPreference: z.string().optional(),
    tempPreferenceUpdatedAt: z.string().optional(),
    dob: z.string().optional(),
    zip: z.number().optional(),
    devices: z.array(z.string()),
    emailVerified: z.boolean().optional(),
    sharingMetricsTo: z.array(z.unknown()).optional(),
    sharingMetricsFrom: z.array(z.unknown()).optional(),
    notifications: z.record(z.boolean()).optional(),
    createdAt: z.string().optional(),
    experimentalFeatures: z.boolean().optional(),
    autopilotEnabled: z.boolean().optional(),
    lastReset: z.string().optional(),
    nextReset: z.string().optional(),
    sleepTracking: z.object({
      enabledSince: z.string().optional(),
    }).optional(),
    features: z.array(z.string()).optional(),
    currentDevice: z.object({
      id: z.string(),
      side: z.string(),
      timeZone: z.string(),
    }),
    hotelGuest: z.boolean().optional(),
  }).catchall(z.unknown()),
});

export const DeviceDataSchema = z.object({
  result: z.object({
    deviceId: z.string(),
    leftHeatingLevel: z.number(),
    leftTargetHeatingLevel: z.number(),
    leftNowHeating: z.boolean(),
    leftHeatingDuration: z.number(),
    rightHeatingLevel: z.number(),
    rightTargetHeatingLevel: z.number(),
    rightNowHeating: z.boolean(),
    rightHeatingDuration: z.number(),
  }),
});

export const TrendDataSchema = z.object({
  result: z.object({
    days: z.array(
      z.object({
        day: z.string(),
        score: z.number(),
        sleepDuration: z.number(),
        presenceStart: z.string(),
        presenceEnd: z.string(),
        sleepQualityScore: z.object({
          total: z.number(),
          sleepDurationSeconds: z.object({ score: z.number() }),
          hrv: z.object({ current: z.number() }),
          respiratoryRate: z.object({ current: z.number() }),
        }),
        sleepRoutineScore: z.object({
          total: z.number(),
          latencyAsleepSeconds: z.object({ score: z.number() }),
          latencyOutSeconds: z.object({ score: z.number() }),
          wakeupConsistency: z.object({ score: z.number() }),
          heartRate: z.object({ current: z.number() }),
        }),
      }),
    ),
  }),
});

export const IntervalsDataSchema = z.object({
  result: z.object({
    intervals: z.array(
      z.object({
        id: z.string(),
        ts: z.string(),
        stages: z.array(
          z.object({
            stage: z.enum(["awake", "light", "deep", "rem", "out"]),
            duration: z.number(),
          }),
        ),
        score: z.number(),
        timeseries: z.object({
          tnt: z.array(z.tuple([z.string(), z.number()])),
          tempBedC: z.array(z.tuple([z.string(), z.number()])),
          tempRoomC: z.array(z.tuple([z.string(), z.number()])),
          respiratoryRate: z.array(z.tuple([z.string(), z.number()])),
          heartRate: z.array(z.tuple([z.string(), z.number()])),
        }),
        incomplete: z.boolean(),
      }),
    ),
  }),
});

export const RoutinesDataSchema = z.object({
  result: z.object({
    state: z.object({
      nextAlarm: z.object({
        nextTimestamp: z.string(),
        alarmId: z.string(),
      }),
    }),
  }),
});

export const TemperatureDataSchema = z.object({
  result: z.object({
    currentLevel: z.number(),
    currentDeviceLevel: z.number(),
    currentState: z.object({
      type: z.enum(["smart", "off"]),
    }),
    smart: z.record(z.number()),
  }),
});

export type UserProfile = z.infer<typeof UserProfileSchema>["user"];
export type TrendData = z.infer<
  typeof TrendDataSchema
>["result"]["days"][number];
export type IntervalData = z.infer<
  typeof IntervalsDataSchema
>["result"]["intervals"][number];
export type RoutineData = z.infer<
  typeof RoutinesDataSchema
>["result"]["state"]["nextAlarm"];
export type TemperatureData = z.infer<typeof TemperatureDataSchema>["result"];

export interface DeviceData {
  id: string;
  lastSeen: string;
  firmwareVersion: string;
  wifiInfo: {
    ssid: string;
    strength: number;
  };
  leftUserId?: string;
  rightUserId?: string;
  needsPriming: boolean;
  priming: boolean;
  hasWater: boolean;
  lastPrime: string;
}

export type HeatingLevel = number;
export type DeviceLevel = number;
export type BedStateType = "smart" | "off";
export type Side = "left" | "right" | "solo";
export type AwayModeAction = "start" | "end";
export type DegreeUnit = "c" | "f";

export type HeatingStatus = {
  heatingLevel: HeatingLevel;
  isHeating: boolean;
  heatingDuration: number;
  targetHeatingLevel: HeatingLevel;
};
