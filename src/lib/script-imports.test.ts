// WHY this guard exists: npm runs the .mjs and .cjs files in scripts/ under
// plain Node during a build (postbuild) and an install. Plain Node cannot load
// a .ts module unless type stripping is on, and where it is on, every run adds
// a warning to the build log. A static import loads before any early exit in
// the script, so a single .ts import breaks or pollutes every build, previews
// included. This test fails if any .mjs or .cjs under scripts/ loads a
// TypeScript file. Inline what such a script needs instead.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PLAIN_NODE = /\.(mjs|cjs)$/;
const TYPESCRIPT = /\.(ts|tsx|mts|cts)$/;

function plainNodeScripts(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) plainNodeScripts(path, out);
    else if (PLAIN_NODE.test(name)) out.push(path);
  }
  return out;
}

/** True when a specifier loads TypeScript, written with or without its extension. */
function loadsTypeScript(file: string, specifier: string): boolean {
  if (TYPESCRIPT.test(specifier)) return true;
  if (!specifier.startsWith(".")) return false;
  const target = resolve(dirname(file), specifier);
  if (existsSync(target) && statSync(target).isFile()) return false;
  return [".ts", ".tsx", ".mts", ".cts", "/index.ts", "/index.tsx"].some((ending) => existsSync(target + ending));
}

/**
 * Lines that load TypeScript: static imports, re-exports, import() and
 * require(). A specifier that is not a string literal cannot be checked, so it
 * counts as a hit too.
 */
function typeScriptImports(file: string, text: string): number[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const hits: number[] = [];
  function visit(node: ts.Node) {
    let target: ts.Expression | undefined;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      target = node.moduleSpecifier;
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      target = node.arguments[0];
    }
    if (target && (!ts.isStringLiteralLike(target) || loadsTypeScript(file, target.text))) {
      hits.push(source.getLineAndCharacterOfPosition(target.getStart(source)).line + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return hits;
}

describe("scripts that run under plain Node", () => {
  it("never import a TypeScript file", () => {
    const scripts = plainNodeScripts(join(ROOT, "scripts"));
    expect(scripts.length).toBeGreaterThan(0);
    const hits = scripts.flatMap((file) =>
      typeScriptImports(file, readFileSync(file, "utf8")).map((line) => `${relative(ROOT, file)}:${line}`));
    expect(hits).toEqual([]);
  });

  const fixture = join(ROOT, "scripts", "fixture.mjs");

  it.each([
    'import { safeError } from "../src/lib/redact.ts";',
    'import { safeError } from "../src/lib/redact";',
    'export { safeError } from "../src/lib/redact.mts";',
    'const { safeError } = await import("../src/lib/redact.ts");',
    'const { safeError } = require("../src/lib/redact.cts");',
    'const loaded = await import(modulePath);',
  ])("detects %s", (code) => {
    expect(typeScriptImports(fixture, code)).toEqual([1]);
  });

  it("allows Node built-ins, packages and plain JavaScript files", () => {
    expect(typeScriptImports(fixture, [
      'import { readFileSync } from "node:fs";',
      'import ts from "typescript";',
      'import "./check-no-client-content.mjs";',
      'const helper = require("./helper.cjs");',
    ].join("\n"))).toEqual([]);
  });
});
