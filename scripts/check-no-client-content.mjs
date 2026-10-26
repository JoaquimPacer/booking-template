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
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

/**
 * Whole trees whose contents ship to a visitor or appear in Studio. Deliberately
 * coarse: an earlier hand-listed set of subdirectories named `src/content`, which
 * does not exist in this repo but does in forks, and the missing root was silently
 * skipped. Scanning `src` entirely is robust to layout changes and catches more.
 */
const SCANNED = ["src", "sanity"];

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
  // Industry-specific leftovers an independent review found after the first pass:
  // a named third-party scheduler, a modality, and clinical vocabulary.
  // NOTE: "treatment" was tried and removed; it false-positives on design
  // vocabulary like "section treatment". Keep terms narrow enough to stay useful.
  "janeapp",
  "deep tissue",
  "\\bpatients?\\b",
];

const PATTERN = new RegExp(`(${DENYLIST.join("|")})`, "i");

function walk(dir, out = []) {
  // Fail loudly. Swallowing a missing directory made the whole check silently
  // pass when run from the wrong place, which is worse than no check at all.
  const entries = readdirSync(dir);
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|json|md|css)$/.test(name)) out.push(full);
  }
  return out;
}

const hits = [];
for (const root of SCANNED) {
  const abs = join(ROOT, root);
  if (!existsSync(abs)) {
    console.error(`check-no-client-content: scanned root missing: ${root}. Run from the repo root.`);
    process.exit(2);
  }
  for (const file of walk(abs)) {
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
 *   scripts/ is not scanned. The six pure client one-offs (seed-theresa-services,
 *   set-oncology-cancellation, set-tmj-content, check-jane-links,
 *   set-booking-links, restore-sanity-services) were deleted on 2026-10-19; byte-
 *   identical copies live in the theresa-attea-lmt fork. Generic seed scripts
 *   (seed-faqs, seed-pages, set-homepage-content and others) still carry sample
 *   copy from that client and are the next candidates for neutral sample data.
 */
