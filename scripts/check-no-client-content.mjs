#!/usr/bin/env node
/**
 * Fails the build if a specific client's identity appears in shipping code.
 *
 * WHY THIS EXISTS
 * On 2026-08-04 a fork of this template built for a dance company shipped to a
 * live public URL with a DIFFERENT client's name on three pages: "Questions
 * About Your Massage Visit", "Reach Theresa Attea, LMT in South Austin", and
 * "Massage Services in South Austin". Nobody typed those into the fork. They
 * were hardcoded FALLBACKS in the template, used whenever Sanity has no page
 * document, and a fresh fork has no Sanity project, so the fallback is exactly
 * what every new client gets by default.
 *
 * The strings were the symptom. The defect was that a template shipped one
 * client's copy as the silent default for the next one. This script makes that
 * class of mistake fail loudly instead of shipping.
 *
 * SCOPE, deliberately narrow so it stays useful rather than noisy:
 *   - Checked: code and schemas that render to a visitor or that the CLIENT
 *     sees inside Sanity Studio.
 *   - Not checked: docs/ (ADRs are an immutable historical record and SHOULD
 *     name the clients involved in a decision) and scripts/ (one-off seed and
 *     migration scripts; tracked separately, see the note at the bottom).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

/** Directories whose contents ship to a visitor or appear in Studio. */
const SCANNED = ["src/app", "src/components", "src/content", "src/lib", "sanity"];

/** Files and directories skipped anywhere under a scanned root. */
const SKIP = new Set(["node_modules", ".next", "dist", "build", "__snapshots__"]);

/**
 * Terms that identify a SPECIFIC prior client or their industry. Add a client's
 * distinguishing words here when their fork ships; keep it to words that could
 * never legitimately appear in a neutral template.
 */
const DENYLIST = [
  "theresa",
  "attea",
  "lymphatic",
  "oncology",
  "craniosacral",
  "south austin",
  "massage",
  "\\bLMT\\b",
];

const PATTERN = new RegExp(`(${DENYLIST.join("|")})`, "i");

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|json|md)$/.test(name)) out.push(full);
  }
  return out;
}

const hits = [];
for (const root of SCANNED) {
  for (const file of walk(join(ROOT, root))) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = line.match(PATTERN);
      if (m) hits.push({ file: relative(ROOT, file), line: i + 1, term: m[1], text: line.trim().slice(0, 110) });
    });
  }
}

if (hits.length === 0) {
  console.log(`check-no-client-content: clean (${SCANNED.length} roots scanned, ${DENYLIST.length} terms)`);
  process.exit(0);
}

console.error(`\ncheck-no-client-content: FAILED with ${hits.length} occurrence(s) of a prior client's identity.\n`);
console.error("This template must not carry any client's name, industry, or copy. A fork inherits");
console.error("these as silent defaults and ships them to the NEXT client. Replace with neutral");
console.error("placeholder text, then re-run.\n");
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  [${h.term}]`);
  console.error(`      ${h.text}`);
}
console.error("");
process.exit(1);

/*
 * KNOWN, OUT OF SCOPE, tracked rather than silently ignored:
 *   scripts/ still contains client-specific one-offs (seed-theresa-services.ts,
 *   set-oncology-cancellation.ts, set-tmj-content.ts, check-jane-links.ts and
 *   others). They never render to a visitor, but they do not belong in a
 *   template either. Deleting them is a judgement call about what history is
 *   worth keeping, so it is carded rather than done here.
 */
