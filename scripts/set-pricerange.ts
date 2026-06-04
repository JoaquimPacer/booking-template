/* eslint-disable no-console */
// scripts/set-pricerange.ts
//
// One-off: set siteSettings.priceRange. This value shows in the Google
// LocalBusiness rich result (and is editable in Studio under Business info).
//
//   npx tsx scripts/set-pricerange.ts            (dry run)
//   npx tsx scripts/set-pricerange.ts --apply

import "dotenv/config";
import { groq } from "next-sanity";

const VALUE = "$135-$185";

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const ids = await sanityWrite.fetch<string[]>(groq`*[_type=="siteSettings"]._id`);
  if (!ids.length) {
    console.error("ABORT: no siteSettings document found");
    process.exit(1);
  }
  console.log(`Will set priceRange = "${VALUE}" on:`, ids);

  if (!apply) {
    console.log("(dry run; re-run with --apply to write)");
    return;
  }

  for (const id of ids) {
    await sanityWrite.patch(id).set({ priceRange: VALUE }).commit();
    console.log("patched", id);
  }

  const after = await sanityWrite.fetch<{ _id: string; priceRange?: string }[]>(
    groq`*[_type=="siteSettings"]{_id, priceRange}`,
  );
  console.log("after:", JSON.stringify(after));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
