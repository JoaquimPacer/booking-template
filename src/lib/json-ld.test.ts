// WHY these tests matter: JSON-LD is emitted inside an inline <script>, and
// the HTML parser treats that tag's contents as raw text. A single unescaped
// "</script>" in any value ends the block and everything after it is parsed as
// markup. Page titles, service names and business names all come from Sanity,
// so this is the path from "someone can edit content" to "someone can run
// script on every page". If an assertion here fails, that hole is open again.

import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

const BREAKOUT = '</script><script>alert(1)</script>';

describe("serializeJsonLd", () => {
  it("never emits a literal </script> for a hostile page title", () => {
    const out = serializeJsonLd({
      "@type": "BreadcrumbList",
      name: BREAKOUT,
    });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c");
  });

  it("escapes the closing sequence even when it is split across keys", () => {
    const out = serializeJsonLd({ a: "</scr", b: "ipt>" });
    expect(out.toLowerCase()).not.toContain("</scr");
  });

  it("escapes < > and & wherever they appear, keys included", () => {
    const out = serializeJsonLd({ "a<b": "c>d&e" });
    expect(out).not.toMatch(/[<>&]/);
  });

  it("escapes the line and paragraph separators", () => {
    const out = serializeJsonLd({
      a: `x${String.fromCharCode(0x2028)}y${String.fromCharCode(0x2029)}z`,
    });
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(out).not.toContain(String.fromCharCode(0x2029));
  });

  it("round-trips to the identical object, so consumers read the real text", () => {
    // Escaping must not change the data search engines actually parse.
    const data = {
      "@context": "https://schema.org",
      name: BREAKOUT,
      description: "Brakes & rotors <fast>",
    };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("matches JSON.stringify when there is nothing to escape", () => {
    const data = { "@type": "LocalBusiness", name: "Example Studio" };
    expect(serializeJsonLd(data)).toBe(JSON.stringify(data));
  });
});
