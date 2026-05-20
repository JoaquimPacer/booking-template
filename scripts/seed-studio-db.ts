/* eslint-disable no-console */
// scripts/seed-studio-db.ts
//
// Seeds the Postgres (Neon) side of the booking engine for the studio the .env
// points at: the Studio row, weekly availability hours, and a Service row per
// Sanity service (linked by sanityId, the FK target for bookings).
//
// RUN ORDER: run AFTER scripts/seed-theresa-services.ts --apply, so Sanity holds
// the real services this script mirrors into Postgres.
//
// USAGE:
//   npx tsx scripts/seed-studio-db.ts            # dry-run; prints the plan
//   npx tsx scripts/seed-studio-db.ts --apply    # write to the database
//
// Idempotent: re-running upserts the studio, replaces the weekly hours, and
// upserts services by sanityId. Existing bookings are never touched.
//
// HEADS UP: the weekly hours below are a PLACEHOLDER (Tue-Sat, 9-5). Replace with
// Theresa's real hours before launch (or edit them in /admin once Phase 3 ships).

import "dotenv/config";
import { groq } from "next-sanity";

const STUDIO_SLUG = "theresa-attea";
const STUDIO_TIMEZONE = "America/Chicago"; // Austin, TX

// dayOfWeek: 0 = Sunday ... 6 = Saturday. PLACEHOLDER hours.
const WEEKLY_HOURS = [
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }, // Tue
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }, // Wed
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }, // Thu
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" }, // Fri
  { dayOfWeek: 6, startTime: "09:00", endTime: "15:00" }, // Sat
];

interface SanityService {
  _id: string;
  title: string;
  slug?: { current?: string };
  durationMinutes?: number;
  bufferMinutes?: number;
  priceCents?: number;
  isActive?: boolean;
  bookingMode?: string;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { prisma } = await import("../src/lib/prisma");
  const { sanity } = await import("../src/lib/sanity");

  const siteName = await sanity.fetch<string | null>(
    groq`*[_type == "siteSettings"][0].name`,
  );
  const services = await sanity.fetch<SanityService[]>(
    groq`*[_type == "service" && isActive != false]{ _id, title, slug, durationMinutes, bufferMinutes, priceCents, isActive, bookingMode }`,
  );
  const syncable = services.filter((s) => typeof s.durationMinutes === "number");

  console.log(`Database target: ${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@") ?? "(unset)"}`);
  console.log(`Studio: ${siteName ?? "Theresa Attea, LMT"} (${STUDIO_SLUG}, ${STUDIO_TIMEZONE})`);
  console.log(`Weekly hour rules: ${WEEKLY_HOURS.length}`);
  console.log(`Services to sync (have a duration): ${syncable.length} of ${services.length}`);
  for (const s of syncable) {
    console.log(`  - ${s.title} (${s.durationMinutes}min, $${(s.priceCents ?? 0) / 100}, ${s.bookingMode ?? "slots"})`);
  }
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to write to the database.)");
    await prisma.$disconnect();
    return;
  }

  const studio = await prisma.studio.upsert({
    where: { slug: STUDIO_SLUG },
    update: { name: siteName ?? "Theresa Attea, LMT", timezone: STUDIO_TIMEZONE },
    create: { slug: STUDIO_SLUG, name: siteName ?? "Theresa Attea, LMT", timezone: STUDIO_TIMEZONE },
  });
  console.log(`Studio upserted: ${studio.id}`);

  // Replace weekly hours wholesale (idempotent + reflects edits).
  await prisma.availabilityRule.deleteMany({ where: { studioId: studio.id } });
  await prisma.availabilityRule.createMany({
    data: WEEKLY_HOURS.map((h) => ({ ...h, studioId: studio.id })),
  });
  console.log(`Weekly hours set: ${WEEKLY_HOURS.length} rules`);

  // Upsert services by sanityId (no unique constraint, so find-then-write).
  for (const s of syncable) {
    const existing = await prisma.service.findFirst({
      where: { studioId: studio.id, sanityId: s._id },
      select: { id: true },
    });
    const fields = {
      sanityId: s._id,
      title: s.title,
      durationMinutes: s.durationMinutes!,
      priceCents: s.priceCents ?? 0,
      bufferMinutes: s.bufferMinutes ?? 0,
      isActive: s.isActive !== false,
      studioId: studio.id,
    };
    if (existing) {
      await prisma.service.update({ where: { id: existing.id }, data: fields });
    } else {
      await prisma.service.create({ data: fields });
    }
  }
  console.log(`Services synced: ${syncable.length}`);

  console.log("");
  console.log("Done. The /book/[slug] picker will now show real availability.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("DB seed failed:");
  console.error(err);
  process.exit(1);
});
