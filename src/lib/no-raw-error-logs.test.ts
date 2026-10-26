// WHY this guard exists: scripts get copied from fork to fork, and every one of
// them once ended with `console.error(err)`. A Sanity client error from a
// network failure carries the request and its Authorization header, so that
// one line prints the write token (see src/lib/redact.test.ts). This test
// fails if any console call in scripts/ or src/ hands over a bare caught
// error again. Wrap it: console.error("...", safeError(err)).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";

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

// Check the caught value before it can be interpolated or assigned into a
// later log payload. Looking only for console.error(err) misses both paths.
function unsafeCaughtReferences(text: string): number[] {
  const source = ts.createSourceFile("audit.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: number[] = [];
  function inspect(body: ts.Node, name: string) {
    function visit(node: ts.Node) {
      if (ts.isIdentifier(node) && node.text === name) {
        const parent = node.parent;
        const safe = ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) &&
          parent.expression.text === "safeError" && parent.arguments.length === 1 && parent.arguments[0] === node;
        // Local classification does not forward the value. Booking recovery
        // compares a known message before returning its own fixed wording.
        const typeCheck = ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
          ts.isIdentifier(parent.right) && parent.right.text === "Error";
        const comparison = ts.isPropertyAccessExpression(parent) && parent.name.text === "message" ? parent.parent : undefined;
        const messageCheck = comparison && ts.isBinaryExpression(comparison) &&
          comparison.left === parent && ts.isStringLiteral(comparison.right) &&
          [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(comparison.operatorToken.kind);
        if (!safe && !typeCheck && !messageCheck) hits.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
      }
      ts.forEachChild(node, visit);
    }
    visit(body);
  }
  function find(node: ts.Node) {
    if (ts.isCatchClause(node) && node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
      inspect(node.block, node.variableDeclaration.name.text);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "catch") {
      const handler = node.arguments[0];
      if (handler && (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler))) {
        const binding = handler.parameters[0]?.name;
        if (binding && ts.isIdentifier(binding)) inspect(handler.body, binding.text);
      }
    }
    ts.forEachChild(node, find);
  }
  find(source);
  return hits;
}

describe("error logging", () => {
  it("never hands a raw caught error to console in scripts/ or src/", () => {
    expect(rawErrorLogs()).toEqual([]);
  });

  it("routes caught values through safeError before forwarding them", () => {
    const hits = ROOTS.flatMap((root) => files(join(ROOT, root))).flatMap((file) =>
      unsafeCaughtReferences(readFileSync(file, "utf8")).map((line) => `${relative(ROOT, file)}:${line}`));
    expect(hits).toEqual([]);
  });

  it.each([
    'try {} catch (caught) { console.error(caught); }',
    'try {} catch (caught) { console.warn(`${caught.message}`); }',
    'try {} catch (caught) { out.error = caught.message; } console.log(JSON.stringify(out));',
    'task.catch((caught) => logger.warn(caught.request));',
    'task.catch(async (caught) => log(caught.message));',
  ])("detects unsafe caught-value flow %#", (code) => {
    expect(unsafeCaughtReferences(code).length).toBeGreaterThan(0);
  });

  it("allows sanitized logs and silent recovery", () => {
    expect(unsafeCaughtReferences('try {} catch (caught) { logger.warn(safeError(caught)); } task.catch(() => false);')).toEqual([]);
  });

  it("allows local classification without forwarding provider text", () => {
    expect(unsafeCaughtReferences('try {} catch (caught) { if (caught instanceof Error && caught.message === "SLOT_TAKEN") return false; logger.warn(safeError(caught)); }')).toEqual([]);
  });
});
