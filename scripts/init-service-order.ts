/* eslint-disable no-console */
// scripts/init-service-order.ts
//
// Gives every Service an initial drag-order rank. Needed once because the
// services were seeded BEFORE the drag-to-reorder field existed, so Studio shows
// "12/12 documents have no order" and dragging doesn't work yet. This assigns a
// starting rank to each (current display order), after which dragging in Studio
// just works.
//
// USAGE:
//   npx tsx scripts/init-service-order.ts            # dry-run (prints the plan)
//   npx tsx scripts/init-service-order.ts --apply    # write the ranks
//
// Idempotent and safe: by default it only sets a rank on docs that DON'T already
// have one (so it won't clobber an order you've since set by dragging). Pass
// --force to re-rank everything by the legacy `order` field.

import "dotenv/config";
import { groq } from "next-sanity";
import { orderRankHelpers } from "@sanity/orderable-document-list";

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

  const rows = await sanityWrite.fetch<Row[]>(
    groq`*[_type == "service"]{ _id, title, order, orderRank } | order(order asc, title asc)`,
  );

  const targets = force ? rows : rows.filter((r) => !r.orderRank);
  const { getRankString } = orderRankHelpers("service");

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Services: ${rows.length}; needing a rank: ${targets.length} (force=${force})`);
  console.log("");

  // Assign ranks across ALL rows in display order, so the relative order is
  // stable even when only some need a value.
  const plan = rows.map((r, i) => ({ id: r._id, title: r.title, rank: getRankString(i) }));
  for (const p of plan) {
    const willWrite = force || targets.some((t) => t._id === p.id);
    console.log(`  ${willWrite ? "SET " : "keep"} ${p.title?.padEnd(40) ?? p.id}  ${p.rank}`);
  }
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to write.)");
    return;
  }

  for (const p of plan) {
    const willWrite = force || targets.some((t) => t._id === p.id);
    if (!willWrite) continue;
    await sanityWrite.patch(p.id).set({ orderRank: p.rank }).commit();
    console.log(`Set ${p.id}`);
  }
  console.log("");
  console.log("Done. In Studio > Services you can now drag to reorder.");
}

main().catch((err) => {
  console.error("Init order failed:");
  console.error(err);
  process.exit(1);
});
