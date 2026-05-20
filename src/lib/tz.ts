// Timezone helpers for the booking engine.
//
// WHY THIS EXISTS: availability rules are written in the studio's LOCAL wall-clock
// time ("09:00"), but bookings are stored in UTC. Converting between the two has to
// respect Daylight Saving Time (the offset for "America/Chicago" is -6h in winter,
// -5h in summer). We do it with the built-in Intl API instead of adding a date
// library, so the booking engine has zero extra dependencies and stays portable.
//
// These are intentionally small and pure so they can be unit-tested in isolation.

/**
 * Offset, in milliseconds, between the given instant's wall-clock time in `timeZone`
 * and UTC. Positive east of UTC, negative west. For America/Chicago this is
 * -6h (winter) or -5h (summer/DST).
 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Reinterpret the local wall-clock parts as if they were UTC, then diff against
  // the real instant. The difference is the zone's offset at that instant.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asIfUtc - instant.getTime();
}

/**
 * Convert a wall-clock time in `timeZone` to the matching UTC Date.
 * Example: zonedWallTimeToUtc(2026, 7, 4, 9, 0, "America/Chicago") -> 14:00 UTC (CDT).
 *
 * `month` is 1-based (1 = January).
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // First guess: pretend the wall time is already UTC.
  const guessMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  // Correct by the offset at that guessed instant.
  const offset1 = tzOffsetMs(new Date(guessMs), timeZone);
  let utcMs = guessMs - offset1;
  // The offset can differ across a DST boundary; re-check once and re-correct.
  const offset2 = tzOffsetMs(new Date(utcMs), timeZone);
  if (offset2 !== offset1) utcMs = guessMs - offset2;
  return new Date(utcMs);
}

export interface ZonedParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday ... 6 = Saturday, matching Prisma AvailabilityRule.dayOfWeek. */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Break a UTC instant into its wall-clock parts in `timeZone`. */
export function utcToZonedParts(instant: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** "YYYY-MM-DD" for a UTC instant as seen in `timeZone`. */
export function localDateKey(instant: Date, timeZone: string): string {
  const p = utcToZonedParts(instant, timeZone);
  return `${p.year.toString().padStart(4, "0")}-${p.month
    .toString()
    .padStart(2, "0")}-${p.day.toString().padStart(2, "0")}`;
}

/** Parse "HH:mm" into { hour, minute }. Throws on malformed input. */
export function parseHhMm(value: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) throw new Error(`Invalid time "${value}", expected "HH:mm"`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new Error(`Out-of-range time "${value}"`);
  return { hour, minute };
}

/** 0 = Sunday ... 6 = Saturday for a local "YYYY-MM-DD" date (no timezone needed). */
export function weekdayOfDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Inclusive list of "YYYY-MM-DD" keys from start to end (calendar dates). */
export function eachDateKey(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  while (cur <= end) {
    const dt = new Date(cur);
    out.push(
      `${dt.getUTCFullYear()}-${(dt.getUTCMonth() + 1)
        .toString()
        .padStart(2, "0")}-${dt.getUTCDate().toString().padStart(2, "0")}`,
    );
    cur += 24 * 60 * 60 * 1000;
  }
  return out;
}
