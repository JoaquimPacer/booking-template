/* eslint-disable no-console */
// scripts/seed-theresa-services.ts
//
// Canonical, idempotent seeder for Theresa Attea's real service menu.
// Source of truth: her JaneApp page (cancerrehab.janeapp.com), prices + durations
// read off the live page on 2026-05-20. Descriptions are her own JaneApp copy,
// lightly cleaned (typos fixed).
//
// HOW TO USE:
//   1. In .env, set NEXT_PUBLIC_SANITY_PROJECT_ID to Theresa's project (7vrjehyn)
//      and SANITY_API_WRITE_TOKEN to an Editor token.
//   2. Dry run (no writes, just prints the plan + writes a backup file):
//        npx tsx scripts/seed-theresa-services.ts
//   3. Apply:
//        npx tsx scripts/seed-theresa-services.ts --apply
//
// SAFETY / REVERSIBILITY:
//   - Before any change it dumps ALL current service docs to
//     backups/sanity-services-<timestamp>.json. Restore with
//     scripts/restore-sanity-services.ts <file>.
//   - Canonical docs use DETERMINISTIC ids ("service-<slug>") so re-running is safe.
//   - Existing canonical docs are PATCHED (only the managed text/number fields are
//     set); heroImage, gallery, body, whatToExpect and seo are LEFT UNTOUCHED, so
//     photos and rich text added in Studio survive a re-run.
//   - Any service doc whose id is not in the canonical set is deleted (this is how
//     the old placeholder docs + the "Myofascial Release" orphan get removed).
//   - The Instructor doc is intentionally NOT touched here.
//
// All values remain editable in Sanity Studio afterward.

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { groq } from "next-sanity";

// Fields this script owns. Anything NOT in this list (heroImage, gallery, body,
// whatToExpect, seo) is preserved on existing docs.
type ManagedService = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  order: number;
  // "slots" (default) = online time-slot booking. "inquire" = contact-to-book.
  bookingMode?: "slots" | "inquire" | "hidden";
};

// Her 12 unique services. The 60/90 pairs carry the length in the title so they
// are distinguishable in a list (the duration badge shows it too). "with Theresa"
// is dropped: it is redundant on her own site.
const SERVICES: ManagedService[] = [
  {
    slug: "oncology-massage-60",
    title: "Oncology Massage (60 min)",
    tagline: "Gentle, specialized care during and after cancer treatment",
    description:
      "A gentle massage session designed to promote health and wellbeing during and after cancer treatment.",
    durationMinutes: 60,
    priceCents: 13500,
    order: 10,
  },
  {
    slug: "oncology-massage-90",
    title: "Oncology Massage (90 min)",
    tagline: "Gentle, specialized care during and after cancer treatment",
    description:
      "A gentle, 90-minute massage session designed to promote health and wellbeing during and after cancer treatment.",
    durationMinutes: 90,
    priceCents: 17500,
    order: 20,
  },
  {
    slug: "manual-lymphatic-drainage",
    title: "Manual Lymphatic Drainage",
    tagline: "Gentle technique to reduce swelling and support immune function",
    description:
      "Manual Lymphatic Drainage (MLD) is a gentle massage technique that improves lymphatic system flow, reduces swelling, stimulates immune function, decreases pain, and soothes the nervous system. MLD is especially helpful post-operatively to decrease swelling and after lymph node removal for cancer treatment.",
    durationMinutes: 90,
    priceCents: 18500,
    order: 30,
  },
  {
    slug: "craniosacral-therapy",
    title: "Craniosacral Therapy",
    tagline: "Light-touch work to relieve restrictions and calm the nervous system",
    description:
      "Light touch applied to the head, spine, and sacrum to relieve restrictions in these structures and balance the nervous system. Effective for chronic pain, headaches, insomnia, and general wellbeing.",
    durationMinutes: 90,
    priceCents: 17500,
    order: 40,
  },
  {
    slug: "structural-bodywork",
    title: "Structural Bodywork",
    tagline: "Posture and movement work that gets to the root of pain",
    description:
      "Posture analysis and massage techniques to improve the body's structure and mobility. Gets to the root cause of pain and limitations.",
    durationMinutes: 90,
    priceCents: 17500,
    order: 50,
  },
  {
    slug: "swedish-massage-60",
    title: "Swedish Massage (60 min)",
    tagline: "Classic full-body relaxation massage",
    description: "General relaxation massage.",
    durationMinutes: 60,
    priceCents: 13500,
    order: 60,
  },
  {
    slug: "swedish-massage-90",
    title: "Swedish Massage (90 min)",
    tagline: "Relaxation massage for mobility, pain relief, and stress reduction",
    description:
      "General relaxation massage to improve range of motion and flexibility, relieve pain, reduce stress, and improve mood.",
    durationMinutes: 90,
    priceCents: 17500,
    order: 70,
  },
  {
    slug: "reiki",
    title: "Reiki",
    tagline: "Gentle energy work to support the body's natural healing",
    description:
      "Energy is channeled by the therapist, through touch, to activate the body's natural healing processes and restore physical and emotional wellbeing.",
    durationMinutes: 60,
    priceCents: 13500,
    order: 80,
  },
  {
    slug: "pregnancy-massage",
    title: "Pregnancy Massage",
    tagline: "Supportive massage for the mother-to-be",
    description:
      "Massage that focuses on the special needs of the mother-to-be and supports the body as it changes throughout pregnancy.",
    durationMinutes: 60,
    priceCents: 13500,
    order: 90,
  },
  {
    slug: "pediatric-massage",
    title: "Pediatric Massage",
    tagline: "Skilled, nurturing touch for infants and children",
    description:
      "Skilled, nurturing touch for infants and children, aged newborn to 12 years, with medical conditions and specialized needs, or experiencing the common troubles of childhood (for example: sleeping difficulties, tension headaches, gas, growing pains).",
    durationMinutes: 45,
    priceCents: 12000,
    order: 100,
  },
  {
    slug: "neuropathy-massage",
    title: "Neuropathy Massage (single session)",
    tagline: "Single session to ease the symptoms of peripheral neuropathy",
    description:
      "A massage session focused on increasing circulation and alleviating the symptoms of peripheral neuropathy. The session focuses on the feet (and/or hands) with heat lamp application to support circulation and nerve healing, along with a daily self-massage home and exercise program.",
    durationMinutes: 75,
    priceCents: 17500,
    order: 110,
  },
  {
    slug: "neuropathy-no-more",
    title: "Neuropathy No More (4-session package)",
    tagline: "A four-session program to relieve peripheral neuropathy",
    description:
      "A series of four massage sessions focused on increasing circulation and alleviating the symptoms of peripheral neuropathy. The protocol consists of weekly one-hour massage sessions, focusing on the feet (and/or hands) with heat lamp application to support circulation and nerve healing, along with a daily self-massage program.",
    durationMinutes: 75,
    priceCents: 65000,
    order: 120,
    // Multi-session package: contact-to-book until package purchase is built (Phase 2E).
    bookingMode: "inquire",
  },
];

