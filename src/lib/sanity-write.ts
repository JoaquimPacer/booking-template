// Sanity write client. Use ONLY in server-side scripts (scripts/*.ts) and
// API routes. Never import in app/* page components or client components.
//
// Requires the SANITY_API_WRITE_TOKEN env var. Get one at:
//   sanity.io/manage -> Project -> API -> Tokens -> + Add API Token
//   Permissions: Editor (read + write)
//   Save the token immediately; you cannot view it again after navigation.
//
// The read-only client at src/lib/sanity.ts is used for site rendering;
// this client is for programmatic content creation (Phase 1.5 replicate
// script).

import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) {
  throw new Error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Add it to .env before running write operations.",
  );
}

if (!token) {
  throw new Error(
    "SANITY_API_WRITE_TOKEN is not set. Generate one at sanity.io/manage > Project > API > Tokens. Permissions: Editor. Add to .env.",
  );
}

export const sanityWrite = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false, // Always hit the live API for writes.
});
