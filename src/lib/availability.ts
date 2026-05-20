// Availability engine: given a service, the studio's weekly hours, one-off
// exceptions, and existing bookings, compute the bookable start times.
//
// This is a PURE function (no DB, no network, no clock except the `now` you pass
// in) so it can be unit-tested exhaustively. The route handler at
// /api/availability loads the data from Postgres + Sanity and calls this.
//
// All Date values crossing this boundary are UTC. Wall-clock strings ("09:00")
// and date keys ("2026-07-04") are in the studio's local timezone.

import {
  eachDateKey,
  parseHhMm,
  weekdayOfDateKey,
  zonedWallTimeToUtc,
} from "./tz";

export interface WeeklyRule {
  /** 0 = Sunday ... 6 = Saturday. */
  dayOfWeek: number;
  /** Local wall-clock "HH:mm". */
  startTime: string;
  endTime: string;
}

export interface DateException {
  /** Local "YYYY-MM-DD". */
  date: string;
  /** false = fully closed that day. true = use startTime/endTime as the day's only window. */
  isOpen: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface BusyInterval {
  /** UTC. */
  start: Date;
  /** UTC. */
  end: Date;
}

export interface AvailabilityInput {
  /** Length of the session in minutes. */
  durationMinutes: number;
  /** Cleanup time reserved after the session before the next booking. */
  bufferMinutes?: number;
  /** IANA timezone of the studio, e.g. "America/Chicago". */
  timeZone: string;
  rules: WeeklyRule[];
  exceptions?: DateException[];
  /** Existing CONFIRMED + held PENDING bookings that block time. UTC. */
  busy?: BusyInterval[];
  /** Inclusive local date range to search, "YYYY-MM-DD". */
  rangeStart: string;
  rangeEnd: string;
  /** Current time; slots starting before now + leadTime are excluded. Defaults to new Date(). */
  now?: Date;
  /** Minutes of notice required before a slot. Default 0. */
  leadTimeMinutes?: number;
  /** Spacing between candidate start times, in minutes. Default 30. */
  slotIntervalMinutes?: number;
}

export interface Slot {
  /** UTC start. */
  start: Date;
  /** UTC end (start + durationMinutes). Buffer is NOT included here; it only affects spacing. */
  end: Date;
}

/** Half-open overlap: [aStart, aEnd) intersects [bStart, bEnd). */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Resolve a single local date into its open windows (in minutes-from-midnight,
 * local). Weekly rules apply unless an exception overrides the day.
 */
function windowsForDate(
  dateKey: string,
  rules: WeeklyRule[],
  exceptions: DateException[],
): Array<{ startMin: number; endMin: number }> {
  const exception = exceptions.find((e) => e.date === dateKey);
  if (exception) {
    if (!exception.isOpen) return []; // closed all day
    if (exception.startTime && exception.endTime) {
      const s = parseHhMm(exception.startTime);
      const e = parseHhMm(exception.endTime);
      return [{ startMin: s.hour * 60 + s.minute, endMin: e.hour * 60 + e.minute }];
    }
    return []; // marked open but no hours given -> nothing bookable
  }

  const weekday = weekdayOfDateKey(dateKey);
  return rules
    .filter((r) => r.dayOfWeek === weekday)
    .map((r) => {
      const s = parseHhMm(r.startTime);
      const e = parseHhMm(r.endTime);
      return { startMin: s.hour * 60 + s.minute, endMin: e.hour * 60 + e.minute };
    })
    .filter((w) => w.endMin > w.startMin);
}

export function computeAvailableSlots(input: AvailabilityInput): Slot[] {
  const {
    durationMinutes,
    timeZone,
    rules,
    rangeStart,
    rangeEnd,
  } = input;
  const buffer = Math.max(0, input.bufferMinutes ?? 0);
  const exceptions = input.exceptions ?? [];
  const busy = input.busy ?? [];
  const now = input.now ?? new Date();
  const leadMs = (input.leadTimeMinutes ?? 0) * 60_000;
  const step = input.slotIntervalMinutes ?? 30;

  if (durationMinutes <= 0 || step <= 0) return [];

  const earliestStartMs = now.getTime() + leadMs;
  const durationMs = durationMinutes * 60_000;
  const bufferMs = buffer * 60_000;

  // Pre-expand busy intervals to include their trailing buffer, so we keep the
  // gap after each existing booking.
  const blocked = busy.map((b) => ({
    start: b.start.getTime(),
    end: b.end.getTime() + bufferMs,
  }));

  const slots: Slot[] = [];

  for (const dateKey of eachDateKey(rangeStart, rangeEnd)) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const windows = windowsForDate(dateKey, rules, exceptions);

    for (const win of windows) {
      // Candidate start times step through the window. The SESSION must finish by
      // the window's end (cleanup buffer may extend past close — that's fine).
      for (let m = win.startMin; m + durationMinutes <= win.endMin; m += step) {
        const startHour = Math.floor(m / 60);
        const startMinute = m % 60;
        const startUtc = zonedWallTimeToUtc(
          year,
          month,
          day,
          startHour,
          startMinute,
          timeZone,
        );
        const startMs = startUtc.getTime();
        const endMs = startMs + durationMs;

        if (startMs < earliestStartMs) continue; // too soon / in the past

        // The candidate occupies its session plus trailing buffer.
        const candEnd = endMs + bufferMs;
        const conflict = blocked.some((b) => overlaps(startMs, candEnd, b.start, b.end));
        if (conflict) continue;

        slots.push({ start: new Date(startMs), end: new Date(endMs) });
      }
    }
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}
