// WHY these tests matter: <JsonLd> writes Sanity content (business name, page
// titles, FAQ answers) into an inline <script>. The HTML parser reads that
// tag's body as raw text, so a literal "</script>" in any value closes the tag
// and whatever follows runs as markup, and a literal "<!--" can push the
// parser into a state where the real closing tag no longer closes the block.
// Every client fork renders this component on every page, so a failure here
// means anyone who can edit content can run script on the whole site.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./json-ld";

function render(data: object) {
  return renderToStaticMarkup(JsonLd({ data }));
}

function body(html: string) {
  return html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
}

describe("JsonLd", () => {
  const hostile = {
    "@context": "https://schema.org",
    name: "</script><script>alert(1)</script>",
    description: "<!--<script>alert(2)//",
    alternateName: "</SCRIPT >",
    commentEnd: "-->",
    lineSeparator: String.fromCharCode(0x2028),
    paragraphSeparator: String.fromCharCode(0x2029),
  };

  it("emits exactly one structured-data script element", () => {
    const html = render({ "@context": "https://schema.org", name: "Example business" });
    expect(html.match(/<script/gi)).toHaveLength(1);
    expect(html.match(/<\/script/gi)).toHaveLength(1);
    expect(html.endsWith("</script>")).toBe(true);
  });

  it.each([
    ["script-close", "</script"],
    ["comment-open", "<!--"],
    ["comment-close", "-->"],
    ["line-separator", String.fromCharCode(0x2028)],
    ["paragraph-separator", String.fromCharCode(0x2029)],
  ])("escapes %s in the rendered fixture", (_label, sequence) => {
    // Both fixture coverage and escaping are required, independently per sequence.
    const covered = Object.values(hostile).some((value) => value.toLowerCase().includes(sequence));
    expect(covered && !body(render(hostile)).toLowerCase().includes(sequence)).toBe(true);
  });

  it("still parses back to the original data, so search engines read the real text", () => {
    expect(JSON.parse(body(render(hostile)))).toEqual(hostile);
  });

  it("renders nothing when there is no data", () => {
    expect(JsonLd({ data: null })).toBeNull();
  });
});
