/* eslint-disable no-console */
// scripts/dedup-services.ts
//
// Removes duplicate Service documents in Sanity, keeping the one with the
// most filled fields per slug. Safe-by-default: dry-run unless --apply is passed.
//
// USAGE:
//   npx tsx scripts/dedup-services.ts           # dry-run; shows what would be deleted
//   npx tsx scripts/dedup-services.ts --apply   # actually delete
//
// Requires .env to point at the Sanity project you want to clean up.
// Writes to whatever project NEXT_PUBLIC_SANITY_PROJECT_ID resolves to.

import "dotenv/config";
import { groq } from "next-sanity";

interface ServiceDoc {
  _id: string;
  title?: string;
  slug?: { current?: string };
  tagline?: string;
  description?: string;
  body?: unknown;
  heroImage?: unknown;
  gallery?: unknown[];
  whatToExpect?: unknown;
  durationMinutes?: number;
  priceCents?: number;
  seo?: unknown;
  _createdAt?: string;
  _updatedAt?: string;
}

// Count how many "content" fields are populated. Higher = more informative.
function richnessScore(doc: ServiceDoc): number {
  let score = 0;
  if (doc.tagline && doc.tagline.trim().length > 0) score++;
  if (doc.description && doc.description.trim().length > 0) score++;
  if (doc.body && Array.isArray(doc.body) && doc.body.length > 0) score++;
  if (doc.heroImage) score++;
  if (doc.gallery && doc.gallery.length > 0) score++;
  if (doc.whatToExpect && Array.isArray(doc.whatToExpect) && doc.whatToExpect.length > 0) score++;
  if (typeof doc.durationMinutes === "number") score++;
  if (typeof doc.priceCents === "number") score++;
  if (doc.seo) score++;
  return score;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"}`);
  console.log("");

  // Fetch ALL service docs (drafts + published). The `*` selector returns both.
  const services = await sanityWrite.fetch<ServiceDoc[]>(
    groq`*[_type == "service"] {
      _id, title, slug, tagline, description, body, heroImage, gallery, whatToExpect, durationMinutes, priceCents, seo, _createdAt, _updatedAt
    }`,
  );

  console.log(`Found ${services.length} service docs total.`);
  console.log("");

  // Group by slug.
  const bySlug = new Map<string, ServiceDoc[]>();
  for (const doc of services) {
    const slug = doc.slug?.current ?? "(no-slug)";
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(doc);
  }

  let totalToDelete = 0;
  const toDelete: ServiceDoc[] = [];

  for (const [slug, group] of bySlug) {
    if (group.length === 1) continue; // not a duplicate

    // Sort by richness descending; tie-break by _updatedAt descending (newest first).
    const sorted = [...group].sort((a, b) => {
      const scoreA = richnessScore(a);
      const scoreB = richnessScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b._updatedAt ?? "").localeCompare(a._updatedAt ?? "");
    });

    const keeper = sorted[0];
    const losers = sorted.slice(1);

    console.log(`Slug "${slug}" has ${group.length} duplicates:`);
    console.log(`  KEEP    ${keeper._id} (score ${richnessScore(keeper)}, title: ${keeper.title ?? "(none)"})`);
    for (const l of losers) {
      console.log(`  DELETE  ${l._id} (score ${richnessScore(l)}, title: ${l.title ?? "(none)"})`);
      toDelete.push(l);
      totalToDelete++;
    }
    console.log("");
  }

  if (totalToDelete === 0) {
    console.log("No duplicates found. All service docs have unique slugs.");
    return;
  }

  console.log(`Total docs to delete: ${totalToDelete}`);

  if (!apply) {
    console.log("");
    console.log("(Dry-run. Re-run with --apply to actually delete the docs above.)");
    return;
  }

  console.log("");
  console.log("Deleting...");

  // Delete drafts first if any (drafts have id prefixed with "drafts.").
  // Sanity's client handles both published and draft deletes.
  for (const doc of toDelete) {
    try {
      await sanityWrite.delete(doc._id);
      console.log(`  Deleted ${doc._id}`);
    } catch (e) {
      console.error(`  Failed to delete ${doc._id}:`, e);
    }
  }

  console.log("");
  console.log("Done. Refresh Sanity Studio; duplicates should be gone.");
}

main().catch((err) => {
  console.error("Dedup failed:");
  console.error(err);
  process.exit(1);
});
