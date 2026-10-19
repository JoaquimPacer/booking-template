// WHY these tests matter: the seed and maintenance scripts hold a Sanity write
// token, and the booking actions hold database and provider credentials. When
// @sanity/client cannot reach the API it throws an error that carries the
// original request, headers included, so `console.error(err)` prints the
// token into the terminal, CI logs and any transcript that captured the run.
// safeError keeps exactly two things, a redacted message and a status code.
// If an assertion here fails, a credential can reach a log again.
//
// Every token below is a fake built at runtime, so this file holds nothing
// shaped like a real key.

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { format } from "node:util";
import { createClient } from "@sanity/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REDACTED, redactSecrets, safeError } from "./redact";

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
    expect(lines[0]).toContain("ECONNREFUSED");
  });

  it("keeps only the message and the status code", () => {
    const err = Object.assign(new Error("Unauthorized"), {
      statusCode: 401,
      response: { headers: { authorization: `Bearer ${FAKE_TOKEN}` } },
    });
    expect(safeError(err)).toEqual({ message: "Unauthorized", status: 401 });
  });

  it("redacts a token that a provider put inside the message itself", () => {
    const err = new Error(
      `GET https://api.example.com/v1/items?token=${FAKE_TOKEN} failed; header Bearer ${FAKE_TOKEN}`,
    );
    const safe = safeError(err);
    expect(occurrences(safe.message)).toBe(0);
    expect(safe.message).toContain(REDACTED);
    expect(safe.status).toBe("unknown");
  });

  it("describes a non-Error throw without dumping it", () => {
    const thrown = { headers: { authorization: `Bearer ${FAKE_TOKEN}` } };
    expect(safeError(thrown)).toEqual({ message: "unknown", status: "unknown" });
  });

  it("redacts a bare Sanity-style token and credentials inside a URL", () => {
    const url = ["postgresql://app", FAKE_TOKEN].join(":") + "@db.example.com/main";
    const text = `token ${FAKE_TOKEN} at ${url}`;
    expect(occurrences(redactSecrets(text))).toBe(0);
  });

  it("keeps the token out of the log for a real @sanity/client network failure", async () => {
    // A port that was just freed, so the request is refused immediately.
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    await new Promise<void>((resolve) => server.close(() => resolve()));

    const client = createClient({
      projectId: "abc123de",
      dataset: "production",
      apiVersion: "2024-01-01",
      token: FAKE_TOKEN,
      useCdn: false,
      apiHost: `http://127.0.0.1:${port}`,
      useProjectHostname: false,
      maxRetries: 0,
    });

    const caught = await client.fetch("*[0]").then(
      () => null,
      (error: unknown) => error,
    );
    expect(caught).toBeInstanceOf(Error);
    expect(occurrences(format(safeError(caught)))).toBe(0);
  });
});
