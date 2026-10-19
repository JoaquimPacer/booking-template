// WHY this guard exists: scripts get copied from fork to fork, and every one of
// them once ended with `console.error(err)`. A Sanity client error from a
// network failure carries the request and its Authorization header, so that
// one line prints the write token (see src/lib/redact.test.ts). This test
// fails if any console call in scripts/ or src/ hands over a bare caught
// error again. Wrap it: console.error("...", safeError(err)).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ROOTS = ["scripts", "src"];
const SKIP = new Set(["node_modules", ".next"]);
const CODE = /\.(ts|tsx|mts|mjs|js|cjs)$/;

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else if (CODE.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
}

/** Names a file binds to a caught error, plus the usual ones. */
function caughtNames(text: string): string[] {
  const names = new Set(["err", "e", "error"]);
  for (const m of text.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of text.matchAll(/\.catch\(\s*(?:async\s*)?\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>/g)) names.add(m[1]);
  return [...names];
}

/**
 * The top-level arguments of the first console call on a line, so that
 * console.error("x", err) counts and console.error(scrub("x", err)) does not.
 */
function consoleArgs(line: string): string[] | null {
  const start = line.search(/console\.\w+\(/);
  if (start < 0) return null;
  const args: string[] = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (let i = line.indexOf("(", start) + 1; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = "";
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      if (depth === 0) break;
      depth--;
    } else if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  args.push(current.trim());
  return args;
}

function rawErrorLogs(): string[] {
  const hits: string[] = [];
  for (const root of ROOTS) {
    for (const file of files(join(ROOT, root))) {
      const text = readFileSync(file, "utf8");
      const names = new Set(caughtNames(text));
      text.split(/\r?\n/).forEach((line, i) => {
        if (/^\s*(\/\/|\/\*|\*)/.test(line)) return; // a comment describing the bug is not the bug
        const args = consoleArgs(line);
        if (/\.catch\(\s*console\.\w+\s*\)/.test(line) || args?.some((arg) => names.has(arg))) {
          hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
  return hits;
}

describe("error logging", () => {
  it("never hands a raw caught error to console in scripts/ or src/", () => {
    expect(rawErrorLogs()).toEqual([]);
  });
});
