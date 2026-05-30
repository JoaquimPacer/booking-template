/* eslint-disable no-console */
// scripts/fix-service-order.ts
//
// One-time fix: gives every Service a valid drag-order rank. The 12 services
// were created BEFORE the drag-to-reorder field existed, so Sanity Studio shows
// "12/12 documents have no order" and the console logs
// "[orderable-document-list] Invalid orderRank value (expected string): null".
// This assigns evenly-spaced ranks (in the current display order), after which
// dragging to reorder in Studio just works.
//
// USAGE:
//   npx tsx scripts/fix-service-order.ts            # dry-run (prints the plan)
//   npx tsx scripts/fix-service-order.ts --apply    # write the ranks
//
// SAFE / REVERSIBLE:
//   - Backs up the current { _id, order, orderRank } of every service to
//     backups/service-order-<timestamp>.json before writing.
//   - By default only sets a rank on docs that DON'T already have one, so it
//     won't overwrite an order you've since set by dragging. Pass --force to
//     re-rank everything by the legacy `order` field.

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { groq } from "next-sanity";
import { LexoRank } from "lexorank";
import { generateOrderRanks } from "../src/lib/order-rank";

// A stored rank is only usable if the plugin can LexoRank.parse() it. Earlier
// versions of this script wrote base-36 strings that are NOT valid LexoRank, so
// we treat those as needing a fix too (not just missing values).
function isValidRank(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  try {
    LexoRank.parse(value);
    return true;
  } catch {
    return false;
  }
}

interface Row {
  _id: string;
  title?: string;
  order?: number;
  orderRank?: string;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  // Published docs only (ignore drafts.*); sort by current display order.
  const rows = await sanityWrite.fetch<Row[]>(
    groq`*[_type == "service" && !(_id in path("drafts.**"))]{ _id, title, order, orderRank } | order(order asc, title asc)`,
  );

  // Back up current order state first.
  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `backups/service-order-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify(rows, null, 2));

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Services: ${rows.length}  (force=${force})`);
  console.log(`Backup:   ${backupPath}`);
  console.log("");

  const total = rows.length;
  const orderRanks = generateOrderRanks(total);
  let willWrite = 0;
  const plan = rows.map((r, i) => {
    const rank = orderRanks[i];
    // Fix docs that are missing a rank OR have an invalid (unparseable) one.
    const needs = force || !isValidRank(r.orderRank);
    if (needs) willWrite++;
    return { ...r, rank, needs };
  });

  for (const p of plan) {
    console.log(
      `  ${p.needs ? "SET " : "keep"} ${(p.title ?? p._id).padEnd(42)} ${p.orderRank ?? "(none)"} -> ${p.needs ? p.rank : "(unchanged)"}`,
    );
  }
  console.log("");
  console.log(`Will update ${willWrite} of ${total}.`);

  if (!apply) {
    console.log("");
    console.log("(Dry-run. Backup written above. Re-run with --apply to write.)");
    return;
  }

  for (const p of plan) {
    if (!p.needs) continue;
    await sanityWrite.patch(p._id).set({ orderRank: p.rank }).commit();
    console.log(`Set ${p._id}`);
  }
  console.log("");
  console.log("Done. In Studio > Services the warning is gone and you can drag to reorder.");
}

main().catch((err) => {
  console.error("Fix order failed:");
  console.error(err);
  process.exit(1);
});
