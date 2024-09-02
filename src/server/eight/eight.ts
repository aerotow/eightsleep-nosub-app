// eight.ts
import { z } from 'zod';
import { DeviceDataSchema, DeviceListSchema, type Token } from './types';
import { CLIENT_API_URL, APP_API_URL, DEFAULT_API_HEADERS } from './constants';


export async function fetchWithAuth<T extends z.ZodType<unknown, z.ZodTypeDef, unknown>>(
  url: string, 
  token: Token, 
  schema: T, 
  options: RequestInit = {}
): Promise<z.infer<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...DEFAULT_API_HEADERS,
      ...options.headers,
      authorization: `Bearer ${token.eightAccessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  const data: unknown = await response.json();
  return schema.parse(data);
}

export async function fetchDeviceList(token: Token): Promise<string[]> {
  const url = `${CLIENT_API_URL}/users/me`;
  const data = await fetchWithAuth(url, token, DeviceListSchema);
  return data.user.devices;
}



export async function getDeviceData(token: Token, deviceId: string): Promise<z.infer<typeof DeviceDataSchema>['result']> {
  const url = `${CLIENT_API_URL}/devices/${deviceId}`;
  const data = await fetchWithAuth(url, token, DeviceDataSchema);
  return data.result;
}

export async function setHeatingLevel(token: Token, userId: string, level: number, duration = 0): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/temperature`;
  const data = {
    timeBased: { level, durationSeconds: duration },
    currentLevel: level,
  };

  await fetchWithAuth(url, token, z.object({}), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function setSmartHeatingLevel(token: Token, userId: string, level: number, sleepStage: string): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/temperature`;

  // First, get current smart heating levels
  const currentData = await fetchWithAuth(url, token, z.object({ smart: z.record(z.number()) }));
  const smartLevels = currentData.smart;
  smartLevels[sleepStage] = level;

  // Now, update with new level
  await fetchWithAuth(url, token, z.object({}), {
    method: 'PUT',
    body: JSON.stringify({ smart: smartLevels }),
  });
}

export async function turnOnSide(token: Token, userId: string): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/temperature`;
  const data = { currentState: { type: "smart" } };

  await fetchWithAuth(url, token, z.object({}), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function turnOffSide(token: Token, userId: string): Promise<void> {
  const url = `${APP_API_URL}v1/users/${userId}/temperature`;
  const data = { currentState: { type: "off" } };

  await fetchWithAuth(url, token, z.object({}), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}