const docId = (slug: string) => `service-${slug}`;

interface ServiceDoc {
  _id: string;
  title?: string;
  slug?: { current?: string };
  priceCents?: number;
  durationMinutes?: number;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  console.log(`Project: ${projectId}`);
  console.log(`Dataset: ${dataset}`);
  console.log("");

  // 1. Snapshot current state (backup) BEFORE touching anything.
  const existing = await sanityWrite.fetch<ServiceDoc[]>(
    groq`*[_type == "service"]`,
  );
  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `backups/sanity-services-${stamp}.json`;
  writeFileSync(
    backupPath,
    JSON.stringify({ projectId, dataset, services: existing }, null, 2),
  );
  console.log(`Backed up ${existing.length} existing service doc(s) -> ${backupPath}`);
  console.log("");

  const canonicalIds = new Set(SERVICES.map((s) => docId(s.slug)));
  const existingById = new Map(existing.map((d) => [d._id, d]));
  const toDelete = existing.filter(
    (d) => !canonicalIds.has(d._id) && !canonicalIds.has(d._id.replace(/^drafts\./, "")),
  );

  console.log("Plan:");
  for (const s of SERVICES) {
    const verb = existingById.has(docId(s.slug)) ? "PATCH " : "CREATE";
    console.log(
      `  ${verb} ${docId(s.slug)}  ${s.title}  (${s.durationMinutes}min, $${s.priceCents / 100})`,
    );
  }
  for (const d of toDelete) {
    console.log(`  DELETE ${d._id}  ${d.title ?? "(untitled)"}  [not in canonical set]`);
  }
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Backup written above. Re-run with --apply to write.)");
    return;
  }

  // 2. Upsert canonical docs. Patch preserves images/rich-text on existing docs.
  for (const s of SERVICES) {
    const id = docId(s.slug);
    const managed = {
      title: s.title,
      slug: { _type: "slug", current: s.slug },
      tagline: s.tagline,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      bookingMode: s.bookingMode ?? "slots",
      order: s.order,
    };
    if (existingById.has(id)) {
      await sanityWrite.patch(id).set(managed).commit();
      console.log(`Patched ${id}`);
    } else {
      await sanityWrite.create({ _id: id, _type: "service", isActive: true, ...managed });
      console.log(`Created ${id}`);
    }
  }

  // 3. Remove docs not in the canonical set (old placeholders + orphan).
  for (const d of toDelete) {
    await sanityWrite.delete(d._id);
    console.log(`Deleted ${d._id}`);
  }

  console.log("");
  console.log(`Done. ${SERVICES.length} canonical services in place; ${toDelete.length} removed.`);
  console.log("Verify in Studio, or run: npx tsx scripts/list-services.ts");
}

main().catch((err) => {
  console.error("Seed failed:");
  console.error(err);
  process.exit(1);
});
