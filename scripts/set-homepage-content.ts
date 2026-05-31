/* eslint-disable no-console */
// scripts/set-homepage-content.ts
//
// Sets professional starter content on the Site Settings singleton: a warm,
// human intro paragraph about Theresa for the homepage "about" section, plus a
// calming default brand palette (so it stops looking like the test colors).
//
// Everything here is editable in Sanity Studio afterward; this just replaces the
// placeholder/test values with something presentable.
//
// USAGE:
//   npx tsx scripts/set-homepage-content.ts            # dry-run (prints the plan)
//   npx tsx scripts/set-homepage-content.ts --apply    # write to Sanity
//
// SAFE / REVERSIBLE:
//   - Backs up the current siteSettings doc to backups/site-settings-<ts>.json
//     before writing. Restore by createOrReplace-ing that doc back.
//   - Only sets the fields listed below; leaves everything else untouched.

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { groq } from "next-sanity";
import { colorFromHex } from "./lib/sanity-color";

// Warm, specific, human intro copy. Pulled from Theresa's real background
// (28 yrs experience, RN/BSN, two-time cancer survivor, oncology focus).
const INTRO_HEADING = "Meet Theresa";
const INTRO_BODY = [
  "Theresa Attea has been a licensed massage therapist since 1996, and before that she spent 25 years as a critical care and pediatric nurse. That clinical background shapes everything she does: careful, attentive, and tailored to the person on the table.",
  "She is a two-time cancer survivor, which is part of why oncology massage and lymphatic work are at the heart of her practice. Whether you are recovering from treatment, managing chronic pain, or simply need to slow down and breathe, you are in steady, experienced hands.",
].join("\n\n");

// Calming default palette (matches the code defaults in BrandTheme).
// colorFromHex builds the COMPLETE color-input object (hex + alpha + hsl/hsv/rgb)
// so the Studio color picker renders the swatch and stays fully editable.
const BRAND_COLORS = {
  primaryColor: colorFromHex("#4f6b5d"), // muted sage green
  secondaryColor: colorFromHex("#e6e0d6"), // soft sand
  accentColor: colorFromHex("#b08d57"), // warm gold
  backgroundColor: colorFromHex("#f7f4ef"), // warm cream
  foregroundColor: colorFromHex("#33302b"), // warm charcoal
};

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const current = await sanityWrite.fetch<Record<string, unknown> | null>(
    groq`*[_type == "siteSettings"][0]`,
  );
  if (!current) {
    console.error("No siteSettings document found. Run the site seed first.");
    process.exit(1);
  }

  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `backups/site-settings-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify(current, null, 2));

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Backup:  ${backupPath}`);
  console.log("");
  console.log("Will set:");
  console.log(`  homeIntroHeading = "${INTRO_HEADING}"`);
  console.log(`  homeIntroBody    = (${INTRO_BODY.length} chars)`);
  console.log(`  brand colors     = sage / sand / gold / cream / charcoal`);
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Backup written. Re-run with --apply to write.)");
    return;
  }

  const id = (current as { _id: string })._id;
  const existingBrand = (current as { brand?: Record<string, unknown> }).brand ?? {};
  await sanityWrite
    .patch(id)
    .set({
      homeIntroHeading: INTRO_HEADING,
      homeIntroBody: INTRO_BODY,
      // Merge colors into any existing brand object (keeps fonts/logo/favicon).
      brand: { ...existingBrand, ...BRAND_COLORS },
    })
    .commit();

  console.log("Done. Refresh the homepage to see the new intro + palette.");
}

main().catch((err) => {
  console.error("Set homepage content failed:");
  console.error(err);
  process.exit(1);
});
