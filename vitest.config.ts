import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pure-logic unit tests (timezone math, availability engine). Node environment;
// no DOM, no Next.js pipeline. Component/integration tests can add their own
// environment later.
export default defineConfig({
  resolve: {
    // The components under test import through the "@/" alias that tsconfig
    // defines for Next. Vitest does not read tsconfig paths, so it is repeated
    // here; the two must stay in step.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
