"use server";

import { z } from "zod";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServiceBySlug } from "@/lib/sanity-queries";
import { computeServiceSlots, getStudio } from "@/lib/booking-data";

const bookingSchema = z.object({
  slug: z.string().min(1),
  startIso: z.string().min(1),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingResult =
  | { ok: true; bookingId: string; startIso: string }
  | { ok: false; error: string };

/**
 * Create a PENDING booking from the slot picker. Payment (Stripe) and
 * confirmation email/SMS land in Phases 2C/2D; for now this just holds the slot
 * and records the customer's request.
 */
export async function createPendingBooking(input: BookingInput): Promise<BookingResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { slug, startIso, name, email, phone, notes } = parsed.data;

  const service = await getServiceBySlug(slug);
  if (!service || service.isActive === false) {
    return { ok: false, error: "This service isn't available to book." };
  }
  if ((service.bookingMode ?? "slots") !== "slots") {
    return { ok: false, error: "This service is booked by contacting us directly." };
  }
  if (!service.durationMinutes) {
    return { ok: false, error: "This service isn't set up for online booking yet." };
  }

  const studio = await getStudio();
  if (!studio) return { ok: false, error: "Booking isn't configured yet." };

  // Re-derive the legal slots server-side: never trust the time the browser sent.
  const result = await computeServiceSlots(service);
  const stillFree = result?.days.some((d) => d.slots.some((s) => s.iso === startIso));
  if (!stillFree) {
    return { ok: false, error: "Sorry, that time is no longer available. Please pick another." };
  }

  const dbService = await prisma.service.findFirst({
    where: { studioId: studio.id, sanityId: service._id },
  });
  if (!dbService) {
    return { ok: false, error: "Booking isn't configured for this service yet." };
  }

  const start = new Date(startIso);
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Final overlap guard inside the transaction, against the live table.
      const conflict = await tx.booking.findFirst({
        where: {
          studioId: studio.id,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
        select: { id: true },
      });
      if (conflict) throw new Error("SLOT_TAKEN");

      return tx.booking.create({
        data: {
          studioId: studio.id,
          serviceId: dbService.id,
          startTime: start,
          endTime: end,
          status: BookingStatus.PENDING,
          formResponses: notes ? ({ notes } as Prisma.InputJsonValue) : undefined,
          attendee: { create: { name, email, phone: phone || null } },
        },
        select: { id: true },
      });
    });
    return { ok: true, bookingId: booking.id, startIso };
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return { ok: false, error: "Sorry, that time was just taken. Please pick another." };
    }
    console.error("createPendingBooking failed:", err);
    return { ok: false, error: "Something went wrong creating your booking. Please try again." };
  }
}
