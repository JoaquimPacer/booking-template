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
// catch, a .catch or .then rejection handler (inline, passed by name or called
// as p["catch"]), a process or window error listener (an event name that is not
// a literal counts as one), window.onerror and window.onunhandledrejection,
// process.setUncaughtExceptionCaptureCallback, a class componentDidCatch, an
// allSettled reason and a provider's error result, whether destructured
// (declaration, for-of, parameter, assignment, rest element) or read as
// result.error or result["error"] (declared or assigned, cast or not, or in a
// .then success handler). In error.tsx and global-error.tsx the error prop,
// destructured or read as props.error, is the caught value too.
// Each is checked the same way. A destructured catch or handler parameter
// always fails, because its pieces (message, cause, config) are the provider
// text safeError exists to drop.
const ERROR_EVENTS = new Set(["error", "uncaughtException", "uncaughtExceptionMonitor", "unhandledRejection", "unhandledrejection"]);
const LISTENERS = new Set(["on", "once", "addListener", "prependListener", "prependOnceListener", "addEventListener"]);
const HOOKS = new Set(["useEffect", "useLayoutEffect", "useCallback", "useMemo"]);
// Handler properties and the parameters that receive the caught value:
// onerror's message and error, onunhandledrejection's event.
const ERROR_PROPERTIES = new Map([["onerror", [0, 4]], ["onunhandledrejection", [0]]]);
// The only calls whose result.error is not audited. Each is our own server
// action and returns fixed wording or a zod validation message, never a
// provider result. A helper that returns a provider result whole
// (return resend.emails.send(message)) must never be added here.
const SAFE_RESULTS = new Set(["createPendingBooking"]);
// Next.js hands the caught value to these files' components as the error prop.
// Anywhere else an error prop is usually form text, as in FieldError({ error }).
const BOUNDARY_FILE = /(^|[\\/])(global-)?error\.[jt]sx?$/;

