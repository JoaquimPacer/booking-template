/* eslint-disable no-console */
// scripts/set-booking-links.ts
//
// Sets the verified JaneApp booking links:
//   - site-wide externalBookingUrl  (master switch: generic Book buttons -> her
//     plain "select a treatment" page)
//   - per-service bookingUrl        (deep links: each service -> its treatment)
//
// Mapping was VERIFIED on 2026-06-02 by driving a headless browser to each deep
// link (scripts/check-jane-links.ts) and reading the treatment that ends up
// selected. We target services by their stable deterministic _id ("service-<slug>")
// because the displayed title was edited in Studio (Jane "Swedish" -> site
// "Therapeutic"), so titles are NOT a safe key.
//
// SAFETY: dumps current values to backups/ before writing; patches published AND
// any draft; re-reads and prints to confirm. Reversible via Sanity history.
//
//   npx tsx scripts/set-booking-links.ts            (dry run: backup + plan)
//   npx tsx scripts/set-booking-links.ts --apply

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { groq } from "next-sanity";

const JANE_BASE =
  "https://cancerrehab.janeapp.com/locations/theresa-s-home-office/book#/staff_member/5/treatment/";
const SITEWIDE = "https://cancerrehab.janeapp.com/locations/theresa-s-home-office/book";

// service _id -> Jane treatment id (verified). neuropathy-no-more gets NO link
// on purpose (4-session package, hidden / inquire-to-book).
const MAP: Record<string, string> = {
  "service-oncology-massage-60": "12",
  "service-oncology-massage-90": "21",
  "service-craniosacral-therapy": "13",
  "service-manual-lymphatic-drainage": "54",
  "service-structural-bodywork": "14",
  "service-neuropathy-massage": "35", // single session (NOT the 4-pack)
  "service-swedish-massage-60": "18", // shown in Studio as "Therapeutic Massage (60 min)"
  "service-swedish-massage-90": "19", // shown in Studio as "Therapeutic Massage (90 min)"
  "service-reiki": "15",
  "service-pregnancy-massage": "16",
  "service-pediatric-massage": "17",
};

type Svc = { _id: string; title?: string; bookingUrl?: string };
type Settings = { _id: string; externalBookingUrl?: string };

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const services = await sanityWrite.fetch<Svc[]>(
    groq`*[_type == "service"]{_id, title, bookingUrl}`,
  );
  const settings = await sanityWrite.fetch<Settings[]>(
    groq`*[_type == "siteSettings"]{_id, externalBookingUrl}`,
  );

  // Backup current state first.
  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `backups/booking-links-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify({ services, settings }, null, 2));
  console.log(`Backed up ${services.length} service docs + ${settings.length} settings -> ${backupPath}\n`);

  console.log("Found service docs:");
  for (const s of services.filter((x) => !x._id.startsWith("drafts.")))
    console.log(`  ${s._id}  |  ${s.title ?? "(no title)"}  |  ${s.bookingUrl ? "has link" : "no link"}`);
  console.log("");

  // Validate: every mapped _id must exist (published or draft). Fail loud.
  const ids = new Set(services.map((s) => s._id));
  const missing = Object.keys(MAP).filter((id) => !ids.has(id) && !ids.has(`drafts.${id}`));
  if (missing.length) {
    console.error("ABORT: these expected service docs were not found:", missing);
    process.exit(1);
  }

  console.log("Plan:");
  console.log(`  site-wide externalBookingUrl -> ${SITEWIDE}`);
  for (const [id, tid] of Object.entries(MAP)) console.log(`  ${id}.bookingUrl -> .../treatment/${tid}`);
  console.log("");

  if (!apply) {
    console.log("(Dry run. Re-run with --apply to write.)");
    return;
  }

  for (const [id, tid] of Object.entries(MAP)) {
    const url = JANE_BASE + tid;
    for (const target of [id, `drafts.${id}`]) {
      if (!ids.has(target)) continue;
      await sanityWrite.patch(target).set({ bookingUrl: url }).commit();
      console.log(`set bookingUrl on ${target}`);
    }
  }
  for (const s of settings) {
    await sanityWrite.patch(s._id).set({ externalBookingUrl: SITEWIDE }).commit();
    console.log(`set externalBookingUrl on ${s._id}`);
  }
  if (!settings.length) console.error("WARNING: no siteSettings doc found; site-wide link NOT set.");

  // Verify by reading back the published docs.
  console.log("\n--- VERIFY (published) ---");
  const after = await sanityWrite.fetch<Svc[]>(
    groq`*[_type == "service" && !(_id in path("drafts.**"))]{_id, title, bookingUrl} | order(_id)`,
  );
  for (const s of after) {
    const tail = s.bookingUrl ? s.bookingUrl.split("/").slice(-1)[0] : "(none)";
    console.log(`  ${(s.title ?? s._id).padEnd(38)} -> ${tail}`);
  }
  const sAfter = await sanityWrite.fetch<Settings | null>(
    groq`*[_type == "siteSettings" && !(_id in path("drafts.**"))][0]{externalBookingUrl}`,
  );
  console.log(`  site-wide externalBookingUrl -> ${sAfter?.externalBookingUrl ?? "(none)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
