// constants.ts

export const DEFAULT_TIMEOUT = 240000; // in milliseconds
export const DATE_TIME_ISO_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSZ";
export const DATE_FORMAT = "YYYY-MM-DD";

export const CLIENT_API_URL = "https://client-api.8slp.net/v1";
export const APP_API_URL = "https://app-api.8slp.net/";
export const AUTH_URL = "https://auth-api.8slp.net/v1/tokens";
export const KNOWN_CLIENT_ID = "0894c7f33bb94800a03f1f4df13a4f38";
export const KNOWN_CLIENT_SECRET = "f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76";

export const TOKEN_TIME_BUFFER_SECONDS = 120;

export const DEFAULT_API_HEADERS = {
  "content-type": "application/json",
  "connection": "keep-alive",
  "user-agent": "Android App",
  "accept-encoding": "gzip",
  "accept": "application/json",
  "host": "app-api.8slp.net",
};

export const DEFAULT_AUTH_HEADERS = {
  "content-type": "application/json",
  "user-agent": "Android App",
  "accept-encoding": "gzip",
  "accept": "application/json",
};

export const POSSIBLE_SLEEP_STAGES = ["bedTimeLevel", "initialSleepLevel", "finalSleepLevel"];

export const RAW_TO_CELSIUS_MAP: Record<number, number> = {
  '-100': 13,
  '-97': 14,
  '-94': 15,
  '-91': 16,
  '-83': 17,
  '-75': 18,
  '-67': 19,
  '-58': 20,
  '-50': 21,
  '-42': 22,
  '-33': 23,
  '-25': 24,
  '-17': 25,
  '-8': 26,
  '0': 27,
  '6': 28,
  '11': 29,
  '17': 30,
  '22': 31,
  '28': 32,
  '33': 33,
  '39': 34,
  '44': 35,
  '50': 36,
  '56': 37,
  '61': 38,
  '67': 39,
  '72': 40,
  '78': 41,
  '83': 42,
  '89': 43,
  '100': 44,
};

export const RAW_TO_FAHRENHEIT_MAP: Record<number, number> = {
  '-100': 55,
  '-99': 56,
  '-97': 57,
  '-95': 58,
  '-94': 59,
  '-92': 60,
  '-90': 61,
  '-86': 62,
  '-81': 63,
  '-77': 64,
  '-72': 65,
  '-68': 66,
  '-63': 67,
  '-58': 68,
  '-54': 69,
  '-49': 70,
  '-44': 71,
  '-40': 72,
  '-35': 73,
  '-31': 74,
  '-26': 75,
  '-21': 76,
  '-17': 77,
  '-12': 78,
  '-7': 79,
  '-3': 80,
  '1': 81,
  '4': 82,
  '7': 83,
  '10': 84,
  '14': 85,
  '17': 86,
  '20': 87,
  '23': 88,
  '26': 89,
  '29': 90,
  '32': 91,
  '35': 92,
  '38': 93,
  '41': 94,
  '44': 95,
  '48': 96,
  '51': 97,
  '54': 98,
  '57': 99,
  '60': 100,
  '63': 101,
  '66': 102,
  '69': 103,
  '72': 104,
  '75': 105,
  '78': 106,
  '81': 107,
  '85': 108,
  '88': 109,
  '92': 110,
  '100': 111,
};