import { describe, it, expect } from "vitest";
import {
  computeAvailableSlots,
  type AvailabilityInput,
  type WeeklyRule,
} from "./availability";
import { zonedWallTimeToUtc, utcToZonedParts } from "./tz";

const CHI = "America/Chicago";

// All seven days open 9:00-17:00, so a test can pick any date without worrying
// about which weekday it lands on.
const ALL_DAYS_9_5: WeeklyRule[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "17:00",
}));

// A fixed "now" well before the test dates so lead-time never trims slots unless
// a test deliberately sets it.
const NOW = new Date("2026-01-01T00:00:00Z");

// 2026-07-06 is a Monday in CDT. Using a single summer day keeps offsets stable.
const DAY = "2026-07-06";

/** The local "HH:mm" of each returned slot start, for readable assertions. */
function localStarts(input: AvailabilityInput): string[] {
  return computeAvailableSlots(input).map((s) => {
    const p = utcToZonedParts(s.start, CHI);
    return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  });
}

describe("computeAvailableSlots", () => {
  it("fills a day with slots that fit inside working hours", () => {
    // 60-min service, 30-min spacing, 9-17: last start is 16:00 (ends 17:00).
    const starts = localStarts({
      durationMinutes: 60,
      timeZone: CHI,
      rules: ALL_DAYS_9_5,
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
      slotIntervalMinutes: 30,
    });
    expect(starts[0]).toBe("09:00");
    expect(starts.at(-1)).toBe("16:00");
    expect(starts).toHaveLength(15);
    // Returned starts are real UTC instants (9:00 CDT = 14:00 UTC).
    const first = computeAvailableSlots({
      durationMinutes: 60,
      timeZone: CHI,
      rules: ALL_DAYS_9_5,
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
      slotIntervalMinutes: 30,
    })[0];
    expect(first.start.toISOString()).toBe("2026-07-06T14:00:00.000Z");
  });

  it("returns nothing on a day with no matching weekly rule", () => {
    // Only Sundays open; our Monday test date has no window.
    const starts = localStarts({
      durationMinutes: 60,
      timeZone: CHI,
      rules: [{ dayOfWeek: 0, startTime: "09:00", endTime: "17:00" }],
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
    });
    expect(starts).toEqual([]);
  });

  it("treats a closed-day exception as fully unavailable", () => {
    // A vacation day must override the normal weekly hours, or someone books a
    // slot when the studio is shut.
    const starts = localStarts({
      durationMinutes: 60,
      timeZone: CHI,
      rules: ALL_DAYS_9_5,
      exceptions: [{ date: DAY, isOpen: false }],
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
    });
    expect(starts).toEqual([]);
  });

  it("lets a special-hours exception override the weekly window", () => {
    const starts = localStarts({
      durationMinutes: 60,
      timeZone: CHI,
      rules: ALL_DAYS_9_5,
      exceptions: [{ date: DAY, isOpen: true, startTime: "10:00", endTime: "12:00" }],
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
      slotIntervalMinutes: 30,
    });
    expect(starts).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("excludes slots that overlap an existing booking, but allows back-to-back when no buffer", () => {
    // Booking 10:00-11:00. A 9:00 slot ends exactly at 10:00 and must stay
    // bookable (no wasted hour); the 10:00 slot must be blocked.
    const booking = {
      start: zonedWallTimeToUtc(2026, 7, 6, 10, 0, CHI),
      end: zonedWallTimeToUtc(2026, 7, 6, 11, 0, CHI),
    };
    const starts = localStarts({
      durationMinutes: 60,
      timeZone: CHI,
      rules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
      busy: [booking],
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
      slotIntervalMinutes: 60,
    });
    expect(starts).toEqual(["09:00", "11:00"]);
  });

  it("enforces a cleanup buffer as a gap around existing bookings", () => {
    // 15-min buffer means a new session must leave 15 min of clearance on each
    // side of the 10:30-11:30 booking. Only the 9:00 slot survives in a 9-12 window.
    const booking = {
      start: zonedWallTimeToUtc(2026, 7, 6, 10, 30, CHI),
      end: zonedWallTimeToUtc(2026, 7, 6, 11, 30, CHI),
    };
    const starts = localStarts({
      durationMinutes: 60,
      bufferMinutes: 15,
      timeZone: CHI,
      rules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
      busy: [booking],
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
      slotIntervalMinutes: 30,
    });
    expect(starts).toEqual(["09:00"]);
  });

  it("hides slots that start before now + lead time", () => {
    // It's 09:10 local with a 2-hour notice requirement: nothing before 11:10 is
    // bookable, so the first available 60-min slot in a 9-13 window is 12:00.
    const now = zonedWallTimeToUtc(2026, 7, 6, 9, 10, CHI);
    const starts = localStarts({
      durationMinutes: 60,
      timeZone: CHI,
      rules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "13:00" }],
      rangeStart: DAY,
      rangeEnd: DAY,
      now,
      leadTimeMinutes: 120,
      slotIntervalMinutes: 60,
    });
    expect(starts).toEqual(["12:00"]);
  });

  it("returns slots sorted across a multi-day range", () => {
    const slots = computeAvailableSlots({
      durationMinutes: 60,
      timeZone: CHI,
      rules: ALL_DAYS_9_5,
      rangeStart: "2026-07-06",
      rangeEnd: "2026-07-08",
      now: NOW,
      slotIntervalMinutes: 120,
    });
    const times = slots.map((s) => s.start.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    // Three days, each producing the same number of slots.
    expect(slots.length % 3).toBe(0);
  });

  it("never offers a session that would run past closing", () => {
    // 90-min service in a 9-17 window: the last viable start is 15:30 (ends 17:00).
    const starts = localStarts({
      durationMinutes: 90,
      timeZone: CHI,
      rules: ALL_DAYS_9_5,
      rangeStart: DAY,
      rangeEnd: DAY,
      now: NOW,
      slotIntervalMinutes: 30,
    });
    expect(starts.at(-1)).toBe("15:30");
  });
});
