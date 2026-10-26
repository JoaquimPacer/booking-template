// WHY these tests matter: the seed and maintenance scripts hold a Sanity write
// token, and the booking actions hold database and provider credentials. When
// @sanity/client cannot reach the API it throws an error that carries the
// original request, headers included, so `console.error(err)` prints the
// token into the terminal, CI logs and any transcript that captured the run.
// safeError keeps exactly two things, a fixed message and a status code.
// If an assertion here fails, a credential can reach a log again.
//
// Every token below is a fake built at runtime, so this file holds nothing
// shaped like a real key.

import { format } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { redactSecrets, safeError } from "./redact";

const FAKE_TOKEN = ["sk", "TestOnly".repeat(4), "9f8e7d6c5b4a"].join("");
const occurrences = (text: string) => text.split(FAKE_TOKEN).length - 1;

/** The shape @sanity/client throws on a network failure: the request rides along. */
function errorCarryingRequest(message: string) {
  return Object.assign(new Error(message), {
    code: "ECONNREFUSED",
    request: {
      url: "https://abc123de.api.sanity.io/v2024-01-01/data/query/production",
      headers: { Authorization: `Bearer ${FAKE_TOKEN}` },
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("safeError", () => {
  it("logs no token when the error object carries the request (negative control included)", () => {
    const err = errorCarryingRequest("connect ECONNREFUSED 127.0.0.1:443");

    // The old pattern really does print the token, so this test can fail.
    expect(occurrences(format(err))).toBeGreaterThan(0);

    const lines: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      lines.push(format(...args));
    });
    console.error("Seed failed:", safeError(err));

    expect(lines).toHaveLength(1);
    expect(occurrences(lines[0])).toBe(0);
    expect(lines[0]).toContain("Network request failed");
  });

  it("keeps only the message and the status code", () => {
    const err = Object.assign(new Error("Unauthorized"), {
      statusCode: 401,
      response: { headers: { authorization: `Bearer ${FAKE_TOKEN}` } },
    });
    expect(safeError(err)).toEqual({ message: "Upstream request failed", status: 401 });
  });

  it("redacts a token that a provider put inside the message itself", () => {
    const err = new Error(
      `GET https://api.example.com/v1/items?token=${FAKE_TOKEN} failed; header Bearer ${FAKE_TOKEN}`,
    );
    const safe = safeError(err);
    expect(occurrences(safe.message)).toBe(0);
    expect(safe.message).toBe("Unknown error");
    expect(safe.status).toBe(0);
  });

  it("describes a non-Error throw without dumping it", () => {
    const thrown = { headers: { authorization: `Bearer ${FAKE_TOKEN}` } };
    expect(safeError(thrown)).toEqual({ message: "Unknown error", status: 0 });
  });

  it("redacts a bare Sanity-style token and credentials inside a URL", () => {
    const url = ["postgresql://app", FAKE_TOKEN].join(":") + "@db.example.com/main";
    const text = `token ${FAKE_TOKEN} at ${url}`;
    expect(occurrences(redactSecrets(text))).toBe(0);
  });

  it("keeps an attached request out of a synthetic client network failure log", () => {
    expect(occurrences(format(safeError(errorCarryingRequest("fetch failed"))))).toBe(0);
  });
});

describe("safeError numeric status regressions", () => {
  it.each([
    ["missing", undefined],
    ["null", null],
    ["NaN", NaN],
    ["positive infinity", Infinity],
    ["negative infinity", -Infinity],
    ["fraction", 401.5],
    ["numeric string", "401"],
    ["negative", -1],
    ["below HTTP range", 99],
    ["above HTTP range", 600],
  ])("uses numeric sentinel for %s", (_label, candidate) => {
    for (const property of ["statusCode", "status"]) {
      const status = safeError(Object.assign(new Error("failure"), { [property]: candidate })).status;
      expect(status).toBe(0);
      expect(Number.isInteger(status) && Number.isFinite(status)).toBe(true);
    }
  });
});

describe("safeError message allowlist regressions", () => {
  const synthetic = ["Verifier", "Synthetic"].join("");
  const messages = [
    ["key URL", `GET https://example.invalid/test?key=${synthetic} failed`],
    ["signed URL", `GET https://example.invalid/test?signature=${synthetic} failed`],
    ["Basic authorization", `Authorization: Basic ${synthetic}`],
    ["Bearer authorization", `Authorization: Bearer ${synthetic}`],
    ["request body", `Request body: {"password":"${synthetic}"}`],
    ["unlabelled body text", `Rejected body ${synthetic}`],
  ];

  it.each(messages)("never forwards provider text: %s", (_label, message) => {
    // Compare booleans so a failing regression never prints the input value.
    expect(safeError(new Error(message)).message === "Unknown error").toBe(true);
  });

  it("never forwards a long provider message", () => {
    const safe = safeError(new Error(synthetic.repeat(10_000)));
    expect(safe.message === "Unknown error" && safe.status === 0).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["string", synthetic],
    ["number", 42],
  ])("handles a %s throw without forwarding it", (_label, thrown) => {
    expect(safeError(thrown)).toEqual({ message: "Unknown error", status: 0 });
  });

  it.each([
    ["connection", { code: "ECONNREFUSED" }, "Network request failed"],
    ["DNS", { code: "ENOTFOUND" }, "Network request failed"],
    ["timeout code", { code: "ETIMEDOUT" }, "Request timed out"],
    ["timeout name", { name: "TimeoutError" }, "Request timed out"],
    ["upstream", { statusCode: 503 }, "Upstream request failed"],
    ["validation", { name: "ZodError" }, "Validation failed"],
    ["unknown", {}, "Unknown error"],
  ])("classifies %s without forwarding text", (_label, properties, expected) => {
    const error = Object.assign(new Error(synthetic), properties);
    expect(safeError(error).message === expected).toBe(true);
  });
});
