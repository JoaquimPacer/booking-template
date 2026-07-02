/* eslint-disable no-console */
// scripts/set-tmj-content.ts
//
// One-off: replace the leftover "Therapeutic Massage" copy on the new
// TMJ & Jaw Tension Relief Massage service (created by duplicating that
// service) with real TMJ content. Source: Theresa's JaneApp listing plus
// the framing from her approved TMJ flyer (supportive care, no medical claims).
//
// Patches the DRAFT only (drafts.96125818-...). Does NOT publish, because the
// hero image is still coming from Joaquim. Keeps title/price/duration/
// bookingMode/options/bookingUrl as-is.
//
//   npx tsx scripts/set-tmj-content.ts            (dry run)
//   npx tsx scripts/set-tmj-content.ts --apply
//
// Booking link treatment/115 was verified to resolve to "TMJ & Jaw Tension
// Relief Massage" on JaneApp before this script was written.

import "dotenv/config";
import { groq } from "next-sanity";

const DRAFT_ID = "drafts.96125818-8ff7-4642-a745-9f18661c5cdb";
const EXPECT_TITLE = "TMJ & Jaw Tension Relief Massage";

const TAGLINE = "Focused massage to ease jaw tension, clenching, and TMJ discomfort";

const SHORT_DESCRIPTION =
  "A focused 60-minute massage to relieve tension in the jaw, face, head, neck, and shoulders, easing clenching, tension headaches, and TMJ discomfort.";

const SEO_TITLE = "TMJ & Jaw Tension Massage, South Austin";

const SEO_DESCRIPTION =
  "Gentle TMJ and jaw tension massage in South Austin with Theresa Attea, LMT. Ease clenching, jaw pain, and tension headaches in a focused 60-minute session.";

// Full description (shown on the service page). Paragraph 1 mirrors her JaneApp
// wording for cross-platform consistency; paragraph 2 keeps the supportive-care
// scope framing from her flyer.
const BODY_PARAGRAPHS = [
  "A focused therapeutic massage session designed to relieve tension in the jaw, face, head, neck, and shoulders. This work may help reduce jaw tightness, clenching, headaches, and discomfort related to TMJ dysfunction. Gentle techniques are used to calm the nervous system, release muscle tension, and improve ease of movement in the jaw.",
  "Massage is a gentle, drug-free way to ease the muscle tension behind jaw pain. It is supportive care for comfort and movement, and works well alongside the care of your dentist or doctor.",
];

const WHAT_TO_EXPECT_BULLETS = [
  "A short check-in about your jaw symptoms, headaches, clenching or grinding, and what you would like to focus on.",
  "Gentle, focused work on the jaw, face, head, neck, and shoulder muscles, including the masseter and temporalis (the main muscles that clench and tighten).",
  "Techniques to calm the nervous system and release built-up tension.",
  "Simple self-care suggestions you can use at home between sessions.",
];

const body = BODY_PARAGRAPHS.map((text, i) => ({
  _type: "block",
  _key: `tmj-body-p${i + 1}`,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `tmj-body-p${i + 1}-s0`, text, marks: [] }],
}));

const whatToExpect = WHAT_TO_EXPECT_BULLETS.map((text, i) => ({
  _type: "block",
  _key: `tmj-wte-${i + 1}`,
  style: "normal",
  listItem: "bullet",
  level: 1,
  markDefs: [],
  children: [{ _type: "span", _key: `tmj-wte-${i + 1}-s0`, text, marks: [] }],
}));

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"}`);

  const doc = await sanityWrite.fetch<{ _id: string; title: string } | null>(
    groq`*[_id==$id][0]{_id, title}`,
    { id: DRAFT_ID },
  );

  if (!doc) {
    console.error(`ABORT: draft ${DRAFT_ID} not found.`);
    process.exit(1);
  }
  if (doc.title !== EXPECT_TITLE) {
    console.error(
      `ABORT: draft title is "${doc.title}", expected "${EXPECT_TITLE}". Refusing to patch the wrong doc.`,
    );
    process.exit(1);
  }

  console.log(`Target: ${doc._id} ("${doc.title}")`);
  console.log(`  tagline           -> ${TAGLINE}`);
  console.log(`  description        -> ${SHORT_DESCRIPTION.length} chars`);
  console.log(`  seo.metaTitle      -> ${SEO_TITLE} (${SEO_TITLE.length} chars)`);
  console.log(`  seo.metaDescription-> ${SEO_DESCRIPTION.length} chars`);
  console.log(`  body               -> ${body.length} paragraphs`);
  console.log(`  whatToExpect       -> ${whatToExpect.length} bullets`);

  if (!apply) {
    console.log("(dry run; re-run with --apply to write. Does NOT publish.)");
    return;
  }

  await sanityWrite
    .patch(DRAFT_ID)
    .set({
      tagline: TAGLINE,
      description: SHORT_DESCRIPTION,
      body,
      whatToExpect,
      "seo.metaTitle": SEO_TITLE,
      "seo.metaDescription": SEO_DESCRIPTION,
    })
    .commit();
  console.log("patched", DRAFT_ID, "(still a draft; not published)");

  const after = await sanityWrite.fetch<unknown>(
    groq`*[_id==$id][0]{
      title, tagline, description,
      "seoTitle": seo.metaTitle, "seoDesc": seo.metaDescription,
      "bodyParas": count(body), "wte": count(whatToExpect),
      priceCents, durationMinutes, bookingUrl, bookingMode
    }`,
    { id: DRAFT_ID },
  );
  console.log("after:", JSON.stringify(after, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
