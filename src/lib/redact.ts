/**
 * Classifies failures for logging without forwarding provider text.
 *
 * `err.message` is not safe on its own. A provider client puts the request URL
 * in the message, and the request URL carries the token; an auth failure
 * quotes the credential it rejected. Only safeError's fixed messages are
 * approved for error logs; pattern redaction alone cannot guarantee safety.
 *
 * The shapes mirror the ones the operator's own scanner uses
 * (C:/Users/f927g/Repos/claude-config/tools/guards/credential-patterns.mjs),
 * trimmed to what can plausibly reach this application's logs. Anything
 * matched is replaced whole; nothing is shortened to a prefix, because a
 * prefix of a key is still a piece of a key.
 */

const SECRET_SHAPES: readonly RegExp[] = [
  // A URL carrying credentials, including the scheme and host around them.
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]{3,}@\S*/gi,
  // Anything that looks like key=value for a sensitive name, in a query
  // string, a connection string or a quoted message.
  /\b(?:passwo?r?d|passwd|pwd|passphrase|secret|client[_.-]?secret|token|access[_.-]?token|refresh[_.-]?token|auth[_.-]?token|api[_.-]?key|apikey|access[_.-]?key|secret[_.-]?key|private[_.-]?key|signing[_.-]?key|credential|bearer|dsn)\b["'\]]?\s*[:=]\s*["']?[^\s"'&,;)]{4,}/gi,
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/g,
  /\bglpat-[A-Za-z0-9_-]{18,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\bdop_v1_[a-f0-9]{60,}/g,
  // Stripe, live and test. Test keys are not a breach, but a log is not where
  // either of them belongs.
  /\b[rs]k_(?:live|test)_[A-Za-z0-9]{10,}/g,
  /\bwhsec_[A-Za-z0-9]{10,}/g,
  /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]{10,}=*/gi,
  // The four this application actually holds, which the first pass missed
  // because each is a bare token in a sentence rather than a labelled value.
  /\bre_[A-Za-z0-9_]{16,}/g, // Resend
  /\bya29\.[A-Za-z0-9._-]{20,}/g, // Google OAuth access token
  /\bsk[A-Za-z0-9]{24,}/g, // Sanity
  /\b[0-9a-f]{32}\b/gi, // Twilio auth token, and anything else shaped like it
  /**
   * Last, and deliberately broad: any bare run of 24 or more characters that
   * mixes letters and digits.
   *
   * A log is not a place that needs opaque identifiers legible, and a secret
   * nobody has written a pattern for is exactly the one that gets out. The
   * cost is that a long booking id or a request id is replaced too, which is
   * the right side to err on.
   */
  /\b(?=[A-Za-z0-9_-]{24,}\b)(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{24,}\b/g,
];

export const REDACTED = "[redacted]";

/** Best-effort text redaction; use safeError for untrusted error messages. */
export function redactSecrets(text: string): string {
  let safe = text;
  for (const shape of SECRET_SHAPES) {
    safe = safe.replace(shape, REDACTED);
  }
  return safe;
}

export interface SafeErrorLog {
  message:
    | "Network request failed"
    | "Request timed out"
    | "Upstream request failed"
    | "Validation failed"
    | "Unknown error";
  /** HTTP status (100-599), or numeric sentinel 0 when unavailable or invalid. */
  status: number;
}

/**
 * The two things a log is allowed to carry about a failure: a fixed
 * message and a status code. Never the error object, which drags along the
 * request, its headers and whatever the client attached to it.
 */
export function safeError(error: unknown): SafeErrorLog {
  try {
    const details = error && typeof error === "object"
      ? error as { code?: unknown; name?: unknown; statusCode?: unknown; status?: unknown }
      : undefined;
    const candidate =
      details?.statusCode ?? details?.status;
    const status = typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 100 && candidate <= 599
      ? candidate : 0;
    // Never forward provider messages: URLs, authorization and bodies can contain secrets.
    let message: SafeErrorLog["message"] = "Unknown error";
    if (details?.code === "ETIMEDOUT" || details?.name === "TimeoutError") {
      message = "Request timed out";
    } else if (typeof details?.code === "string" && ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN", "ENETUNREACH"].includes(details.code)) {
      message = "Network request failed";
    } else if (details?.name === "ZodError" || details?.name === "ValidationError") {
      message = "Validation failed";
    } else if (status !== 0) {
      message = "Upstream request failed";
    }
    return {
      message,
      status,
    };
  } catch {
    // Getters and Proxy traps can throw secrets too. Never inspect or log that failure.
    return { message: "Unknown error", status: 0 };
  }
}
