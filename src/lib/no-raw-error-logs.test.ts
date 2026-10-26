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
//
// A caught value arrives through more doors than catch (x): a destructured
// catch, a .catch or .then rejection handler (inline or passed by name), a
// process error listener, an allSettled reason and a provider's { error }
// result. Each is checked the same way. A destructured catch or handler
// parameter always fails, because its pieces (message, cause, config) are the
// provider text safeError exists to drop.
const ERROR_EVENTS = new Set(["error", "uncaughtException", "uncaughtExceptionMonitor", "unhandledRejection"]);
const LISTENERS = new Set(["on", "once", "addListener", "prependListener", "prependOnceListener"]);

function unsafeCaughtReferences(text: string): number[] {
  const source = ts.createSourceFile("audit.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: number[] = [];
  const settles = text.includes("allSettled");
  const hit = (node: ts.Node) => hits.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);

  // A caught value may be wrapped by safeError, type-checked, compared to a
  // known message, or tested for presence. Anything else forwards it.
  function forwarded(value: ts.Expression): boolean {
    const parent = value.parent;
    const safe = ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) &&
      parent.expression.text === "safeError" && parent.arguments.length === 1 && parent.arguments[0] === value;
    // Local classification does not forward the value. Booking recovery
    // compares a known message before returning its own fixed wording.
    const typeCheck = ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
      parent.left === value && ts.isIdentifier(parent.right) && parent.right.text === "Error";
    const comparison = ts.isPropertyAccessExpression(parent) && parent.name.text === "message" ? parent.parent : undefined;
    const messageCheck = comparison && ts.isBinaryExpression(comparison) &&
      comparison.left === parent && ts.isStringLiteral(comparison.right) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(comparison.operatorToken.kind);
    const presence = (ts.isIfStatement(parent) && parent.expression === value) ||
      (ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken);
    return !safe && !typeCheck && !messageCheck && !presence;
  }

  // Property names (x.error, { error: "..." }) share the text but are not the value.
  function isReference(node: ts.Identifier): boolean {
    const parent = node.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
    if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent)) && parent.name === node) return false;
    if (ts.isBindingElement(parent) && (parent.propertyName === node || parent.name === node)) return false;
    return true;
  }

  function inspect(scope: ts.Node, name: string) {
    function visit(node: ts.Node) {
      if (ts.isIdentifier(node) && node.text === name && isReference(node) && forwarded(node)) hit(node);
      ts.forEachChild(node, visit);
    }
    visit(scope);
  }

  // The first parameter of a rejection handler receives the caught value.
  function inspectHandler(handler: ts.FunctionLikeDeclaration) {
    const binding = handler.parameters[0]?.name;
    if (!binding || !handler.body) return;
    if (ts.isIdentifier(binding)) inspect(handler.body, binding.text);
    else hit(binding);
  }

  // A handler passed by name is audited where it is declared. One defined in
  // another module cannot be audited here, so it fails.
  function inspectNamedHandler(reference: ts.Identifier) {
    const declarations: ts.FunctionLikeDeclaration[] = [];
    function collect(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === reference.text) declarations.push(node);
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === reference.text &&
        node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
        declarations.push(node.initializer);
      }
      ts.forEachChild(node, collect);
    }
    collect(source);
    if (declarations.length === 0) hit(reference);
    for (const declaration of declarations) inspectHandler(declaration);
  }

  function rejectionHandler(call: ts.CallExpression): ts.Expression | undefined {
    if (!ts.isPropertyAccessExpression(call.expression)) return undefined;
    const method = call.expression.name.text;
    if (method === "catch") return call.arguments[0];
    if (method === "then") return call.arguments[1];
    const event = call.arguments[0];
    if (LISTENERS.has(method) && event && ts.isStringLiteralLike(event) && ERROR_EVENTS.has(event.text)) {
      return call.arguments[1];
    }
    return undefined;
  }

  function find(node: ts.Node) {
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      const binding = node.variableDeclaration.name;
      if (ts.isIdentifier(binding)) inspect(node.block, binding.text);
      else hit(binding);
    }
    if (ts.isCallExpression(node)) {
      const handler = rejectionHandler(node);
      if (handler && (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler))) inspectHandler(handler);
      else if (handler && ts.isIdentifier(handler)) inspectNamedHandler(handler);
      else if (handler) hit(handler);
    }
    // A provider result's { error } (Resend, for one) is a caught value too.
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      let scope: ts.Node = node.parent;
      while (!ts.isBlock(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
      for (const element of node.name.elements) {
        const property = element.propertyName ?? element.name;
        if (ts.isIdentifier(property) && property.text === "error") {
          if (ts.isIdentifier(element.name)) inspect(scope, element.name.text);
          else hit(element);
        }
      }
    }
    // A rejected allSettled result carries the raw reason.
    if (settles && ts.isPropertyAccessExpression(node) && node.name.text === "reason" && forwarded(node)) hit(node);
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

  // Seven shapes the first version of this guard let through. Each one hands a
  // caught or rejected value to a log without safeError.
  it.each([
    ["a destructured catch", 'try { run(); } catch ({ message }) { logger.error(message); }'],
    ["a destructured .catch parameter", 'task.catch(({ message }) => logger.warn(message));'],
    ["a .then rejection handler", 'task.then(done, (caught) => logger.warn(caught.message));'],
    ["a process error listener", 'process.on("unhandledRejection", (reason) => logger.error(reason));'],
    ["an allSettled reason", 'const results = await Promise.allSettled(tasks); for (const result of results) if (result.status === "rejected") logger.warn(result.reason);'],
    ["a provider { error } result", 'const { error } = await resend.emails.send(message); if (error) logger.error("send failed", error);'],
    ["a handler passed by reference", 'function report(caught) { logger.warn(caught.message); } task.catch(report);'],
  ])("detects %s", (_shape, code) => {
    expect(unsafeCaughtReferences(code).length).toBeGreaterThan(0);
  });

  it("allows the same shapes when every value goes through safeError", () => {
    expect(unsafeCaughtReferences([
      'task.then(done, (caught) => logger.warn(safeError(caught)));',
      'process.on("unhandledRejection", (reason) => logger.error(safeError(reason)));',
      'const results = await Promise.allSettled(tasks); for (const result of results) if (result.status === "rejected") logger.warn(safeError(result.reason));',
      'const { error } = await resend.emails.send(message); if (error) logger.error("send failed", safeError(error)); const reply = { error: "Send failed" };',
      'function report(caught) { logger.warn(safeError(caught)); } task.catch(report);',
    ].join("\n"))).toEqual([]);
  });

  it("allows sanitized logs and silent recovery", () => {
    expect(unsafeCaughtReferences('try {} catch (caught) { logger.warn(safeError(caught)); } task.catch(() => false);')).toEqual([]);
  });

  it("allows local classification without forwarding provider text", () => {
    expect(unsafeCaughtReferences('try {} catch (caught) { if (caught instanceof Error && caught.message === "SLOT_TAKEN") return false; logger.warn(safeError(caught)); }')).toEqual([]);
  });
});
