import { RAW_TO_CELSIUS_MAP } from "~/server/eight/constants";

// Sorted [raw, celsius] pairs, ascending (both axes are monotonic).
const POINTS: [number, number][] = Object.entries(RAW_TO_CELSIUS_MAP)
  .map(([raw, c]): [number, number] => [Number(raw), c])
  .sort((a, b) => a[0] - b[0]);

export const MIN_CELSIUS = POINTS[0]![1];
export const MAX_CELSIUS = POINTS[POINTS.length - 1]![1];

function interpolate(
  value: number,
  from: 0 | 1,
  to: 0 | 1,
): number {
  const first = POINTS[0]!;
  const last = POINTS[POINTS.length - 1]!;
  if (value <= first[from]) return first[to];
  if (value >= last[from]) return last[to];
  for (let i = 1; i < POINTS.length; i++) {
    const a = POINTS[i - 1]!;
    const b = POINTS[i]!;
    if (value <= b[from]) {
      const ratio = (value - a[from]) / (b[from] - a[from]);
      return a[to] + ratio * (b[to] - a[to]);
    }
  }
  return last[to];
}

/** Raw bed level (-100..100) -> whole degrees Celsius. */
export function rawToCelsius(raw: number): number {
  return Math.round(interpolate(raw, 0, 1));
}

/** Degrees Celsius -> raw bed level (-100..100, integer). */
export function celsiusToRaw(celsius: number): number {
  return Math.round(interpolate(celsius, 1, 0));
}
