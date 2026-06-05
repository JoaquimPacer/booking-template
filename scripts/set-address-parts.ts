/* eslint-disable no-console */
// scripts/set-address-parts.ts
//
// One-off: fill the structured address parts (city / state / ZIP / country) that
// feed the Google LocalBusiness rich result. Editable afterward in Studio under
// Contact information.
//
//   npx tsx scripts/set-address-parts.ts            (dry run)
//   npx tsx scripts/set-address-parts.ts --apply

import "dotenv/config";
import { groq } from "next-sanity";

const PARTS: Record<string, string> = {
  "contact.addressLocality": "Austin",
  "contact.addressRegion": "TX",
  "contact.postalCode": "78749",
  "contact.addressCountry": "US",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const ids = await sanityWrite.fetch<string[]>(groq`*[_type=="siteSettings"]._id`);
  if (!ids.length) {
    console.error("ABORT: no siteSettings document found");
    process.exit(1);
  }
  console.log("Will set on", ids, ":", PARTS);

  if (!apply) {
    console.log("(dry run; re-run with --apply to write)");
    return;
  }

  for (const id of ids) {
    await sanityWrite.patch(id).set(PARTS).commit();
    console.log("patched", id);
  }

  const after = await sanityWrite.fetch(
    groq`*[_type=="siteSettings"]{_id, "addr": contact{address, addressLocality, addressRegion, postalCode, addressCountry}}`,
  );
  console.log("after:", JSON.stringify(after));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
