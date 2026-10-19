// Injects Sanity-driven brand colors as inline CSS variables on the document.
// Renders in the <head> from src/app/layout.tsx; runs server-side, no client JS.
//
// We override the shadcn CSS variables (--primary, --background, etc.) so the
// entire site retheme happens whenever a client changes their colors in
// Sanity Studio. Tailwind v4 expects valid color values (hex, oklch, rgb,
// or hsl-with-parens) in CSS variables; bare HSL components like
// "199 89% 48%" don't work, which is why we emit hex directly.

import type { SanityColor, SiteSettings } from "@/lib/sanity-queries";

interface BrandThemeProps {
  siteSettings: SiteSettings | null;
}

// The colors land inside a raw <style> body, where a value containing
// "</style>" would close the tag and let markup after it run. So only real CSS
// color syntax gets through: hex (3, 4, 6 or 8 digits), rgb()/rgba()/hsl()/hsla()
// with numeric arguments, or a bare named color. Anything else uses the default.
const SAFE_CSS_COLOR =
  /^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgba?|hsla?)\([0-9.,%/\s+-]+\)|[a-zA-Z]+)$/;

// @sanity/color-input stores values as { hex: "#...", ... } objects.
// Accept that shape (and string for backward compat) and return a plain hex.
function colorHex(color: SanityColor | string | undefined, fallback: string): string {
  if (!color) return fallback;
  const value = typeof color === "string" ? color : color.hex;
  return typeof value === "string" && SAFE_CSS_COLOR.test(value) ? value : fallback;
}

export function BrandTheme({ siteSettings }: BrandThemeProps) {
  const brand = siteSettings?.brand;

  // Professional, calming default palette (warm cream + sage green + charcoal).
  // A client's Sanity colors override these; an unconfigured deploy still looks
  // intentional rather than stark.
  const primary = colorHex(brand?.primaryColor, "#4f6b5d"); // muted sage green
  const secondary = colorHex(brand?.secondaryColor, "#e6e0d6"); // soft sand
  const accent = colorHex(brand?.accentColor, "#b08d57"); // warm gold
  const background = colorHex(brand?.backgroundColor, "#f7f4ef"); // warm cream
  const foreground = colorHex(brand?.foregroundColor, "#33302b"); // warm charcoal

  // Emit hex values directly. Tailwind v4's @theme inline resolves
  // `bg-primary` -> `background-color: var(--primary)` -> the hex below.
  const css = `:root {
  --primary: ${primary};
  --primary-foreground: ${background};
  --secondary: ${secondary};
  --secondary-foreground: ${foreground};
  --accent: ${accent};
  --accent-foreground: ${foreground};
  --background: ${background};
  --foreground: ${foreground};
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-accent: ${accent};
}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
