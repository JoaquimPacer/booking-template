// Sanity CLI config so `npx sanity dataset ...` and friends work.
// Project/dataset come from the environment on purpose (no defaults): pass
// them explicitly, e.g.
//   NEXT_PUBLIC_SANITY_PROJECT_ID=<id> npx sanity dataset list
// so CLI operations never silently target a client project from .env.
import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  },
});
