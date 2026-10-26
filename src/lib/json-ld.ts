// Serializer for JSON-LD blocks.
//
// The payload goes inside <script type="application/ld+json">, whose contents
// the HTML parser reads as raw text: the first literal "</script" ENDS the
// block, whatever the JSON says. A page title of
//   </script><script>alert(1)</script>
// therefore closes our block and opens an attacker's. Page titles come from
// Sanity, so anyone with Studio access (or anything that can write to the
// dataset) could inject script into every page carrying that title.
//
// JSON.stringify does not escape "<", so the escaping happens here. These are
// all valid JSON string escapes and parse back to the same characters, so a
// consumer reading our structured data sees the original text.

// Line separator and paragraph separator are legal inside a JSON string but
// illegal as raw characters in a script body. Built from char codes so this
// file stays free of invisible characters.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const HTML_SENSITIVE: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

const SENSITIVE_PATTERN = new RegExp(
  `[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`,
  "g",
);

/**
 * JSON for safe embedding in an inline <script>. Use this instead of
 * JSON.stringify anywhere the result lands in HTML.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    SENSITIVE_PATTERN,
    (char) => HTML_SENSITIVE[char],
  );
}
