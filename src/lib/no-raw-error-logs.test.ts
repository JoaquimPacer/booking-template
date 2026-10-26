// WHY this guard exists: scripts get copied from fork to fork, and every one of
// them once ended with `console.error(err)`. A Sanity client error from a
// network failure carries the request and its Authorization header, so that
// one line prints the write token (see src/lib/redact.test.ts). This test
// fails if any console call in scripts/ or src/ hands over a bare caught
// error again. Wrap it: console.error("...", safeError(err)).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, resolve, sep } from "node:path";
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
// process.setUncaughtExceptionCaptureCallback, a class componentDidCatch or
// getDerivedStateFromError (method or class field), an allSettled reason and a
// provider's error result, whether destructured (declaration, for-of,
// assignment, rest element, nested pattern, or the parameter of any function,
// a component's included) or read as result.error or result["error"] (declared
// or assigned, cast or not, or in a .then success handler, inline or passed by
// name). The guard fails closed, like safeError: no function is exempt for its
// name, its JSX return or how its file uses it, so a component's { error } prop
// is audited even when it is form text, as in FieldError({ error }). Rename such
// a prop; the guard cannot tell form text from a provider error. The one rule by
// path: in src/app/**/error.tsx and src/app/**/global-error.tsx, where Next.js
// passes the caught value as the error prop, props.error read off a plain
// parameter is audited as well.
// Each is checked the same way. A destructured catch or handler parameter
// always fails, because its pieces (message, cause, config) are the provider
// text safeError exists to drop.
const ERROR_EVENTS = new Set(["error", "uncaughtException", "uncaughtExceptionMonitor", "unhandledRejection", "unhandledrejection"]);
const LISTENERS = new Set(["on", "once", "addListener", "prependListener", "prependOnceListener", "addEventListener"]);
const HOOKS = new Set(["useEffect", "useLayoutEffect", "useCallback", "useMemo"]);
// Handler properties and the parameters that receive the caught value:
// onerror's message and error, onunhandledrejection's event.
const ERROR_PROPERTIES = new Map([["onerror", [0, 4]], ["onunhandledrejection", [0]]]);
// A class error boundary's members that receive the caught value first.
const BOUNDARY_METHODS = new Set(["componentDidCatch", "getDerivedStateFromError"]);
// The only calls whose result.error is not audited, each named by its module's
// path from the repository root and its export name. Each is our own server
// action and returns fixed wording or a zod validation message, never a
// provider result. A helper that returns a provider result whole
// (return resend.emails.send(message)) must never be added here.
const SAFE_RESULTS = [{ module: "src/app/book/[slug]/actions.ts", name: "createPendingBooking" }];
const EXTENSION = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
// Next.js error boundaries, by path from the repository root. Their component
// receives the caught value as the error prop, so props.error counts there.
const BOUNDARY_FILE = /^src\/app\/(.+\/)?(global-)?error\.[jt]sx?$/;

