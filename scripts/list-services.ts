/* eslint-disable no-console */
// scripts/list-services.ts
//
// Read-only: prints every service doc in the configured Sanity project, sorted
// by display order. Handy for verifying a seed run. No writes, no --apply.
//
// USAGE: npx tsx scripts/list-services.ts

import "dotenv/config";
import { groq } from "next-sanity";

interface Row {
  _id: string;
  title?: string;
  slug?: { current?: string };
  durationMinutes?: number;
  priceCents?: number;
  order?: number;
  isActive?: boolean;
}

async function main() {
  const { sanity } = await import("../src/lib/sanity");
  const rows = await sanity.fetch<Row[]>(
    groq`*[_type == "service"] | order(order asc, title asc){ _id, title, slug, durationMinutes, priceCents, order, isActive }`,
  );

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID} / ${process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"}`);
  console.log(`${rows.length} service doc(s):`);
  console.log("");
  for (const r of rows) {
    const price = typeof r.priceCents === "number" ? `$${r.priceCents / 100}` : "(no price)";
    const dur = typeof r.durationMinutes === "number" ? `${r.durationMinutes}min` : "(no duration)";
    const active = r.isActive === false ? " [INACTIVE]" : "";
    console.log(`  ${String(r.order ?? "?").padStart(3)}  ${(r.title ?? "(untitled)").padEnd(40)} ${dur.padEnd(8)} ${price.padEnd(8)} /${r.slug?.current ?? "?"}${active}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
