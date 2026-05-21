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

// ---------------------------------------------------------------------------
// Longer page content: full description (body) + "what to expect" list.
// Written in Theresa's voice as a starting point. Applied with setIfMissing,
// so anything edited in Studio is preserved on re-runs.
// ---------------------------------------------------------------------------
type LongContent = { body: string[]; expect: string[] };

const oncology: LongContent = {
  body: [
    "Oncology massage is gentle, fully customized bodywork for anyone in active cancer treatment or living with a history of cancer. Theresa adjusts pressure, positioning, and technique to exactly where you are, so every session stays safe and supportive.",
    "Clients come to ease pain and tension, lower stress and anxiety, settle nausea, and feel genuinely cared for during a hard stretch.",
  ],
  expect: [
    "A short check-in about your treatment and how you feel that day",
    "Light, comfortable pressure with careful positioning and extra cushioning as needed",
    "A calm, unhurried session at your pace",
    "Simple aftercare suggestions to use at home",
  ],
};

const swedish: LongContent = {
  body: [
    "Swedish massage is the classic, full-body relaxation massage: long flowing strokes, gentle kneading, and steady pressure that ease muscle tension and improve circulation.",
    "It is a perfect starting point if you are new to bodywork, or simply want to unwind, reduce stress, and feel restored.",
  ],
  expect: [
    "A relaxing, full-body session at a pressure you choose",
    "Long, soothing strokes that release everyday tension",
    "Improved circulation and a calmer mind",
    "A comfortable, private, unhurried space",
  ],
};

const CONTENT: Record<string, LongContent> = {
  "oncology-massage-60": oncology,
  "oncology-massage-90": oncology,
  "swedish-massage-60": swedish,
  "swedish-massage-90": swedish,
  "manual-lymphatic-drainage": {
    body: [
      "Manual Lymphatic Drainage is a light, rhythmic technique that helps your lymphatic system move fluid, calm swelling, and support your immune system. The touch is much gentler than a typical massage.",
      "It is especially helpful after surgery or lymph node removal, and for anyone managing swelling, inflammation, or recovery. Theresa is a certified manual lymphatic drainage therapist (CMLDT).",
    ],
    expect: [
      "Very light, slow, repetitive strokes that follow your lymph pathways",
      "A focus on reducing swelling and supporting healing",
      "Comfortable positioning throughout",
      "Guidance on simple at-home techniques between visits",
    ],
  },
  "craniosacral-therapy": {
    body: [
      "Craniosacral therapy uses an extremely light touch, about the weight of a nickel, to release deep tension in the head, spine, and sacrum and help the nervous system settle.",
      "Because it is so gentle, it suits people who find regular massage too intense. Clients often use it for chronic pain, headaches, insomnia, and a general sense of overwhelm.",
    ],
    expect: [
      "Gentle, still holds rather than kneading or deep pressure",
      "You stay fully clothed and comfortable",
      "A deeply relaxing, quiet session",
      "Many people feel calmer and sleep better afterward",
    ],
  },
  "structural-bodywork": {
    body: [
      "Structural bodywork looks at how you stand and move, then uses focused massage techniques to improve your posture, mobility, and alignment.",
      "Instead of only chasing the spot that hurts, Theresa works to address the root cause, so relief lasts longer and movement feels easier.",
    ],
    expect: [
      "A brief posture and movement assessment",
      "Targeted work on the patterns behind your pain or stiffness",
      "More freedom of movement and better alignment over a series of sessions",
      "Tips to support the changes between visits",
    ],
  },
  reiki: {
    body: [
      "Reiki is a gentle, hands-on (or hands-just-above) energy practice meant to support your body's own ability to relax and heal.",
      "Many clients use it alongside regular medical care for stress relief, better sleep, and a real sense of calm. You stay fully clothed throughout.",
    ],
    expect: [
      "A quiet, restful session while you lie comfortably",
      "Light resting touch, or hands held just above the body",
      "A focus on relaxation and balance",
      "Many people leave feeling settled and refreshed",
    ],
  },
  "pregnancy-massage": {
    body: [
      "Pregnancy massage is tailored to the changing needs of the mother-to-be, with safe positioning and gentle techniques that support your body through each trimester.",
      "It can ease back and hip discomfort, reduce swelling, and give you a calm, restful break.",
    ],
    expect: [
      "Safe, supported positioning with plenty of cushioning",
      "Gentle techniques chosen for where you are in pregnancy",
      "Relief for common aches, tension, and swelling",
      "A peaceful chance to rest and reconnect",
    ],
  },
  "pediatric-massage": {
    body: [
      "Pediatric massage is skilled, nurturing touch for infants and children, from newborns up to about 12 years old.",
      "It can help with sleep, digestion, growing pains, tension headaches, and the comfort of children with medical or sensory needs. Theresa brings decades of pediatric nursing experience to this work.",
    ],
    expect: [
      "Gentle, age-appropriate touch with a parent present",
      "A calm, friendly pace that follows the child's comfort",
      "Support for sleep, digestion, and everyday discomforts",
      "Simple techniques families can continue at home",
    ],
  },
  "neuropathy-massage": {
    body: [
      "This single session focuses on easing the symptoms of peripheral neuropathy by improving circulation to the feet and hands and supporting nerve health.",
      "Theresa combines targeted massage with heat lamp application, and sends you home with a daily self-massage and exercise program to keep the progress going.",
    ],
    expect: [
      "Focused work on the feet and/or hands",
      "Heat lamp application to support circulation and nerve healing",
      "A calm, comfortable session",
      "A simple daily home program to continue between visits",
    ],
  },
  "neuropathy-no-more": {
    body: [
      "Neuropathy No More is a four-session program built to relieve the pain and discomfort of peripheral neuropathy over time. Each weekly session focuses on improving circulation to the feet and hands and supporting nerve healing.",
      "The program pairs hands-on massage and heat lamp work with a daily self-massage routine you do at home, so the four sessions build on each other. To get started, reach out and Theresa will plan the schedule with you.",
    ],
    expect: [
      "Four weekly sessions designed to build on each other",
      "Focused massage on the feet and/or hands with heat lamp application",
      "A daily at-home self-massage and exercise program",
      "A plan tailored to your symptoms and schedule",
    ],
  },
};