function unsafeCaughtReferences(text: string, file = ""): number[] {
  const source = ts.createSourceFile("audit.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: number[] = [];
  const settles = text.includes("allSettled");
  // Two rules can reach the same node (an inline .then handler's { error } is
  // also a parameter pattern); it counts once.
  const reached = new Set<number>();
  const hit = (node: ts.Node) => {
    const start = node.getStart(source);
    if (reached.has(start)) return;
    reached.add(start);
    hits.push(source.getLineAndCharacterOfPosition(start).line + 1);
  };
  // The file's path from the repository root names its module for the
  // allowlist and marks an error boundary.
  const from = relative(ROOT, resolve(ROOT, file)).split(sep).join("/");
  const boundary = BOUNDARY_FILE.test(from);
  // Allowlisted exports, imported by name (aliased or not) from the module the
  // allowlist names, written relative or with @/. The same name from any other
  // module is audited.
  const safeResults = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    const target = specifier.startsWith("@/") ? posix.join("src", specifier.slice(2))
      : specifier.startsWith(".") ? posix.join(posix.dirname(from), specifier) : "";
    const bindings = statement.importClause?.namedBindings;
    if (target && bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) {
      const name = (element.propertyName ?? element.name).text;
      if (SAFE_RESULTS.some((entry) => entry.name === name &&
        entry.module.replace(EXTENSION, "") === target.replace(EXTENSION, ""))) safeResults.add(element.name.text);
    }
  }
  // A local declaration that reuses an allowlisted import's name hides which
  // function a call reaches, so the declaration fails.
  function shadows(node: ts.Node) {
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
      ts.isClassDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) &&
      node.name && ts.isIdentifier(node.name) && safeResults.has(node.name.text)) hit(node.name);
    ts.forEachChild(node, shadows);
  }
  if (safeResults.size) shadows(source);

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

  // Boolean(x) tests presence only while Boolean is the global one, so a file
  // that names Boolean anywhere but as the callee of a plain Boolean(...) call
  // loses the allowance. That covers one that declares, imports or takes its
  // own (const Boolean = (x) => x) and one that replaces the global
  // (globalThis.Boolean = (x) => x, or "Boolean" as a key). Open: a module
  // that replaces it for another file is not seen here.
  const namesBoolean = (node: ts.Node): boolean =>
    ((ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && node.text === "Boolean" &&
      !(ts.isCallExpression(node.parent) && node.parent.expression === node)) || !!ts.forEachChild(node, namesBoolean);
  const globalBoolean = !namesBoolean(source);

  // A caught value may be wrapped by safeError, type-checked, compared to a
  // known message, or tested for presence (if, !, the global Boolean()).
  // Anything else forwards it.
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
      (ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.ExclamationToken) ||
      (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === "Boolean" && globalBoolean &&
        parent.arguments.length === 1 && parent.arguments[0] === value);
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

  // The functions this file declares under a name: a function declaration, or
  // an arrow or function expression assigned to it.
  function declarationsOf(reference: ts.Identifier): ts.FunctionLikeDeclaration[] {
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
    return declarations;
  }

  // A handler passed by name is audited where it is declared. One defined in
  // another module cannot be audited here, so it fails.
  function inspectNamedHandler(reference: ts.Identifier, indices = [0]) {
    const declarations = declarationsOf(reference);
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
  function exposes(name: ts.Node | undefined): name is ts.Identifier | ts.StringLiteral {
    return !!name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) &&
      (name.text === "error" || (settles && name.text === "reason"));
  }

  function enclosingBlock(node: ts.Node): ts.Node {
    let scope: ts.Node = node.parent;
    while (!ts.isBlock(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
    return scope;
  }

  function inspectPattern(pattern: ts.ObjectBindingPattern, scope: ts.Node) {
    for (const element of pattern.elements) {
      // A rest element keeps error along with every other unnamed property.
      if (element.dotDotDotToken) {
        if (ts.isIdentifier(element.name)) inspectErrorReads(scope, element.name.text);
        continue;
      }
      if (!exposes(element.propertyName ?? element.name)) {
        // A nested pattern ({ data: { error } }) reaches error one level down.
        // Open: an array pattern ([{ error }]) is not followed, here or as a
        // declaration; the review named only object nesting, so it waits.
        if (ts.isObjectBindingPattern(element.name)) inspectPattern(element.name, scope);
        continue;
      }
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
      // A .then success handler receives the provider result itself. One passed
      // by name is audited where this file declares it, as a rejection handler
      // is. One the file does not declare (an import, a state setter) is not:
      // most success handlers never see a provider result.
      // Open: an imported handler or a member one (handlers.onSent) is not resolved, so it passes.
      const callee = node.expression;
      const success = memberName(callee) === "then" ? node.arguments[0] : undefined;
      const handlers = !success ? [] : ts.isArrowFunction(success) || ts.isFunctionExpression(success) ? [success]
        : ts.isIdentifier(success) ? declarationsOf(success) : [];
      if ((ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) && !allowlisted(callee.expression)) {
        for (const handler of handlers) if (handler.body) inspectResult(handler.parameters[0]?.name, handler.body);
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const indices = ERROR_PROPERTIES.get(memberName(node.left) ?? "");
      if (indices) inspectAnyHandler(unwrap(node.right), indices);
    }
    // A class error boundary receives the caught value in componentDidCatch and
    // getDerivedStateFromError, written as a method or as a class field.
    if ((ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) && ts.isIdentifier(node.name) &&
      BOUNDARY_METHODS.has(node.name.text)) {
      if (ts.isMethodDeclaration(node)) inspectHandler(node);
      else inspectAnyHandler(node.initializer && unwrap(node.initializer));
    }
    // A provider result's { error } (Resend, for one) is a caught value too,
    // in a declaration or for-of, a .then success parameter, or an assignment.
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      inspectPattern(node.name, enclosingBlock(node));
    }
    // A parameter pattern pulls error out of whatever the caller passes, a
    // provider result included (a forEach over sends, a helper, a .then
    // handler, a JSX spread into a component), so it counts in every function,
    // whatever its name, return or use. In a boundary file so does props.error.
    if (ts.isParameter(node) && "body" in node.parent && node.parent.body) {
      if (ts.isObjectBindingPattern(node.name)) inspectPattern(node.name, node.parent.body);
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

  // No component is exempt: a form field's { error } prop is audited in every
  // file, so FieldError flags, by design. props.error off a plain parameter
  // counts only by path, in src/app/**/error.tsx and global-error.tsx, where
  // Next.js passes the caught value.
  it("audits an error prop in every file, and props.error only in a boundary file", () => {
    const field = 'export function FieldError({ error }) { return error ? <p role="alert">{error}</p> : null; }';
    expect(unsafeCaughtReferences(field, "src/components/field-error.tsx").length).toBeGreaterThan(0);
    expect(unsafeCaughtReferences(field, "src/app/global-error.tsx").length).toBeGreaterThan(0);
    const page = 'export default function ErrorPage(props) { return <p>{props.error.message}</p>; }';
    expect(unsafeCaughtReferences(page, "src/app/book/[slug]/error.tsx").length).toBeGreaterThan(0);
    expect(unsafeCaughtReferences(page, "src/app/global-error.tsx").length).toBeGreaterThan(0);
    expect(unsafeCaughtReferences(page, "src/components/error.tsx")).toEqual([]);
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
    expect(unsafeCaughtReferences('import { createPendingBooking } from "./actions"; const result = await createPendingBooking(input); if (!result.ok) setSubmitError(result.error);', "src/app/book/[slug]/booking-flow.tsx")).toEqual([]);
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

  // Raw shapes from the fourth version's review, audited in an ordinary
  // component file. The fourth version let X16, X22, X23 and X25 through: each
  // reaches the value through a parameter pattern or a .then success handler
  // passed by name, outside any component.
  it.each([
    ["X01 optional chaining on a declared result", 'const result = await resend.emails.send(message);\nlogger.error("send failed", result?.error);'],
    ["X05 a caught error nested under another key", 'try { await sync(); } catch (failure) { log.error({ event: "sync", detail: { cause: failure } }); }'],
    ["X06 a provider error inside a template literal", 'const outcome = await mailer.send(message);\nreport(`send failed: ${outcome.error}`);'],
    ["X07 a logger wrapper with another name", 'try { await sync(); } catch (failure) { audit.record("sync", failure); }'],
    ["X08 a provider error message into a toast", 'const outcome = await saveSettings(form);\nif (outcome.error) toast.error(outcome.error.message);'],
    ["X09 a caught error into a Response body", 'export async function POST() {\n  try { await sync(); } catch (failure) { return new Response(String(failure), { status: 500 }); }\n}'],
    ["X10 a provider error shorthand into Response.json", 'const { data, error } = await supabase.from("bookings").select();\nreturn Response.json({ data, error }, { status: error ? 500 : 200 });'],
    ["X16 a .then success handler passed by name", 'function onSent({ error }) { if (error) logger.error("send failed", error); }\nresend.emails.send(message).then(onSent);'],
    ["X19 a rejection handler imported from another module", 'import { report } from "./report";\ntask.catch(report);'],
    ["X20 a caught error wrapped into a new Error message", 'try { await sync(); } catch (failure) { throw new Error(`sync failed: ${failure}`); }'],
    ["X21 the json body of an awaited fetch", 'export async function load() {\n  const body = await (await fetch(url)).json();\n  if (body.error) logger.error("upstream failed", body.error);\n}'],
    ["X22 forEach over Promise.all results with an { error } parameter", 'export async function notifyAll(messages) {\n  const replies = await Promise.all(messages.map((m) => resend.emails.send(m)));\n  replies.forEach(({ error }) => { if (error) logger.error("send failed", error); });\n}'],
    ["X23 a named helper destructuring a provider result", 'function logReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { logReply(await resend.emails.send(m)); }'],
    ["X24 an inline .then function expression destructuring { error }", 'resend.emails.send(message).then(function ({ error }) { if (error) logger.error("send failed", error); });'],
    ["X25 a .then success handler passed by name, reading result.error", 'function onSent(reply) { if (reply.error) logger.error("send failed", reply.error); }\nresend.emails.send(message).then(onSent);'],
  ])("detects %s", (_shape, code) => {
    expect(unsafeCaughtReferences(code, "src/components/send-status.tsx").length).toBeGreaterThan(0);
  });

  // Raw shapes from the fifth version's review. It let the first five through
  // as components: each has a PascalCase name or returns JSX but is handed
  // inline to .map or called by name with a provider result. The rest are gaps
  // every version had.
  it.each([
    ["G01 a PascalCase helper called by name", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { LogReply(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["G02 a PascalCase const arrow helper called by name", 'const ReportSend = ({ error }) => { if (error) logger.error("send failed", error); };\nexport async function notify(m) { ReportSend(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["G04 a render helper given a provider result, logging and returning JSX", 'function renderReply({ error }) {\n  if (error) { logger.error("send failed", error); return <p>Failed</p>; }\n  return null;\n}\nexport default async function Page() { return renderReply(await resend.emails.send(message)); }', "src/app/book/[slug]/page.tsx"],
    ["G22 an inline .map callback rendering provider error text", 'export default async function Page() {\n  const replies = await Promise.all(messages.map((m) => resend.emails.send(m)));\n  return <ul>{replies.map(({ error }) => <li>{error?.message}</li>)}</ul>;\n}', "src/app/book/[slug]/page.tsx"],
    ["G23 an inline .map callback logging and returning JSX", 'export default async function Page() {\n  const replies = await Promise.all(messages.map((m) => resend.emails.send(m)));\n  return <ul>{replies.map(({ error }) => { if (error) logger.error("send failed", error); return <li>sent</li>; })}</ul>;\n}', "src/app/book/[slug]/page.tsx"],
    ["G07 componentDidCatch as a class field", 'class Boundary extends Component {\n  componentDidCatch = (fault, info) => { logger.error(fault, info.componentStack); };\n}', "src/components/send-status.tsx"],
    ["G09 getDerivedStateFromError copying fault.message to state", 'class Boundary extends Component { static getDerivedStateFromError(fault) { return { detail: fault.message }; } }', "src/components/send-status.tsx"],
    ["G11 nested destructuring { data: { error } }", 'const { data: { error } } = await client.request(query);\nif (error) logger.error("request failed", error);', "src/components/send-status.tsx"],
    ["G12 nested destructuring in a forEach parameter", 'const outcomes = await Promise.all(messages.map((m) => resend.emails.send(m)));\noutcomes.forEach(({ data: { error } }) => logger.error("send failed", error));', "src/components/send-status.tsx"],
    ["G19 the allowlisted name shadowed by a local provider wrapper", 'import { createPendingBooking } from "./actions";\nasync function notify(m) {\n  const createPendingBooking = (x) => resend.emails.send(x);\n  const result = await createPendingBooking(m);\n  logger.error("send failed", result.error);\n}', "src/app/book/[slug]/booking-flow.tsx"],
  ])("detects %s", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file).length).toBeGreaterThan(0);
  });

  // Benign shapes from the same review. N05 and the two component rows that
  // stood here now flag, by design, with the rows further down.
  it.each([
    ["N01 an error message compared to a literal", 'const result = await resend.emails.send(message);\nif (result.error?.message === "rate_limited") return retryLater();', "src/components/send-status.tsx"],
    ["N02 data only from a provider result", 'const { data } = await resend.emails.send(message);\nlogger.info("sent", data?.id);', "src/components/send-status.tsx"],
    ["N03 the allowlisted action under an alias", 'import { createPendingBooking as book } from "./actions";\nconst outcome = await book(input);\nif (!outcome.ok) setSubmitError(outcome.error);', "src/app/book/[slug]/booking-flow.tsx"],
    ["N04 safeError in a catch, fixed text returned", 'try { await sync(); } catch (failure) {\n  console.error("sync failed:", safeError(failure));\n  return { ok: false, error: "Sync failed." };\n}', "src/components/send-status.tsx"],
    ["N06 a reason field outside allSettled", 'const { reason } = await cancelBooking(id);\nlogger.info("cancelled", reason);', "src/components/send-status.tsx"],
    ["N07 a .then success handler reading data only", 'resend.emails.send(message).then(({ data }) => logger.info("sent", data?.id));', "src/components/send-status.tsx"],
    ["N08 onerror cleared with null", 'image.onerror = null;\nwindow.onunhandledrejection = null;', "src/components/send-status.tsx"],
    ["N09 a local validation string named error", 'const error = validate(form);\nif (error) setFieldError(error);', "src/components/send-status.tsx"],
    ["a getDerivedStateFromError that keeps only a flag", 'class Boundary extends Component { static getDerivedStateFromError() { return { failed: true }; } }', "src/components/send-status.tsx"],
  ])("allows %s", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file)).toEqual([]);
  });

  // Raw shapes from the sixth version's review. Each helper is passed by name
  // to forEach or .map, called under its const's name, or called through
  // parentheses or .call. Its own { error } parameter is audited.
  it.each([
    ["V12 a PascalCase helper passed by name to forEach over sends", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notifyAll(ms) {\n  const replies = await Promise.all(ms.map((m) => resend.emails.send(m)));\n  replies.forEach(LogReply);\n}', "src/components/send-status.tsx"],
    ["V13 a JSX render helper passed by name to .map over sends", 'function renderReply({ error }) { if (error) logger.error("send failed", error); return <li>sent</li>; }\nexport default async function Page() {\n  const replies = await Promise.all(ms.map((m) => resend.emails.send(m)));\n  return <ul>{replies.map(renderReply)}</ul>;\n}', "src/app/book/[slug]/page.tsx"],
    ["V19 a PascalCase const arrow passed by name to .map, logging and returning JSX", 'const ReplyRow = ({ error }) => { if (error) logger.error("send failed", error); return <li>sent</li>; };\nexport default async function Page() {\n  const replies = await Promise.all(ms.map((m) => resend.emails.send(m)));\n  return <ul>{replies.map(ReplyRow)}</ul>;\n}', "src/app/book/[slug]/page.tsx"],
    ["V14 a function expression named differently from its const", 'const logReply = function LogReply({ error }) { if (error) logger.error("send failed", error); };\nexport async function notify(m) { logReply(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["V15 a PascalCase helper called through parentheses", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { (LogReply)(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["V16 a PascalCase helper called with .call", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { LogReply.call(null, await resend.emails.send(m)); }', "src/components/send-status.tsx"],
  ])("detects %s", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file).length).toBeGreaterThan(0);
  });

  // A benign shape from the same review: Boolean(fault) keeps only a flag, as
  // !!fault does. V01 and V03 now flag, by design, further down.
  it.each([
    ["V10c a getDerivedStateFromError flag set through Boolean(fault)", 'class Boundary extends Component { static getDerivedStateFromError(fault) { return { failed: Boolean(fault) }; } }', "src/components/send-status.tsx"],
  ])("allows %s", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file)).toEqual([]);
  });

  // Raw shapes from the seventh version's review. Each hands a component-shaped
  // helper a provider result some way other than a direct call or argument: an
  // object property, an alias, a JSX render prop, an array, a cast, a non-null
  // assertion, a comma expression, new, a default parameter, a factory's
  // return, or a memo that is not React's. Z15d: a file's own Boolean may
  // return its argument, so only the global Boolean() is a presence test.
  it.each([
    ["Z05 helper assigned to an object property, then handlers.log(reply)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst handlers = { log: LogReply };\nexport async function notify(m) { handlers.log(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z05b helper in a shorthand property, then handlers.LogReply(reply)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst handlers = { LogReply };\nexport async function notify(m) { handlers.LogReply(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z07 helper aliased to a const, then called", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst log = LogReply;\nexport async function notify(m) { log(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z08 JSX render helper handed as a render prop to a same-file list", 'function renderReply({ error }) { if (error) logger.error("send failed", error); return <li>sent</li>; }\nfunction Replies({ items, render }) { return <ul>{items.map(render)}</ul>; }\nexport default async function Page() {\n  const replies = await Promise.all(ms.map((m) => resend.emails.send(m)));\n  return <Replies items={replies} render={renderReply} />;\n}', "src/app/book/[slug]/page.tsx"],
    ["Z09 helper held in an array, called in a loop", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { const reply = await resend.emails.send(m); for (const f of [LogReply, track]) f(reply); }', "src/components/send-status.tsx"],
    ["Z10 helper called through a TypeScript cast", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { (LogReply as (r: unknown) => void)(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z10b helper called with a non-null assertion", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { LogReply!(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z11 helper called through a comma expression (0, LogReply)(reply)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { (0, LogReply)(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z12 helper invoked with new", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { new LogReply(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z13 helper as a default parameter value, then called", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m, log = LogReply) { log(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z14 helper returned from a factory, then called", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst pick = () => LogReply;\nexport async function notify(m) { pick()(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z02b helper as second argument of a user-land memo(key, fn)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst logOnce = memo("send", LogReply);\nexport async function notify(m) { logOnce(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z02c helper wrapped by a member named memo (cache.memo)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst logOnce = cache.memo(LogReply);\nexport async function notify(m) { logOnce(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z02d helper as first argument of a bare user-land memo(fn)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst logOnce = memo(LogReply);\nexport async function notify(m) { logOnce(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z02e user-land memo imported from a memoizer, helper as first argument", 'import memo from "micro-memoize";\nfunction LogReply({ error }) { if (error) logger.error("send failed", error); }\nconst logOnce = memo(LogReply);\nexport async function notify(m) { logOnce(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["Z15d getDerivedStateFromError with Boolean shadowed by an identity function", 'const Boolean = (x) => x;\nclass Boundary extends Component { static getDerivedStateFromError(fault) { return { failed: Boolean(fault) }; } }', "src/components/send-status.tsx"],
  ])("detects %s", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file).length).toBeGreaterThan(0);
  });

  // Raw shapes from the eighth version's review, each let through by the
  // component exemption that is now gone: a provider result spread or passed
  // into a JSX tag (W13), a component-shaped function with no name the old
  // rule followed (W15), a call through valueOf() or prototype.constructor
  // (W14), React's memo or namespace shadowed by a parameter (W16), and a
  // replaced globalThis.Boolean (W11e). G03, V06 and V06b, the old cross-file
  // trade, flag in the file that declares the helper.
  it.each([
    ["W13 provider result spread into a JSX-tag-only component", 'function SendStatus({ error }) { if (error) logger.error("send failed", error); return null; }\nexport default async function Page({ m }) {\n  const reply = await resend.emails.send(m);\n  return <SendStatus {...reply} />;\n}', "src/app/book/[slug]/page.tsx"],
    ["W13b provider result spread into a react-memo component", 'import { memo } from "react";\nconst SendStatus = memo(function SendStatus({ error }) { if (error) logger.error("send failed", error); return null; });\nexport default async function Page({ m }) {\n  const reply = await resend.emails.send(m);\n  return <SendStatus {...reply} />;\n}', "src/app/book/[slug]/page.tsx"],
    ["W13c awaited send spread inline into a JSX tag", 'function SendStatus({ error }) { if (error) logger.error("send failed", error); return null; }\nexport default async function Page({ m }) {\n  return <SendStatus {...(await resend.emails.send(m))} />;\n}', "src/app/book/[slug]/page.tsx"],
    ["W13d rest of a destructured result spread into a JSX tag", 'function SendStatus({ error }) { if (error) logger.error("send failed", error); return null; }\nexport default async function Page({ m }) {\n  const { data, ...rest } = await resend.emails.send(m);\n  return <SendStatus id={data?.id} {...rest} />;\n}', "src/app/book/[slug]/page.tsx"],
    ["W13f aliased result, error={r.error} on a JSX tag", 'function SendStatus({ error }) { if (error) logger.error("send failed", error); return null; }\nexport default async function Page({ m }) {\n  const reply = await resend.emails.send(m);\n  const r = reply;\n  return <SendStatus error={r.error} />;\n}', "src/app/book/[slug]/page.tsx"],
    ["W13i (await send()).error inline as a JSX prop", 'function SendStatus({ error }) { if (error) logger.error("send failed", error); return null; }\nexport default async function Page({ m }) {\n  return <SendStatus error={(await resend.emails.send(m)).error} />;\n}', "src/app/book/[slug]/page.tsx"],
    ["W14 LogReply.valueOf()(reply)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { LogReply.valueOf()(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W14b LogReply.prototype.constructor(reply)", 'function LogReply({ error }) { if (error) logger.error("send failed", error); }\nexport async function notify(m) { LogReply.prototype.constructor(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15 inline arrow returning JSX in an object literal, called through it", 'const view = { status: ({ error }) => { if (error) logger.error("send failed", error); return <p>failed</p>; } };\nexport async function notify(m) { view.status(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15b PascalCase function expression in an object literal, called through it", 'const handlers = { log: function LogReply({ error }) { if (error) logger.error("send failed", error); } };\nexport async function notify(m) { handlers.log(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15c object-literal method returning JSX, called", 'const view = { status({ error }) { if (error) logger.error("send failed", error); return <p>failed</p>; } };\nexport async function notify(m) { view.status(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15d class method returning JSX, called", 'class View { status({ error }) { if (error) logger.error("send failed", error); return <p>failed</p>; } }\nexport async function notify(m) { new View().status(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15e PascalCase function expression assigned to a member, called", 'const handlers = {};\nhandlers.log = function LogReply({ error }) { if (error) logger.error("send failed", error); };\nexport async function notify(m) { handlers.log(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15f PascalCase function expression assigned to a let, called", 'let log;\nlog = function LogReply({ error }) { if (error) logger.error("send failed", error); };\nexport async function notify(m) { log(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15g JSX-returning arrow in an array, called by index", 'const steps = [({ error }) => { if (error) logger.error("send failed", error); return <p>failed</p>; }];\nexport async function notify(m) { steps[0](await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15h JSX-returning arrow as a default parameter, called", 'export async function notify(m, log = ({ error }) => { if (error) logger.error("send failed", error); return <p>failed</p>; }) { log(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W15i PascalCase function expression returned from a factory, called", 'const pick = () => function LogReply({ error }) { if (error) logger.error("send failed", error); };\nexport async function notify(m) { pick()(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W16 react memo name shadowed by a parameter, wraps and returns it", 'import { memo } from "react";\nfunction LogReply({ error }) { if (error) logger.error("send failed", error); }\nfunction wrap(memo) { return memo(LogReply); }\nexport async function notify(m) { wrap((f) => f)(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W16b React namespace shadowed by a parameter, React.memo returns it", 'import * as React from "react";\nfunction LogReply({ error }) { if (error) logger.error("send failed", error); }\nfunction wrap(React) { return React.memo(LogReply); }\nexport async function notify(m) { wrap({ memo: (f) => f })(await resend.emails.send(m)); }', "src/components/send-status.tsx"],
    ["W11e provider error through Boolean after globalThis.Boolean is replaced", 'globalThis.Boolean = (x) => x;\nexport async function notify(m) { const { error } = await resend.emails.send(m); logger.error("send failed", Boolean(error)); }', "src/components/send-status.tsx"],
    ["G03 lowercase component returning JSX logs error.message", 'export function sendStatus({ error }) {\n  useEffect(() => { if (error) logger.error("send failed", error.message); }, [error]);\n  return <p>Send failed</p>;\n}', "src/components/send-status.tsx"],
    ["V06 PascalCase helper exported for another file's call, in its own file", 'export function LogReply({ error }) { if (error) logger.error("send failed", error); }', "src/lib/log-reply.ts"],
    ["V06b lowercase JSX render helper exported for another file's call, in its own file", 'export function renderReply({ error }) { if (error) logger.error("send failed", error); return <p>Failed</p>; }', "src/components/render-reply.tsx"],
  ])("detects %s", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file).length).toBeGreaterThan(0);
  });

  // Benign shapes the old component exemption let through. Each { error } prop
  // here is form text, but the guard fails closed and cannot tell, so each one
  // flags, by design; a real component renames the prop. Each comment names
  // what the old rule trusted.
  it.each([
    // Z03: React.memo(forwardRef(Field)) by name, with no react import.
    ["Z03 React.memo(forwardRef(Field)) nested, by name", 'function Field({ error }, ref) { return <label ref={ref}>{error}</label>; }\nexport default React.memo(forwardRef(Field));', "src/components/field.tsx"],
    // Z03i: the same wrappers, both imported from react.
    ["Z03i React.memo(forwardRef(Field)) by name, both imported from react", 'import React, { forwardRef } from "react";\nfunction Field({ error }, ref) { return <label ref={ref}>{error}</label>; }\nexport default React.memo(forwardRef(Field));', "src/components/field.tsx"],
    // Z03bi: the wrappers through a namespace import, around an inline arrow.
    ["Z03bi React.memo(React.forwardRef(inline arrow)), React imported as a namespace", 'import * as React from "react";\nexport const Field = React.memo(React.forwardRef(({ error }, ref) => <label ref={ref}>{error}</label>));', "src/components/field.tsx"],
    // Z20: react's memo under an alias, wrapping a component by name.
    ["Z20 memo(FieldNote) by name, memo imported from react under an alias", 'import { memo as pure } from "react";\nfunction FieldNote({ error }) { return <em>{error}</em>; }\nexport default pure(FieldNote);', "src/components/field-note.tsx"],
    // Z21: React.memo around an arrow, React imported.
    ["Z21 a React.memo-wrapped arrow, React imported from react", 'import React from "react";\nexport const FieldNote = React.memo(({ error }) => <em>{error}</em>);', "src/components/field-note.tsx"],
    // Z22: forwardRef imported from react, around an arrow.
    ["Z22 a forwardRef-wrapped arrow, forwardRef imported from react", 'import { forwardRef } from "react";\nexport const Field = forwardRef(({ error }, ref) => <label ref={ref}>{error}</label>);', "src/components/field.tsx"],
    // Z04: a component referenced only as a JSX tag.
    ["Z04 component referenced only as a JSX tag", 'function LogReply({ error }) { return <p role="alert">{error}</p>; }\nexport function Form({ message }) { return <LogReply error={message} />; }', "src/components/form.tsx"],
    // Z17: a displayName read and a default export.
    ["Z17 component given a displayName, exported default", 'function Field({ error }) { return <em>{error}</em>; }\nField.displayName = "Field";\nexport default Field;', "src/components/field.tsx"],
    // Z19: a typeof type query and a JSX tag.
    ["Z19 component used in typeof and JSX only", 'export function Field({ error }) { return <em>{error}</em>; }\nexport type FieldProps = Parameters<typeof Field>[0];\nexport function Form() { return <Field error="Required" />; }', "src/components/field.tsx"],
    // V01: React.memo around an arrow, React imported on the same line.
    ["V01 a React.memo-wrapped arrow component with a form-text error prop", 'import React from "react"; export const FieldNote = React.memo(({ error }) => <em>{error}</em>);', "src/components/field-note.tsx"],
    // V02: forwardRef around an arrow, with no react import.
    ["V02 forwardRef arrow component, form-text error prop", 'export const Field = forwardRef(({ error }, ref) => <label ref={ref}>{error}</label>);', "src/components/field.tsx"],
    // V03: React.forwardRef around a named function expression.
    ["V03 a React.forwardRef named function expression", 'import React from "react"; export const Field = React.forwardRef(function Field({ error }, ref) { return <label ref={ref}>{error}</label>; });', "src/components/field.tsx"],
    // V04: a component passed by name to an unimported memo.
    ["V04 component passed by name to memo", 'function FieldNote({ error }) { return <em>{error}</em>; }\nexport default memo(FieldNote);', "src/components/field-note.tsx"],
    // V05: an arrow component exported default by name.
    ["V05 arrow component assigned, then exported default", 'const Status = ({ error }) => <p role="alert">{error}</p>;\nexport default Status;', "src/components/status.tsx"],
    // V18: a PascalCase component rendered as a JSX tag, never called.
    ["V18 PascalCase component rendered as JSX and never called", 'function Hint({ error }) { return <small>{error}</small>; }\nexport function Form({ error }) { return <div><Hint error={error} /></div>; }', "src/components/form.tsx"],
    // G25: a PascalCase arrow returning JSX.
    ["G25 PascalCase component with a form-text error prop", 'export const FieldNote = ({ error }) => (error ? <em>{error}</em> : null);', "src/components/field-note.tsx"],
    // N05: a typed string prop rendered as a hint.
    ["N05 a form hint with a string error prop", 'export function TextHint({ error, label }: { error?: string; label: string }) {\n  return <span>{error ?? label}</span>;\n}', "src/components/text-hint.tsx"],
    // A lower-case arrow whose only claim to be a component was its JSX return.
    ["a lower-case arrow component returning JSX", 'const fieldHint = ({ error }) => <small>{error}</small>;', "src/components/field-hint.tsx"],
    // react's memo around an arrow.
    ["a memo-wrapped component with a form-text error prop", 'import { memo } from "react"; export const FieldNote = memo(({ error }) => <em>{error}</em>);', "src/components/field-note.tsx"],
  ])("flags %s, by design", (_shape, code, file) => {
    expect(unsafeCaughtReferences(code, file).length).toBeGreaterThan(0);
  });

  // The allowlist names a module path and an export. The same name imported
  // from anywhere else is audited like any other call.
  it.each([
    ["the action from ./actions", 'import { createPendingBooking } from "./actions";\nconst result = await createPendingBooking(input);\nif (!result.ok) setSubmitError(result.error);', "src/app/book/[slug]/booking-flow.tsx", 0],
    ["the action through the @/ path, aliased", 'import { createPendingBooking as book } from "@/app/book/[slug]/actions";\nconst result = await book(input);\nif (!result.ok) setSubmitError(result.error);', "src/components/send-status.tsx", 0],
    ["another action from a sibling module", 'import { sendNotice } from "@/app/book/[slug]/notify";\nconst result = await sendNotice(input);\nif (result.error) setSubmitError(result.error.message);', "src/app/book/[slug]/booking-flow.tsx", 1],
    ["the same name from @/lib/mail", 'import { createPendingBooking } from "@/lib/mail";\nconst result = await createPendingBooking(message);\nlogger.error("send failed", result.error);', "src/components/send-status.tsx", 1],
    ["the same name from ../../lib/mail", 'import { createPendingBooking } from "../../lib/mail";\nconst result = await createPendingBooking(message);\ntoast.error(result.error.message);', "src/components/send-status.tsx", 1],
    ["the same name from another folder's ./actions", 'import { createPendingBooking } from "./actions";\nconst result = await createPendingBooking(input);\nsetSubmitError(result.error);', "src/app/admin/form.tsx", 1],
    ["the same name from a package", 'import { createPendingBooking } from "booking-sdk";\nconst result = await createPendingBooking(message);\nlogger.error("send failed", result.error);', "src/components/send-status.tsx", 1],
    ["a local function with the same name", 'async function createPendingBooking(m) { return resend.emails.send(m); }\nconst result = await createPendingBooking(message);\nlogger.error("send failed", result.error);', "src/components/send-status.tsx", 1],
  ])("allowlist: %s", (_shape, code, file, expected) => {
    expect(unsafeCaughtReferences(code, file).length).toBe(expected);
  });
});
