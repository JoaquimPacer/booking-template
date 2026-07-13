import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  DM_Serif_Display,
  Geist,
  Geist_Mono,
  Inter,
  Lora,
  Merriweather,
  Montserrat,
  Playfair_Display,
  Poppins,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import { BrandTheme } from "@/components/brand-theme";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StyleSwitcher } from "@/components/style-switcher";
import { getSiteSettings } from "@/lib/sanity-queries";
import { urlFor } from "@/lib/sanity-image";
import { getSiteUrl } from "@/lib/seo";

// The curated set of Google Fonts available in Sanity's font dropdown. Each gets
// its own CSS variable; we pick which one to apply at render time based on
// siteSettings.brand.headingFont and bodyFont.
//
// Only the two fonts that the default "classic" preset actually paints are
// preloaded (rel=preload font links): the heading font Merriweather and the body
// font Geist. The rest are loaded on demand and carry preload: false, so they are
// still fully usable if a client picks them in Sanity, but they no longer emit
// extra preload links that delay the hero LCP image. A client who switches their
// heading/body font in Sanity keeps that font (it just loads without a preload
// hint); if a different default font becomes common, move its preload here.
const geistSans = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], preload: false });
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], preload: false });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  preload: false,
});
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const dmSerif = DM_Serif_Display({
  variable: "--font-dmserif",
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
});

// Map Sanity font names to CSS variable names.
const FONT_VAR_MAP: Record<string, string> = {
  Geist: "--font-geist",
  Inter: "--font-inter",
  "Playfair Display": "--font-playfair",
  "DM Serif Display": "--font-dmserif",
  "Cormorant Garamond": "--font-cormorant",
  Lora: "--font-lora",
  Merriweather: "--font-merriweather",
  Montserrat: "--font-montserrat",
  Poppins: "--font-poppins",
};

function fontVar(name: string | undefined, fallback: string): string {
  const varName = FONT_VAR_MAP[name ?? ""] ?? "--font-geist";
  return `var(${varName}), ${fallback}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  // Favicon (browser-tab icon) from Sanity, if the client uploaded one.
  const faviconUrl = settings?.brand?.favicon
    ? urlFor(settings.brand.favicon)?.width(64).height(64).url()
    : null;
  return {
    // Base URL for resolving relative OG-image and canonical URLs to absolute.
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: settings?.defaultSeo?.metaTitle ?? settings?.name ?? "Booking",
      template: `%s | ${settings?.name ?? "Booking"}`,
    },
    description: settings?.defaultSeo?.metaDescription ?? settings?.tagline,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();
  const headingFontStack = fontVar(siteSettings?.brand?.headingFont, "system-ui, sans-serif");
  const bodyFontStack = fontVar(siteSettings?.brand?.bodyFont, "system-ui, sans-serif");
  // Design preset from Sanity; every preset's CSS is keyed off this attribute
  // in globals.css. Missing field = B - Editorial, the house default
  // (datasets with an explicit choice are unaffected).
  const stylePreset = siteSettings?.brand?.stylePreset ?? "warm-editorial";
  // Demo switcher shows on preview deployments + local dev, never production.
  const showStyleSwitcher = process.env.VERCEL_ENV !== "production";

  return (
    <html
      lang="en"
      data-style={stylePreset}
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfair.variable} ${lora.variable} ${merriweather.variable} ${montserrat.variable} ${cormorant.variable} ${poppins.variable} ${dmSerif.variable} h-full antialiased`}
      style={{
        ["--font-heading" as string]: headingFontStack,
        ["--font-body" as string]: bodyFontStack,
      }}
    >
      <head>
        <BrandTheme siteSettings={siteSettings} />
        {/* Pre-paint JS marker: scroll-reveal styles only apply when this is
            set, so content is never hidden for crawlers or no-JS visitors. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.setAttribute('data-js','')",
          }}
        />
      </head>
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}
      >
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {showStyleSwitcher ? <StyleSwitcher /> : null}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
