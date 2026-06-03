/* eslint-disable no-console */
// scripts/combine-service-options.ts
//
// Combines paired services (e.g. Oncology 60/90) into ONE service with a length
// picker (the `options` array on the service). Reads the CURRENT
// duration/price/booking link off each doc so any Studio edits are respected,
// writes them as options on the "keep" doc, and deletes the merged-away "drop"
// doc.
//
// SAFETY: backs up the FULL keep + drop docs (every field) to backups/ before
// writing, so a combine is reversible. Patches published AND any draft.
//
//   npx tsx scripts/combine-service-options.ts          (dry run + backup)
//   npx tsx scripts/combine-service-options.ts --apply

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { groq } from "next-sanity";

const COMBINES = [
  { keep: "service-oncology-massage-60", drop: "service-oncology-massage-90", title: "Oncology Massage" },
  { keep: "service-swedish-massage-60", drop: "service-swedish-massage-90", title: "Therapeutic Massage" },
];

type Doc = {
  _id: string;
  title?: string;
  durationMinutes?: number;
  priceCents?: number;
  bookingUrl?: string;
  [k: string]: unknown;
};

function optionFrom(doc: Doc, key: string) {
  const label =
    typeof doc.durationMinutes === "number" ? `${doc.durationMinutes} minutes` : "Option";
  return {
    _key: key,
    _type: "serviceOption",
    label,
    durationMinutes: doc.durationMinutes,
    priceCents: doc.priceCents,
    bookingUrl: doc.bookingUrl,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const ids = COMBINES.flatMap((c) => [c.keep, c.drop, `drafts.${c.keep}`, `drafts.${c.drop}`]);
  const docs = await sanityWrite.fetch<Doc[]>(groq`*[_id in $ids]`, { ids });
  const byId = new Map(docs.map((d) => [d._id, d]));

  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `backups/combine-services-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify(docs, null, 2));
  console.log(`Backed up ${docs.length} full docs -> ${backupPath}\n`);

  const missing = COMBINES.flatMap((c) => [c.keep, c.drop]).filter((id) => !byId.has(id));
  if (missing.length) {
    console.error("ABORT: expected service docs not found:", missing);
    process.exit(1);
  }

  console.log("Plan:");
  for (const c of COMBINES) {
    const keep = byId.get(c.keep)!;
    const drop = byId.get(c.drop)!;
    console.log(`  "${c.title}"  (keep ${c.keep}, DELETE ${c.drop})`);
    console.log(
      `    option 1: ${keep.durationMinutes}min  $${(keep.priceCents ?? 0) / 100}  ->treatment/${keep.bookingUrl?.split("/").pop()}`,
    );
    console.log(
      `    option 2: ${drop.durationMinutes}min  $${(drop.priceCents ?? 0) / 100}  ->treatment/${drop.bookingUrl?.split("/").pop()}`,
    );
  }
  console.log("");

  if (!apply) {
    console.log("(Dry run. Re-run with --apply to write.)");
    return;
  }

  for (const c of COMBINES) {
    const keep = byId.get(c.keep)!;
    const drop = byId.get(c.drop)!;
    const options = [optionFrom(keep, "opt-1"), optionFrom(drop, "opt-2")];

    for (const target of [c.keep, `drafts.${c.keep}`]) {
      if (!byId.has(target)) continue;
      await sanityWrite.patch(target).set({ title: c.title, options }).commit();
      console.log(`patched ${target}: title="${c.title}" + ${options.length} options`);
    }
    for (const target of [c.drop, `drafts.${c.drop}`]) {
      if (!byId.has(target)) continue;
      try {
        await sanityWrite.delete(target);
        console.log(`deleted ${target}`);
      } catch (e) {
        console.error(`could NOT delete ${target}: ${(e as Error).message}`);
      }
    }
  }

  console.log("\n--- VERIFY (published, active services) ---");
  const after = await sanityWrite.fetch<
    { title?: string; options?: { durationMinutes?: number; bookingUrl?: string }[] }[]
  >(
    groq`*[_type=="service" && !(_id in path("drafts.**"))] | order(orderRank asc, order asc){title, options[]{durationMinutes, bookingUrl}}`,
  );
  for (const s of after) {
    const opt = s.options?.length
      ? s.options
          .map((o) => `${o.durationMinutes}min/t${o.bookingUrl?.split("/").pop()}`)
          .join(", ")
      : "(single)";
    console.log(`  ${(s.title ?? "?").padEnd(34)} ${opt}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
