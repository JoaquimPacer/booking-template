// Generic component to embed a JSON-LD object inside a page.
// Renders a <script type="application/ld+json"> tag. Server-only.

interface JsonLdProps {
  data: object | null;
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
