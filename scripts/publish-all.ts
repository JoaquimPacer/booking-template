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
// means promoting the draft to its published id. We do this the universally
// supported way: write the draft's content to the published id (createOrReplace),
// then delete the draft, inside one transaction. (The newer Actions API returns
// 404 on some project configs, so we avoid it.)
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

  // Fetch FULL draft docs (all fields), so we can write their content to the
  // published id.
  const drafts = await sanityWrite.fetch<Array<Record<string, unknown> & DraftRow>>(
    groq`*[_id in path("drafts.**")]`,
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
      // Copy the draft's content onto the published id, then remove the draft.
      // One transaction = atomic (both happen or neither).
      const { _id, _rev, ...content } = d as Record<string, unknown> & { _rev?: string };
      void _id;
      void _rev;
      await sanityWrite
        .transaction()
        .createOrReplace({ ...content, _id: publishedId } as { _id: string; _type: string })
        .delete(d._id)
        .commit();
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