function unsafeCaughtReferences(text: string, file = ""): number[] {
  const source = ts.createSourceFile("audit.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: number[] = [];
  const settles = text.includes("allSettled");
  const boundary = BOUNDARY_FILE.test(file);
  const hit = (node: ts.Node) => hits.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
  // Allowlisted functions imported by name from our own modules (relative or @/).
  const safeResults = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) ||
      !/^(\.|@\/)/.test(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) {
      if (SAFE_RESULTS.has((element.propertyName ?? element.name).text)) safeResults.add(element.name.text);
    }
  }

  // (await send()) as T is the same awaited call as await send().
  function unwrap(node: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node)) node = node.expression;
    return node;
  }

  // A call to an allowlisted function, awaited or not.
  function allowlisted(node: ts.Expression): boolean {
    let value = unwrap(node);
    if (ts.isAwaitExpression(value)) value = unwrap(value.expression);
    return ts.isCallExpression(value) && ts.isIdentifier(value.expression) && safeResults.has(value.expression.text);
  }

  // An awaited value that may carry a provider's raw error.
  function providerResult(node: ts.Expression | undefined): boolean {
    return !!node && ts.isAwaitExpression(unwrap(node)) && !allowlisted(node);
  }

  // The name in x.name or x["name"].
  function memberName(node: ts.Node): string | undefined {
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text;
    return undefined;
  }

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
    // A hook's dependency list only tells React when to rerun; it forwards nothing.
    const dependency = ts.isArrayLiteralExpression(parent) && ts.isCallExpression(parent.parent) &&
      parent.parent.arguments[1] === parent && ts.isIdentifier(parent.parent.expression) &&
      HOOKS.has(parent.parent.expression.text);
    return !safe && !typeCheck && !messageCheck && !presence && !dependency;
  }

  // In ({ error } = result) the name is being bound, not used.
  function isAssignmentTarget(node: ts.Identifier): boolean {
    const property = node.parent;
    const literal = property.parent;
    const target = (ts.isShorthandPropertyAssignment(property) && property.name === node) ||
      (ts.isPropertyAssignment(property) && property.initializer === node);
    return target && ts.isObjectLiteralExpression(literal) && ts.isBinaryExpression(literal.parent) &&
      literal.parent.left === literal && literal.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
  }

  // Property names (x.error, { error: "..." }) share the text but are not the value.
  function isReference(node: ts.Identifier): boolean {
    const parent = node.parent;
    if (isAssignmentTarget(node)) return false;
    if ((ts.isParameter(parent) || ts.isVariableDeclaration(parent)) && parent.name === node) return false;
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

  // error read off a provider result held in name: name.error or name["error"].
  function inspectErrorReads(scope: ts.Node, name: string) {
    function read(node: ts.Node) {
      if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && memberName(node) === "error" &&
        ts.isIdentifier(node.expression) && node.expression.text === name && forwarded(node)) hit(node);
      ts.forEachChild(node, read);
    }
    read(scope);
  }

  // The first parameter of a rejection handler receives the caught value
  // (onerror's are listed in ERROR_PROPERTIES).
  function inspectHandler(handler: ts.FunctionLikeDeclaration, indices = [0]) {
    if (!handler.body) return;
    for (const index of indices) {
      const binding = handler.parameters[index]?.name;
      if (!binding) continue;
      if (ts.isIdentifier(binding)) inspect(handler.body, binding.text);
      else hit(binding);
    }
  }

  // A handler passed by name is audited where it is declared. One defined in
  // another module cannot be audited here, so it fails.
  function inspectNamedHandler(reference: ts.Identifier, indices = [0]) {
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
    for (const declaration of declarations) inspectHandler(declaration, indices);
  }

  // Audit a handler however it is given. null or undefined installs none.
  function inspectAnyHandler(handler: ts.Expression | undefined, indices = [0]) {
    if (!handler || handler.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(handler) && handler.text === "undefined")) return;
    if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) inspectHandler(handler, indices);
    else if (ts.isIdentifier(handler)) inspectNamedHandler(handler, indices);
    else hit(handler);
  }

  function rejectionHandler(call: ts.CallExpression): ts.Expression | undefined {
    const method = memberName(call.expression);
    if (!method) return undefined;
    if (method === "catch") return call.arguments[0];
    if (method === "then") return call.arguments[1];
    // Node's last-resort hook receives the uncaught error.
    if (method === "setUncaughtExceptionCaptureCallback") return call.arguments[0];
    // An event name that is not a literal could be an error event, so it is audited as one.
    const event = call.arguments[0];
    if (LISTENERS.has(method) && event && (!ts.isStringLiteralLike(event) || ERROR_EVENTS.has(event.text))) {
      return call.arguments[1];
    }
    return undefined;
  }

  // A pattern that pulls error (or, beside allSettled, reason) out of a value
  // exposes the caught value under a local name.
  function exposes(name: ts.Node | undefined, error = true): name is ts.Identifier | ts.StringLiteral {
    return !!name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) &&
      ((error && name.text === "error") || (settles && name.text === "reason"));
  }

  function enclosingBlock(node: ts.Node): ts.Node {
    let scope: ts.Node = node.parent;
    while (!ts.isBlock(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
    return scope;
  }

  // With error false, only an allSettled reason counts.
  function inspectPattern(pattern: ts.ObjectBindingPattern, scope: ts.Node, error = true) {
    for (const element of pattern.elements) {
      // A rest element keeps error along with every other unnamed property.
      if (element.dotDotDotToken) {
        if (error && ts.isIdentifier(element.name)) inspectErrorReads(scope, element.name.text);
        continue;
      }
      if (!exposes(element.propertyName ?? element.name, error)) continue;
      if (ts.isIdentifier(element.name)) inspect(scope, element.name.text);
      else hit(element);
    }
  }

  // A provider result bound to a name or a pattern.
  function inspectResult(binding: ts.BindingName | undefined, scope: ts.Node) {
    if (binding && ts.isIdentifier(binding)) inspectErrorReads(scope, binding.text);
    else if (binding && ts.isObjectBindingPattern(binding)) inspectPattern(binding, scope);
  }

  function find(node: ts.Node) {
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      const binding = node.variableDeclaration.name;
      if (ts.isIdentifier(binding)) inspect(node.block, binding.text);
      else hit(binding);
    }
    if (ts.isCallExpression(node)) {
      inspectAnyHandler(rejectionHandler(node));
      // A .then success handler receives the provider result itself.
      const callee = node.expression;
      const success = memberName(callee) === "then" ? node.arguments[0] : undefined;
      if (success && (ts.isArrowFunction(success) || ts.isFunctionExpression(success)) &&
        (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) && !allowlisted(callee.expression)) {
        inspectResult(success.parameters[0]?.name, success.body);
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const indices = ERROR_PROPERTIES.get(memberName(node.left) ?? "");
      if (indices) inspectAnyHandler(unwrap(node.right), indices);
    }
    // A class error boundary receives the caught value in componentDidCatch.
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "componentDidCatch") inspectHandler(node);
    // A provider result's { error } (Resend, for one) is a caught value too,
    // in a declaration or for-of, a .then success parameter, or an assignment.
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      inspectPattern(node.name, enclosingBlock(node));
    }
    // A parameter pattern counts for an allSettled reason anywhere, and for
    // error only in an error boundary file, where props.error counts as well.
    if (ts.isParameter(node) && "body" in node.parent && node.parent.body) {
      if (ts.isObjectBindingPattern(node.name)) inspectPattern(node.name, node.parent.body, boundary);
      else if (boundary && ts.isIdentifier(node.name)) inspectErrorReads(node.parent.body, node.name.text);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isObjectLiteralExpression(node.left)) {
      for (const property of node.left.properties) {
        if (ts.isShorthandPropertyAssignment(property) && exposes(property.name)) {
          inspect(enclosingBlock(node), property.name.text);
        } else if (ts.isPropertyAssignment(property) && exposes(property.name)) {
          if (ts.isIdentifier(property.initializer)) inspect(enclosingBlock(node), property.initializer.text);
          else hit(property);
        }
      }
    }
    // So is error read straight off an awaited provider result, declared or
    // assigned: result.error.
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && providerResult(node.initializer)) {
      inspectErrorReads(enclosingBlock(node), node.name.text);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) && providerResult(node.right)) {
      inspectErrorReads(enclosingBlock(node), node.left.text);
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
      unsafeCaughtReferences(readFileSync(file, "utf8"), file).map((line) => `${relative(ROOT, file)}:${line}`));
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

  // Eight close variants the second version let through.
  it.each([
    ["an allSettled reason destructured in for-of", 'const results = await Promise.allSettled(tasks); for (const { status, reason } of results) if (status === "rejected") logger.warn(reason);'],
    ["an allSettled reason destructured in a callback", 'const results = await Promise.allSettled(tasks); results.forEach(({ reason }) => logger.warn(reason));'],
    ["a provider result read as result.error", 'const result = await resend.emails.send(message); if (result.error) logger.error("send failed", result.error);'],
    ["an assignment-destructured provider error", 'let error; ({ error } = await resend.emails.send(message)); if (error) logger.error("send failed", error);'],
    ["a listener with a non-literal event name", 'const event = "unhandledRejection"; process.on(event, (reason) => logger.error(reason));'],
    ["a window unhandledrejection listener", 'window.addEventListener("unhandledrejection", (event) => logger.error(event.reason));'],
    ["a bracketed catch call", 'task["catch"]((caught) => logger.warn(caught.message));'],
    ["an error-boundary { error } prop", 'export default function ErrorPage({ error }) { useEffect(() => { logger.error(error.message); }, [error]); return null; }'],
  ])("detects %s", (_shape, code) => {
    // Audited as an error boundary file, the only place an error prop is a caught value.
    expect(unsafeCaughtReferences(code, "src/app/error.tsx").length).toBeGreaterThan(0);
  });

  // Ten close variants the third version let through. The last two are error
  // boundaries; props.error counts only in error.tsx or global-error.tsx.
  it.each([
    ["an as-cast awaited result", 'const result = (await resend.emails.send(message)) as SendResult; if (result.error) logger.error("send failed", result.error);', ""],
    ["a .then success handler", 'resend.emails.send(message).then((result) => { if (result.error) logger.error("send failed", result.error); });', ""],
    ["a bracketed result[\"error\"]", 'const result = await resend.emails.send(message); logger.error("send failed", result["error"]);', ""],
    ["an assigned, not declared, result", 'let result; result = await resend.emails.send(message); logger.error("send failed", result.error);', ""],
    ["a rest element", 'const { data, ...rest } = await resend.emails.send(message); logger.error("send failed", rest.error);', ""],
    ["window.onunhandledrejection", 'window.onunhandledrejection = (event) => logger.error(event.reason);', ""],
    ["window.onerror", 'window.onerror = (message, source, line, column, fault) => logger.error(fault);', ""],
    ["setUncaughtExceptionCaptureCallback", 'process.setUncaughtExceptionCaptureCallback((fault) => logger.error(fault));', ""],
    ["a class componentDidCatch", 'class Boundary extends Component { componentDidCatch(fault, info) { logger.error(fault, info.componentStack); } }', ""],
    ["an error boundary's props.error", 'export default function ErrorPage(props) { useEffect(() => { logger.error(props.error); }, [props.error]); return null; }', "src/app/error.tsx"],
  ])("detects %s", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file).length).toBeGreaterThan(0);
  });

  it("allows the ten variants when every value goes through safeError", () => {
    expect(unsafeCaughtReferences([
      'const result = (await resend.emails.send(message)) as SendResult; if (result.error) logger.error("send failed", safeError(result.error));',
      'resend.emails.send(message).then((reply) => { if (reply.error) logger.error(safeError(reply.error)); });',
      'const third = await resend.emails.send(message); logger.error("send failed", safeError(third["error"]));',
      'let fourth; fourth = await resend.emails.send(message); logger.error(safeError(fourth.error));',
      'const { data, ...rest } = await resend.emails.send(message); logger.error(safeError(rest.error));',
      'window.onunhandledrejection = (event) => logger.error(safeError(event));',
      'window.onerror = (message, source, line, column, fault) => logger.error(safeError(fault), source, line);',
      'process.setUncaughtExceptionCaptureCallback((fault) => logger.error(safeError(fault))); process.setUncaughtExceptionCaptureCallback(null);',
      'class Boundary extends Component { componentDidCatch(fault, info) { logger.error(safeError(fault), info.componentStack); } }',
      'export default function ErrorPage(props) { useEffect(() => { logger.error(safeError(props.error)); }, [props.error]); return null; }',
    ].join("\n"), "src/app/error.tsx")).toEqual([]);
  });

  // A form field's error prop is the form's own text, not a caught value.
  it("audits an error prop only in error.tsx and global-error.tsx", () => {
    const field = 'export function FieldError({ error }) { return error ? <p role="alert">{error}</p> : null; }';
    expect(unsafeCaughtReferences(field, "src/components/field-error.tsx")).toEqual([]);
    expect(unsafeCaughtReferences(field, "src/app/global-error.tsx").length).toBeGreaterThan(0);
  });

  it("allows the eight variants when every value goes through safeError", () => {
    expect(unsafeCaughtReferences([
      'const results = await Promise.allSettled(tasks); for (const { status, reason } of results) if (status === "rejected") logger.warn(safeError(reason));',
      'results.forEach(({ reason }) => logger.warn(safeError(reason)));',
      'const result = await resend.emails.send(message); if (result.error) logger.error("send failed", safeError(result.error));',
      'let error; ({ error } = await resend.emails.send(message)); if (error) logger.error("send failed", safeError(error));',
      'process.on(event, (reason) => logger.error(safeError(reason)));',
      'window.addEventListener("unhandledrejection", (event) => logger.error(safeError(event)));',
      'task["catch"]((caught) => logger.warn(safeError(caught)));',
      'export default function ErrorPage({ error }) { useEffect(() => { logger.error(safeError(error)); }, [error]); return null; }',
    ].join("\n"))).toEqual([]);
  });

  // An own helper can return a provider result whole, so only the listed
  // server action is exempt.
  it("audits result.error from every call but the allowlisted createPendingBooking", () => {
    expect(unsafeCaughtReferences('import { createPendingBooking } from "./actions"; const result = await createPendingBooking(input); if (!result.ok) setSubmitError(result.error);')).toEqual([]);
    expect(unsafeCaughtReferences('import { send } from "resend"; const result = await send(message); setSubmitError(result.error);')).toEqual([1]);
    expect(unsafeCaughtReferences('import { sendMail } from "@/lib/mail"; const result = await sendMail(message); console.error("send failed", result.error);')).toEqual([1]);
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
