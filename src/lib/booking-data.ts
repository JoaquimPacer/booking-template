// Server-only data layer for the booking flow. Loads the studio's hours and
// existing bookings from Postgres, pulls the service's duration/buffer from
// Sanity (the source of truth Theresa edits), and runs the pure availability
// engine. Imported by the /book page and the createPendingBooking action ONLY.
// Never import this from a client component (it pulls in Prisma).

import { BookingStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { Service } from "./sanity-queries";
import {
  computeAvailableSlots,
  type DateException,
  type WeeklyRule,
} from "./availability";
import { localDateKey } from "./tz";

// Tunables. Sensible defaults for a single-therapist practice; can move into
// Studio settings later if a client needs different values.
const SEARCH_DAYS = 30; // how far ahead customers can book
const SLOT_INTERVAL_MINUTES = 30; // spacing between offered start times
const LEAD_TIME_MINUTES = 120; // minimum notice before a slot

export interface SlotDTO {
  /** UTC ISO start, the canonical value submitted back to the server. */
  iso: string;
  /** Local time label, e.g. "9:00 AM". */
  label: string;
}

export interface DayDTO {
  /** Local "YYYY-MM-DD". */
  dateKey: string;
  /** e.g. "Thu". */
  weekdayLabel: string;
  /** e.g. "May 21". */
  dateLabel: string;
  slots: SlotDTO[];
}

export interface ServiceSlotsResult {
  timeZone: string;
  durationMinutes: number;
  /** Only days that have at least one open slot. */
  days: DayDTO[];
}

export function getStudio() {
  // v1: one studio per deploy. findFirst is the singleton.
  return prisma.studio.findFirst();
}

/** UTC calendar-date key for an AvailabilityException.date (stored as UTC midnight). */
function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * Compute the bookable slots for a Sanity service over the next SEARCH_DAYS.
 * Returns null if booking isn't configured (no studio) or the service has no
 * duration set.
 */
export async function computeServiceSlots(
  service: Pick<Service, "durationMinutes" | "bufferMinutes">,
  now: Date = new Date(),
): Promise<ServiceSlotsResult | null> {
  if (!service.durationMinutes) return null;

  const studio = await getStudio();
  if (!studio) return null;

  const tz = studio.timezone;
  const rangeStart = localDateKey(now, tz);
  const rangeEnd = localDateKey(new Date(now.getTime() + SEARCH_DAYS * 86_400_000), tz);

  const [rawRules, rawExceptions, rawBookings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { studioId: studio.id } }),
    prisma.availabilityException.findMany({
      where: { studioId: studio.id, date: { gte: new Date(now.getTime() - 86_400_000) } },
    }),
    prisma.booking.findMany({
      where: {
        studioId: studio.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        endTime: { gt: now },
        startTime: { lt: new Date(now.getTime() + (SEARCH_DAYS + 1) * 86_400_000) },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const rules: WeeklyRule[] = rawRules.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
  }));
  const exceptions: DateException[] = rawExceptions.map((e) => ({
    date: utcDateKey(e.date),
    isOpen: e.isOpen,
    startTime: e.startTime,
    endTime: e.endTime,
  }));
  const busy = rawBookings.map((b) => ({ start: b.startTime, end: b.endTime }));

  const slots = computeAvailableSlots({
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes ?? 0,
    timeZone: tz,
    rules,
    exceptions,
    busy,
    rangeStart,
    rangeEnd,
    now,
    leadTimeMinutes: LEAD_TIME_MINUTES,
    slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
  });

  // Group into days, with display labels formatted in the studio's timezone.
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" });

  const byDay = new Map<string, DayDTO>();
  for (const slot of slots) {
    const key = localDateKey(slot.start, tz);
    if (!byDay.has(key)) {
      byDay.set(key, {
        dateKey: key,
        weekdayLabel: weekdayFmt.format(slot.start),
        dateLabel: dateFmt.format(slot.start),
        slots: [],
      });
    }
    byDay.get(key)!.slots.push({ iso: slot.start.toISOString(), label: timeFmt.format(slot.start) });
  }

  return {
    timeZone: tz,
    durationMinutes: service.durationMinutes,
    days: Array.from(byDay.values()),
  };
}
