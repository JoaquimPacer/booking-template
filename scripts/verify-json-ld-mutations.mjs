// Offline negative controls for the rendered JSON-LD fixture. Each mutant of
// src/lib/json-ld.ts is written to a temporary directory, and a generated
// vitest config aliases the component's "../lib/json-ld" import to it, so the
// real source is never written, even if the run is killed. Never reads
// environment files or contacts a service.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

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
  ["ampersand", "\\u0026", "&"],
];
const expectGaps = process.argv.includes("--expect-gaps");

// A hard kill (SIGKILL, a closed terminal) skips cleanUp and strands a temp
// directory. Remove only this runner's json-ld-mutants-* directories, and only
// those untouched for ten minutes, so a run still in progress keeps its own.
const STALE_MS = 10 * 60_000;
for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith("json-ld-mutants-")) continue;
  const stale = join(tmpdir(), entry.name);
  try {
    if (Date.now() - statSync(stale).mtimeMs > STALE_MS) rmSync(stale, { recursive: true, force: true, maxRetries: 10 });
  } catch {
    // Another run removed it first, or it is still locked; the next run retries.
  }
}

const workDir = mkdtempSync(join(tmpdir(), "json-ld-mutants-"));
const mutantPath = join(workDir, "json-ld.ts");
const configPath = join(workDir, "vitest.mutants.config.mjs");
writeFileSync(configPath, [
  `import base from ${JSON.stringify(pathToFileURL(resolve(root, "vitest.config.ts")).href)};`,
  "export default {",
  "  ...base,",
  `  resolve: { ...base.resolve, alias: { "../lib/json-ld": ${JSON.stringify(mutantPath.replaceAll("\\", "/"))} } },`,
  "};",
  "",
].join("\n"));

let child;
// Nothing here writes src/. On an interrupt, stop the test process and remove
// the temporary directory before exiting. The serializer is never written
// back: a change during the run can only be someone else's save.
function cleanUp() {
  child?.kill();
  rmSync(workDir, { recursive: true, force: true, maxRetries: 10 });
}
for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => {
    cleanUp();
    process.exit(code);
  });
}

function runSuite() {
  return new Promise((resolveRun, rejectRun) => {
    let stdout = "";
    child = spawn(process.execPath, [
      resolve(root, "node_modules/vitest/vitest.mjs"), "run",
      "src/components/json-ld.test.ts", "--reporter=json", "--root", root, "--config", configPath,
    ], { cwd: root, stdio: ["ignore", "pipe", "ignore"] });
    const timer = setTimeout(() => child?.kill(), 60_000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.on("error", () => rejectRun(new Error("Mutation test process did not start.")));
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      child = undefined;
      if (signal || ![0, 1].includes(status)) rejectRun(new Error("Mutation test process did not complete."));
      else resolveRun({ status, stdout });
    });
  });
}

let valid = true;
try {
  for (const [label, escaped, raw] of mutations) {
    writeFileSync(mutantPath, source.replace(ending,
      `\n  ).replaceAll(${JSON.stringify(escaped)}, ${JSON.stringify(raw)});\n}`));
    const result = await runSuite();
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
  // Clean up before reading the source, so a source deleted mid-run cannot
  // strand the temporary directory.
  cleanUp();
  const untouched = existsSync(sourcePath) && readFileSync(sourcePath).equals(original);
  if (!untouched) throw new Error("src/lib/json-ld.ts changed during the run; the runner left it untouched.");
}

console.log(`Source untouched; mutation expectations ${valid ? "passed" : "failed"}.`);
process.exitCode = valid ? 0 : 1;
