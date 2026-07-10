/* eslint-disable no-console */
// scripts/seed-empty-state-qa.ts
//
// Seeds a SPARSE content set used to eyeball empty-state layouts: how the
// site renders with 1-2 services, 1-2 testimonials, no instructors, no FAQs,
// no nav items, and an empty contact block. Pair with the full-page
// screenshot review before client demos (see docs ADR 0005 context).
//
// TARGET: the template demo project only, in a NON-production dataset, e.g.
//   NEXT_PUBLIC_SANITY_PROJECT_ID=hgrwkcpp
//   NEXT_PUBLIC_SANITY_DATASET=qa-sparse
//   SANITY_API_WRITE_TOKEN=<demo project editor token>
// (put overrides in .env.local; create the dataset once with
//   NEXT_PUBLIC_SANITY_PROJECT_ID=hgrwkcpp npx sanity dataset create qa-sparse --visibility public)
//
// USAGE:
//   npx tsx scripts/seed-empty-state-qa.ts                              # dry-run
//   npx tsx scripts/seed-empty-state-qa.ts --apply                      # write
//   npx tsx scripts/seed-empty-state-qa.ts --services=1 --testimonials=2 --apply
//
// Idempotent: deterministic ids ("qa-*"); re-running replaces in place and
// deletes the qa docs above the requested counts.

import "dotenv/config";

// HARD SAFETY GUARD. The repo .env points at a LIVE CLIENT project with an
// active write token; this fixture must never be able to touch a client
// dataset or the demo project's production dataset. Do not remove.
const ALLOWED_PROJECT = "hgrwkcpp";

const MAX_DOCS = 2;

function intFlag(name: string, fallback: number): number {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const n = parseInt(arg.split("=")[1], 10);
  if (Number.isNaN(n) || n < 1 || n > MAX_DOCS) {
    console.error(`--${name} must be 1..${MAX_DOCS}`);
    process.exit(1);
  }
  return n;
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

  if (projectId !== ALLOWED_PROJECT || !dataset || dataset === "production") {
    console.error(
      `Refusing to run: this QA fixture only writes to project "${ALLOWED_PROJECT}" ` +
        `in a non-production dataset. Current target: project "${projectId}", dataset "${dataset}". ` +
        `Set overrides in .env.local (see header comment).`,
    );
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");
  const serviceCount = intFlag("services", 2);
  const testimonialCount = intFlag("testimonials", 2);
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const services = Array.from({ length: MAX_DOCS }, (_, i) => ({
    _id: `qa-service-${i + 1}`,
    _type: "service",
    title: ["Deep Tissue Massage", "Swedish Massage"][i],
    slug: { current: ["qa-deep-tissue", "qa-swedish"][i] },
    tagline: "QA fixture service for empty-state layout review.",
    durationMinutes: 60,
    priceCents: 9000,
    isActive: true,
    order: (i + 1) * 10,
  })).slice(0, serviceCount);

  const testimonials = Array.from({ length: MAX_DOCS }, (_, i) => ({
    _id: `qa-testimonial-${i + 1}`,
    _type: "testimonial",
    quote: [
      "A wonderfully calming experience from start to finish. I left feeling brand new.",
      "Booked in minutes and the session itself was outstanding. Highly recommended.",
    ][i],
    author: ["Jordan P.", "Casey R."][i],
    rating: 5,
    featured: true,
  })).slice(0, testimonialCount);

  const siteSettings = {
    _id: "siteSettings",
    _type: "siteSettings",
    name: "Empty State QA",
    tagline: "Sparse-content fixture",
    description: "Fixture dataset for empty-state layout review. Not a real site.",
    homeIntroHeading: "A heading with no photo beside it",
    homeIntroBody:
      "This intro exists to verify the no-photo centered layout. The contact block is intentionally empty so the footer collapses to the brand column and the contact page shows only its header and button.",
    // contact intentionally ABSENT; no nav items, faqs, instructors, gallery.
  };

  console.log(`Project: ${projectId}  Dataset: ${dataset}`);
  console.log(`Seeding: siteSettings + ${serviceCount} service(s) + ${testimonialCount} testimonial(s)`);
  console.log(`Deleting: qa docs above those counts, if present`);

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to write.)");
    return;
  }

  await sanityWrite.createOrReplace(siteSettings);
  console.log("Wrote siteSettings");
  for (const doc of services) {
    await sanityWrite.createOrReplace(doc);
    console.log(`Wrote ${doc._id}`);
  }
  for (const doc of testimonials) {
    await sanityWrite.createOrReplace(doc);
    console.log(`Wrote ${doc._id}`);
  }
  for (let i = serviceCount + 1; i <= MAX_DOCS; i++) {
    await sanityWrite.delete(`qa-service-${i}`);
    console.log(`Deleted qa-service-${i} (above requested count)`);
  }
  for (let i = testimonialCount + 1; i <= MAX_DOCS; i++) {
    await sanityWrite.delete(`qa-testimonial-${i}`);
    console.log(`Deleted qa-testimonial-${i} (above requested count)`);
  }
  console.log("");
  console.log("Done. Point .env.local at this dataset and run the screenshot review.");
}

main().catch((err) => {
  console.error("Empty-state QA seed failed:");
  console.error(err);
  process.exit(1);
});
