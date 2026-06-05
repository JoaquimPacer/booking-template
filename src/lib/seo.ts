// SEO helpers: site URL resolution, Metadata builders, JSON-LD builders.
// Used by route-level generateMetadata() and by JSON-LD components.

import type { Metadata } from "next";
import type {
  Faq,
  Instructor,
  SeoFields,
  Service,
  SiteSettings,
} from "@/lib/sanity-queries";
import { urlFor } from "@/lib/sanity-image";

/**
 * Resolves the canonical site URL.
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL (explicit; set this when using a custom domain)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (Vercel's stable production alias, e.g. booking-template.vercel.app)
 *   3. NEXT_PUBLIC_VERCEL_URL / VERCEL_URL (per-deployment URLs; fallback only)
 *   4. localhost (dev fallback)
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Builds a Next.js Metadata object from a SeoFields object (page-level
 * SEO override) plus optional siteSettings (for fallbacks).
 */
export function buildPageMetadata({
  seo,
  fallback,
  path,
  siteSettings,
}: {
  seo?: SeoFields;
  fallback?: { title?: string; description?: string };
  path: string;
  siteSettings: SiteSettings | null;
}): Metadata {
  const title =
    seo?.metaTitle ??
    fallback?.title ??
    siteSettings?.defaultSeo?.metaTitle ??
    siteSettings?.name;

  const description =
    seo?.metaDescription ??
    fallback?.description ??
    siteSettings?.defaultSeo?.metaDescription ??
    siteSettings?.tagline;

  const ogImageUrl = seo?.ogImage
    ? urlFor(seo.ogImage)?.width(1200).height(630).fit("crop").url()
    : siteSettings?.defaultSeo?.ogImage
      ? urlFor(siteSettings.defaultSeo.ogImage)?.width(1200).height(630).fit("crop").url()
      : null;

  const baseUrl = getSiteUrl();
  const canonical = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: title ?? undefined,
      description: description ?? undefined,
      url: canonical,
      siteName: siteSettings?.name,
      type: "website",
      images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? undefined,
      description: description ?? undefined,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

// ============================================================================
// JSON-LD builders (schema.org structured data)
// ============================================================================

/**
 * LocalBusiness schema. Used on home and contact pages.
 * Google may surface this as a rich result: address, hours, phone, etc.
 */
export function buildLocalBusinessJsonLd(siteSettings: SiteSettings | null) {
  if (!siteSettings) return null;

  const baseUrl = getSiteUrl();
  const contact = siteSettings.contact;

  const logoUrl = siteSettings.brand?.logo
    ? urlFor(siteSettings.brand.logo)?.width(400).url()
    : null;

  // Representative image for the Google business card: logo, else the hero
  // still image, else the SEO/OG image. Whichever is set.
  const imageUrl =
    logoUrl ||
    (siteSettings.homeHero ? urlFor(siteSettings.homeHero)?.width(1200).url() : null) ||
    (siteSettings.defaultSeo?.ogImage
      ? urlFor(siteSettings.defaultSeo.ogImage)?.width(1200).url()
      : null);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteSettings.name,
    description: siteSettings.description ?? siteSettings.tagline,
    url: baseUrl,
    ...(logoUrl && { logo: logoUrl }),
    ...(imageUrl && { image: imageUrl }),
    ...(siteSettings.priceRange && { priceRange: siteSettings.priceRange }),
    ...(contact?.phone && { telephone: contact.phone }),
    ...(contact?.email && { email: contact.email }),
    ...(contact?.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: contact.address,
        ...(contact.addressLocality && { addressLocality: contact.addressLocality }),
        ...(contact.addressRegion && { addressRegion: contact.addressRegion }),
        ...(contact.postalCode && { postalCode: contact.postalCode }),
        ...(contact.addressCountry && { addressCountry: contact.addressCountry }),
      },
    }),
    ...(contact?.hours && { openingHours: contact.hours }),
  };
}

/**
 * Service schema. Used on individual service pages.
 */
export function buildServiceJsonLd(
  service: Service,
  siteSettings: SiteSettings | null,
) {
  const baseUrl = getSiteUrl();
  const imageUrl = service.heroImage
    ? urlFor(service.heroImage)?.width(1200).url()
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.tagline ?? service.description,
    url: `${baseUrl}/services/${service.slug.current}`,
    ...(imageUrl && { image: imageUrl }),
    ...(siteSettings && {
      provider: {
        "@type": "LocalBusiness",
        name: siteSettings.name,
        url: baseUrl,
      },
    }),
  };
}

/**
 * Person schema. Used for each instructor on the about page.
 */
export function buildPersonJsonLd(instructor: Instructor) {
  const photoUrl = instructor.photo
    ? urlFor(instructor.photo)?.width(400).url()
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: instructor.name,
    ...(instructor.title && { jobTitle: instructor.title }),
    ...(photoUrl && { image: photoUrl }),
  };
}

/**
 * FAQPage schema. Used on the /faq page. Google may show an FAQ rich
 * result expandable directly in search results.
 */
export function buildFaqPageJsonLd(faqs: Faq[]) {
  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: portableTextToPlainText(faq.answer),
      },
    })),
  };
}

/**
 * BreadcrumbList schema. Used on inner pages to help Google show the
 * breadcrumb path in search results.
 */
export function buildBreadcrumbListJsonLd(
  items: { name: string; path: string }[],
) {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${baseUrl}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

/**
 * Crude PortableText -> plain text extractor for JSON-LD FAQ answers.
 * Pulls text from all block children. Good enough for SEO; not for display.
 */
function portableTextToPlainText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((block: { _type?: string; children?: { text?: string }[] }) => {
      if (block._type !== "block") return "";
      return (block.children ?? [])
        .map((child) => child.text ?? "")
        .join("");
    })
    .filter(Boolean)
    .join("\n");
}
