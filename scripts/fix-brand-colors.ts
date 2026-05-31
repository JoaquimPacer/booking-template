/* eslint-disable no-console */
// scripts/fix-brand-colors.ts
//
// Repairs the brand color swatches in Sanity. An earlier script wrote partial
// color objects ({ _type, hex } only), which the @sanity/color-input picker
// can't render, so the color fields appeared blank/uneditable. This rewrites
// them as COMPLETE color-input values (hex + alpha + hsl/hsv/rgb) so the picker
// works again and the colors stay fully editable.
//
// USAGE:
//   npx tsx scripts/fix-brand-colors.ts            # dry-run (prints the plan)
//   npx tsx scripts/fix-brand-colors.ts --apply    # write to Sanity
//
// SAFE / REVERSIBLE: backs up the current siteSettings doc first. Only the five
// brand color fields are touched; fonts, logo, favicon, and everything else are
// preserved.

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { groq } from "next-sanity";
import { colorFromHex } from "./lib/sanity-color";

// The professional default palette (same hexes as the code defaults).
const PALETTE: Record<string, string> = {
  primaryColor: "#4f6b5d", // muted sage green
  secondaryColor: "#e6e0d6", // soft sand
  accentColor: "#b08d57", // warm gold
  backgroundColor: "#f7f4ef", // warm cream
  foregroundColor: "#33302b", // warm charcoal
};

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  const current = await sanityWrite.fetch<{ _id: string; brand?: Record<string, unknown> } | null>(
    groq`*[_type == "siteSettings"][0]`,
  );
  if (!current) {
    console.error("No siteSettings document found.");
    process.exit(1);
  }

  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `backups/site-settings-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify(current, null, 2));

  // Build complete color objects for each field.
  const colorFields = Object.fromEntries(
    Object.entries(PALETTE).map(([field, hex]) => [field, colorFromHex(hex)]),
  );

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Backup:  ${backupPath}`);
  console.log("");
  console.log("Will rewrite these brand colors as complete picker values:");
  for (const [field, hex] of Object.entries(PALETTE)) console.log(`  ${field.padEnd(16)} ${hex}`);
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Backup written. Re-run with --apply to write.)");
    return;
  }

  const existingBrand = current.brand ?? {};
  await sanityWrite
    .patch(current._id)
    .set({ brand: { ...existingBrand, ...colorFields } })
    .commit();

  console.log("Done. Refresh Studio > Look & feel; the color swatches are back and editable.");
}

main().catch((err) => {
  console.error("Fix brand colors failed:");
  console.error(err);
  process.exit(1);
});
