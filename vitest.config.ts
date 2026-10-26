import { defineConfig } from "vitest/config";

// Pure-logic unit tests (timezone math, availability engine). Node environment;
// no DOM, no Next.js pipeline. Component/integration tests can add their own
// environment later.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
