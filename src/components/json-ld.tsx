// Generic component to embed a JSON-LD object inside a page.
// Renders a <script type="application/ld+json"> tag. Server-only.

import { serializeJsonLd } from "../lib/json-ld";

interface JsonLdProps {
  data: object | null;
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // serializeJsonLd, never JSON.stringify: the content of this tag is raw
      // text to the HTML parser, so an unescaped "</script>" inside any value
      // (a Sanity page title, say) would close the block and let the rest run
      // as markup. See src/lib/json-ld.ts.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
