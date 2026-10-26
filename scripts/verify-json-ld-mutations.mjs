// Offline negative controls for the rendered JSON-LD fixture. Restores source
// bytes after each run; never reads environment files or contacts a service.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourcePath = resolve(root, "src/lib/json-ld.ts");
const original = readFileSync(sourcePath);
const source = original.toString("utf8");
const ending = /\r?\n  \);\r?\n\}/;
if (!ending.test(source)) throw new Error("Serializer return shape changed; review mutations.");

const mutations = [
  ["script-close", "\\u003c/script", "</script"],
  ["comment-open", "\\u003c!--", "<!--"],
  ["comment-close", "--\\u003e", "-->"],
  ["line-separator", "\\u2028", String.fromCharCode(0x2028)],
  ["paragraph-separator", "\\u2029", String.fromCharCode(0x2029)],
];
const expectGaps = process.argv.includes("--expect-gaps");
let valid = true;

try {
  for (const [label, escaped, raw] of mutations) {
    const mutant = source.replace(ending,
      `\n  ).replaceAll(${JSON.stringify(escaped)}, ${JSON.stringify(raw)});\n}`);
    writeFileSync(sourcePath, mutant);
    const result = spawnSync(process.execPath, [
      resolve(root, "node_modules/vitest/vitest.mjs"), "run",
      "src/components/json-ld.test.ts", "--reporter=json",
    ], { cwd: root, encoding: "utf8", timeout: 60_000 });
    writeFileSync(sourcePath, original);
    if (result.error || result.signal || ![0, 1].includes(result.status)) {
      throw new Error("Mutation test process did not complete.");
    }
    const report = JSON.parse(result.stdout);
    if (report.numTotalTests < 5 || report.testResults.some((suite) => !suite.assertionResults.length)) {
      throw new Error("Mutation test suite did not execute normally.");
    }
    const failed = report.testResults.flatMap((suite) => suite.assertionResults)
      .filter((test) => test.status === "failed").map((test) => test.title);
    const expected = expectGaps
      ? (label === "script-close" || label === "comment-open" ? failed.length > 0 : failed.length === 0)
      : failed.length === 1 && failed[0] === `escapes ${label} in the rendered fixture`;
    valid &&= expected;
    console.log(JSON.stringify({ mutation: label, exit: result.status, failed: failed.length, expected }));
  }
} finally {
  writeFileSync(sourcePath, original);
}

if (!readFileSync(sourcePath).equals(original)) throw new Error("Serializer restoration failed.");
console.log(`Source restored; mutation expectations ${valid ? "passed" : "failed"}.`);
process.exitCode = valid ? 0 : 1;
