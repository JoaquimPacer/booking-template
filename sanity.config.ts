import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { colorInput } from "@sanity/color-input";
import { schemaTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

// `@sanity/vision` (GROQ query playground) is intentionally omitted in Phase 0.
// Add it during Phase 1 if useful: `npm install @sanity/vision`, then add `visionTool()` to plugins.

export default defineConfig({
  name: "default",
  // Shown in the Studio's top-left. Set NEXT_PUBLIC_STUDIO_TITLE per client deploy
  // (e.g. "Theresa Attea, LMT") so the editor sees the business name, not the
  // generic template label. Falls back to "Booking Template" when unset.
  title: process.env.NEXT_PUBLIC_STUDIO_TITLE ?? "Booking Template",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath: "/studio",
  plugins: [structureTool({ structure }), colorInput()],
  schema: {
    types: schemaTypes,
  },
});
