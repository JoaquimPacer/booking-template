import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemas";

// `@sanity/vision` (GROQ query playground) is intentionally omitted in Phase 0.
// Add it during Phase 1 if useful: `npm install @sanity/vision`, then add `visionTool()` to plugins.

export default defineConfig({
  name: "default",
  title: "Booking Template",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath: "/studio",
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
