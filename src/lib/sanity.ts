import { createClient } from "@sanity/client";

export const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const sanityApiVersion = "2025-01-01";

export const sanity = createClient({
  projectId: sanityProjectId ?? "placeholder",
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  // Never the CDN: a publish-webhook regeneration that reads through it can bake
  // the pre-publish content for a full ISR window (fleet sweep, 2026-08-22).
  // ISR is the cache. Guarded by sanity.test.ts.
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
  // With a token, the default ("raw") perspective returns DRAFTS alongside
  // published docs, so unpublished Studio edits would render on the live site
  // (bit marley-art 2026-07-20). Published-only keeps drafts private.
  perspective: "published",
});
