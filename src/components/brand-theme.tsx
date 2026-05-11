// Injects Sanity-driven brand colors as inline CSS variables on the document.
// Renders in the <head> from src/app/layout.tsx; runs server-side, no client JS.
//
// shadcn/ui's components read CSS variables like `--primary` (HSL parts).
// We override those from siteSettings.brand so the entire site retheme
// happens whenever a client changes their colors in Sanity Studio.

import { hexToHsl } from "@/lib/hex-to-hsl";
import type { SiteSettings } from "@/lib/sanity-queries";

interface BrandThemeProps {
  siteSettings: SiteSettings | null;
}

export function BrandTheme({ siteSettings }: BrandThemeProps) {
  const brand = siteSettings?.brand;

  // Defaults match shadcn's slate base.
  const primary = brand?.primaryColor ?? "#0f172a";
  const secondary = brand?.secondaryColor ?? "#64748b";
  const accent = brand?.accentColor ?? "#10b981";
  const background = brand?.backgroundColor ?? "#ffffff";
  const foreground = brand?.foregroundColor ?? "#0f172a";

  const css = `:root {
  --primary: ${hexToHsl(primary)};
  --primary-foreground: ${hexToHsl(background)};
  --secondary: ${hexToHsl(secondary)};
  --secondary-foreground: ${hexToHsl(foreground)};
  --accent: ${hexToHsl(accent)};
  --accent-foreground: ${hexToHsl(foreground)};
  --background: ${hexToHsl(background)};
  --foreground: ${hexToHsl(foreground)};
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-accent: ${accent};
}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
