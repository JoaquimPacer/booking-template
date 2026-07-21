import { createClient } from "@sanity/client";

export const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const sanityApiVersion = "2025-01-01";

export const sanity = createClient({
  projectId: sanityProjectId ?? "placeholder",
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  useCdn: process.env.NODE_ENV === "production",
  token: process.env.SANITY_API_READ_TOKEN,
  // With a token, the default ("raw") perspective returns DRAFTS alongside
  // published docs, so unpublished Studio edits would render on the live site
  // (bit marley-art 2026-07-20). Published-only keeps drafts private.
  perspective: "published",
});
