/* eslint-disable no-console */
// scripts/publish-all.ts
//
// Publishes ALL outstanding drafts at once. Sanity Studio has no "publish all"
// button, so when you've edited many documents (e.g. set a hero image on every
// service) this publishes them in one go instead of one-by-one.
//
// USAGE:
//   npx tsx scripts/publish-all.ts            # dry-run (lists what would publish)
//   npx tsx scripts/publish-all.ts --apply    # publish every draft
//
// HOW IT WORKS: a draft is a document whose _id starts with "drafts.". Publishing
// means promoting the draft to its published id. We use Sanity's official
// document "publish" action, which preserves edit history (cleaner than a manual
// create-then-delete).
//
// SAFE: publishing only makes your already-saved draft edits live. It does not
// invent or delete content. (Backs up the list of what it published for record.)

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { groq } from "next-sanity";

interface DraftRow {
  _id: string; // "drafts.<publishedId>"
  _type: string;
  title?: string;
  name?: string;
  question?: string;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const drafts = await sanityWrite.fetch<DraftRow[]>(
    groq`*[_id in path("drafts.**")]{ _id, _type, title, name, question }`,
  );

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Outstanding drafts: ${drafts.length}`);
  console.log("");

  if (drafts.length === 0) {
    console.log("Nothing to publish. All documents are already published.");
    return;
  }

  for (const d of drafts) {
    const label = d.title ?? d.name ?? d.question ?? "(untitled)";
    console.log(`  ${d._type.padEnd(14)} ${label}`);
  }
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to publish all of the above.)");
    return;
  }

  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(`backups/published-${stamp}.json`, JSON.stringify(drafts, null, 2));

  let ok = 0;
  for (const d of drafts) {
    const publishedId = d._id.replace(/^drafts\./, "");
    try {
      await sanityWrite.action({
        actionType: "sanity.action.document.publish",
        draftId: d._id,
        publishedId,
      });
      console.log(`  published ${publishedId}`);
      ok++;
    } catch (e) {
      console.error(`  FAILED ${publishedId}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log("");
  console.log(`Done. Published ${ok}/${drafts.length}. Refresh the site (changes go live in ~10s).`);
}

main().catch((err) => {
  console.error("Publish-all failed:");
  console.error(err);
  process.exit(1);
});
