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
import "./globals.css";

import { BrandTheme } from "@/components/brand-theme";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteSettings } from "@/lib/sanity-queries";
import { urlFor } from "@/lib/sanity-image";

// Preload the curated set of Google Fonts available in Sanity's font dropdown.
// Each gets its own CSS variable; we pick which one to apply at render time
// based on siteSettings.brand.headingFont and bodyFont.
const geistSans = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const dmSerif = DM_Serif_Display({
  variable: "--font-dmserif",
  subsets: ["latin"],
  weight: ["400"],
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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfair.variable} ${lora.variable} ${merriweather.variable} ${montserrat.variable} ${cormorant.variable} ${poppins.variable} ${dmSerif.variable} h-full antialiased`}
      style={{
        ["--font-heading" as string]: headingFontStack,
        ["--font-body" as string]: bodyFontStack,
      }}
    >
      <head>
        <BrandTheme siteSettings={siteSettings} />
      </head>
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        style={{ fontFamily: "var(--font-body, system-ui, sans-serif)" }}
      >
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
