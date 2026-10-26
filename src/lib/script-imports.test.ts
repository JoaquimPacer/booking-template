// WHY this guard exists: npm runs the .mjs and .cjs files in scripts/ under
// plain Node during a build (postbuild) and an install. Plain Node cannot load
// a .ts module unless type stripping is on, and where it is on, every run adds
// a warning to the build log. A static import loads before any early exit in
// the script, so a single .ts import breaks or pollutes every build, previews
// included. This test fails if any .mjs or .cjs under scripts/ loads a
// TypeScript file. Inline what such a script needs instead.

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PLAIN_NODE = /\.(mjs|cjs)$/;
const PLAIN_JS = /\.(mjs|cjs|js)$/;
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

/** The path part of a specifier, without a ?query or #fragment. A leading # is a subpath import. */
function bare(specifier: string): string {
  return specifier.slice(0, 1) + specifier.slice(1).split(/[?#]/)[0];
}

/**
 * True when a specifier loads TypeScript, written with or without its
 * extension, directly or through a relative .mjs, .cjs or .js file. A name
 * without an extension is also tried the way require looks it up: with .js
 * (or .mjs, .cjs) added, then as a folder's index file.
 */
function loadsTypeScript(file: string, specifier: string, seen: Set<string>): boolean {
  const path = bare(specifier);
  if (TYPESCRIPT.test(path)) return true;
  if (!path.startsWith(".")) return false;
  const target = resolve(dirname(file), path);
  if (existsSync(target) && statSync(target).isFile()) return followsToTypeScript(target, seen);
  if ([".ts", ".tsx", ".mts", ".cts", "/index.ts", "/index.tsx"].some((ending) => existsSync(target + ending))) return true;
  return [".js", ".mjs", ".cjs", "/index.js", "/index.mjs", "/index.cjs"].map((ending) => resolve(target + ending))
    .some((candidate) => existsSync(candidate) && statSync(candidate).isFile() && followsToTypeScript(candidate, seen));
}

/** True when a plain JavaScript file, not yet visited, loads TypeScript. */
function followsToTypeScript(target: string, seen: Set<string>): boolean {
  if (!PLAIN_JS.test(target) || seen.has(target)) return false;
  seen.add(target);
  return typeScriptImports(target, readFileSync(target, "utf8"), seen).length > 0;
}

/**
 * The literal pieces of a name joined with + or a template: "./leaf" + ".ts".
 * A joined name with no piece ending in a TypeScript extension (dir + name)
 * cannot be resolved here, and flagging every joined path would flag ordinary
 * file reads, so it passes. import() and require() fail on any such name.
 */
function literalPieces(node: ts.Expression): string[] {
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isParenthesizedExpression(node)) return literalPieces(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return [...literalPieces(node.left), ...literalPieces(node.right)];
  }
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
  return [];
}

/**
 * Lines that load TypeScript: static imports, re-exports, import(), require()
 * and any other call or new expression whose first argument is a TypeScript
 * literal or a joined name with a TypeScript piece. A console call only prints
 * its text. A specifier for import() or require() that is not a string literal
 * cannot be checked, so it counts as a hit too.
 */
function typeScriptImports(file: string, text: string, seen = new Set([resolve(file)])): number[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const hits: number[] = [];
  function visit(node: ts.Node) {
    let target: ts.Expression | undefined;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      target = node.moduleSpecifier;
    } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const first = node.arguments?.[0];
      const consoleCall = ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "console";
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) target = first;
      // createRequire's require, module.register, new URL (for new Worker) or a
      // wrapper loads a literal .ts path too.
      else if (first && !consoleCall && literalPieces(first).some((piece) => TYPESCRIPT.test(bare(piece)))) target = first;
    }
    if (target && (!ts.isStringLiteralLike(target) || loadsTypeScript(file, target.text, seen))) {
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
    'const { safeError } = load("../src/lib/redact.ts");',
    'import { safeError } from "../src/lib/redact.ts?raw";',
    'import { safeError } from "../src/lib/redact.ts#hash";',
    'import { safeError } from "../src/lib/redact?raw";',
    'new Worker(new URL("../src/lib/redact.ts", import.meta.url));',
    'const { safeError } = load("../src/lib/" + "redact.ts");',
    'const { safeError } = load(`../src/lib/${name}.ts`);',
  ])("detects %s", (code) => {
    expect(typeScriptImports(fixture, code)).toEqual([1]);
  });

  it("follows relative .mjs, .cjs and .js imports to a TypeScript file", () => {
    const dir = mkdtempSync(join(tmpdir(), "script-imports-"));
    const scan = (name: string) => typeScriptImports(join(dir, name), readFileSync(join(dir, name), "utf8"));
    try {
      writeFileSync(join(dir, "leaf.ts"), "export const leaf = 1;\n");
      writeFileSync(join(dir, "middle.js"), 'export * from "./leaf.ts";\n');
      writeFileSync(join(dir, "entry.mjs"), 'import "./middle.js";\n');
      writeFileSync(join(dir, "hop.cjs"), 'require("./leaf.ts");\n');
      writeFileSync(join(dir, "other.mjs"), 'import "node:fs";\nimport "./hop.cjs";\n');
      writeFileSync(join(dir, "plain.js"), 'import "./clean.mjs";\n');
      writeFileSync(join(dir, "clean.mjs"), 'import "./plain.js";\n');
      expect([scan("entry.mjs"), scan("other.mjs"), scan("clean.mjs")]).toEqual([[1], [2], []]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("follows an extensionless require and a folder's index.js to a TypeScript file", () => {
    const dir = mkdtempSync(join(tmpdir(), "script-imports-"));
    const scan = (name: string) => typeScriptImports(join(dir, name), readFileSync(join(dir, name), "utf8"));
    try {
      mkdirSync(join(dir, "pkg"));
      mkdirSync(join(dir, "cleanpkg"));
      writeFileSync(join(dir, "leaf.ts"), "export const leaf = 1;\n");
      writeFileSync(join(dir, "middle.js"), 'require("./leaf.ts");\n');
      writeFileSync(join(dir, "pkg", "index.js"), 'require("../leaf.ts");\n');
      writeFileSync(join(dir, "plain.js"), 'require("node:fs");\n');
      writeFileSync(join(dir, "cleanpkg", "index.js"), 'require("node:fs");\n');
      writeFileSync(join(dir, "noext.cjs"), 'require("./middle");\n');
      writeFileSync(join(dir, "folder.cjs"), 'require("./pkg");\n');
      writeFileSync(join(dir, "clean.cjs"), 'require("./plain");\nrequire("./cleanpkg");\n');
      expect([scan("noext.cjs"), scan("folder.cjs"), scan("clean.cjs")]).toEqual([[1], [1], []]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // A message that names a .ts file loads nothing, and a joined name with no
  // TypeScript piece cannot be resolved (see literalPieces).
  it("allows a console message naming a .ts file and an unresolvable joined name", () => {
    expect(typeScriptImports(fixture, [
      'console.warn("skipping src/lib/json-ld.ts");',
      'const data = readFileSync(dir + name, "utf8");',
    ].join("\n"))).toEqual([]);
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