// Build Sanity portable-text blocks from plain strings.
type PtBlock = {
  _type: "block";
  _key: string;
  style: "normal";
  markDefs: never[];
  listItem?: "bullet";
  level?: number;
  children: { _type: "span"; _key: string; text: string; marks: never[] }[];
};

function toParagraphs(paragraphs: string[]): PtBlock[] {
  return paragraphs.map((text, i) => ({
    _type: "block",
    _key: `body${i}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `body${i}s`, text, marks: [] }],
  }));
}

function toBullets(items: string[]): PtBlock[] {
  return items.map((text, i) => ({
    _type: "block",
    _key: `exp${i}`,
    style: "normal",
    listItem: "bullet",
    level: 1,
    markDefs: [],
    children: [{ _type: "span", _key: `exp${i}s`, text, marks: [] }],
  }));
}

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
    const content = CONTENT[s.slug];
    const longFields: { body?: PtBlock[]; whatToExpect?: PtBlock[] } = content
      ? { body: toParagraphs(content.body), whatToExpect: toBullets(content.expect) }
      : {};
    if (existingById.has(id)) {
      // set() overwrites the managed fields; setIfMissing() fills body +
      // whatToExpect only when empty, preserving anything edited in Studio.
      const patch = sanityWrite.patch(id).set(managed);
      if (content) patch.setIfMissing(longFields);
      await patch.commit();
      console.log(`Patched ${id}`);
    } else {
      await sanityWrite.create({ _id: id, _type: "service", isActive: true, ...managed, ...longFields });
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
