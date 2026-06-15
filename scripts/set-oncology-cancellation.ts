/* eslint-disable no-console */
// scripts/set-oncology-cancellation.ts
//
// One-off: set the optional cancellation policy on Theresa's Oncology Massage
// service (slug oncology-massage-60). Heading + 4-paragraph Portable Text body.
// Patches the PUBLISHED document only; does not create or touch a draft.
//
//   npx tsx scripts/set-oncology-cancellation.ts            (dry run)
//   npx tsx scripts/set-oncology-cancellation.ts --apply

import "dotenv/config";
import { groq } from "next-sanity";

const SLUG = "oncology-massage-60";

const HEADING = "Cancellation Policy for Oncology Massage";

const PARAGRAPHS = [
  "Because many oncology massage clients are managing treatment, fatigue, immune changes, pain, or nausea, illness-related cancellations are handled with compassion and flexibility.",
  "If you feel ill, or have a fever, new cough, sore throat, vomiting, diarrhea, infection, unusual swelling, or your medical team has advised against massage, please contact me as soon as you can. There is no cancellation fee for illness-related cancellations.",
  "For all other cancellations, please give at least 24 hours of notice. Late cancellations or missed appointments may be charged a fee.",
  "If you are unsure whether massage is right for you that day, reach out beforehand and we will decide together whether to proceed, modify, or reschedule.",
];

// Build Portable Text blocks with stable keys (Sanity needs _key on blocks
// and their child spans).
const cancellationBody = PARAGRAPHS.map((text, i) => ({
  _type: "block",
  _key: `cancel-p${i + 1}`,
  style: "normal",
  markDefs: [],
  children: [
    {
      _type: "span",
      _key: `cancel-p${i + 1}-s0`,
      text,
      marks: [],
    },
  ],
}));

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  // Resolve the published id. Slug match returns the published doc id
  // (no drafts. prefix) when published.
  const matches = await sanityWrite.fetch<{ _id: string; title: string }[]>(
    groq`*[_type=="service" && slug.current==$slug]{_id, title}`,
    { slug: SLUG },
  );

  if (matches.length === 0) {
    console.error(`ABORT: no service found with slug "${SLUG}"`);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error("ABORT: more than one match; refusing to guess:", matches);
    process.exit(1);
  }

  const publishedId = matches[0]._id.replace(/^drafts\./, "");
  console.log(`Target: ${publishedId} ("${matches[0].title}")`);
  console.log(`Will set cancellationHeading = "${HEADING}"`);
  console.log(`Will set cancellationBody = ${PARAGRAPHS.length} paragraphs`);

  if (!apply) {
    console.log("(dry run; re-run with --apply to write)");
    return;
  }

  await sanityWrite
    .patch(publishedId)
    .set({ cancellationHeading: HEADING, cancellationBody })
    .commit();
  console.log("patched", publishedId);

  // Verify: read back the published doc, and confirm there is no draft.
  const after = await sanityWrite.fetch<
    {
      _id: string;
      cancellationHeading?: string;
      paraCount: number;
    }[]
  >(
    groq`*[_id==$id]{_id, cancellationHeading, "paraCount": count(cancellationBody)}`,
    { id: publishedId },
  );
  const draft = await sanityWrite.fetch<string[]>(
    groq`*[_id==$draftId]._id`,
    { draftId: `drafts.${publishedId}` },
  );

  console.log("after:", JSON.stringify(after));
  console.log("hasDraft:", draft.length > 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
