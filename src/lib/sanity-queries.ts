// GROQ (Sanity's query language) helpers for fetching content.
// Cached via Next.js ISR (revalidate per page); see usage in src/app/.

import { groq } from "next-sanity";
import { sanity } from "./sanity";
import { REVALIDATE_SECONDS } from "./cache";

// ============================================================================
// TYPES (kept loose for now; tighten per-use as content stabilizes)
// ============================================================================

export type Cta = {
  label?: string;
  href?: string;
  style?: "primary" | "secondary" | "ghost" | "hidden";
  size?: "small" | "normal" | "large" | "xlarge";
  align?: "left" | "center" | "right";
};

export type SiteSettings = {
  name: string;
  tagline?: string;
  description?: string;
  priceRange?: string;
  headerCta?: Cta;
  heroCta?: Cta;
  externalBookingUrl?: string;
  brand?: {
    stylePreset?: string;
    primaryColor?: SanityColor;
    secondaryColor?: SanityColor;
    accentColor?: SanityColor;
    backgroundColor?: SanityColor;
    foregroundColor?: SanityColor;
    headingFont?: string;
    bodyFont?: string;
    logo?: SanityImage;
    favicon?: SanityImage;
  };
  homeHero?: SanityImage;
  homeHeroVideoUrl?: string;
  // Resolved download URL of an uploaded hero video file (see getSiteSettings).
  heroVideoFileUrl?: string;
  homeHeroOverlayOpacity?: number;
  homeIntroHeading?: string;
  homeIntroBody?: string;
  homeGallery?: SanityImage[];
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
    hours?: string;
    googleMapsUrl?: string;
    googlePlaceId?: string;
  };
  social?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };
  footerText?: string;
  defaultSeo?: SeoFields;
};

export type SeoFields = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: SanityImage;
};

export type SanityImage = {
  _type: "image";
  asset: { _ref: string; _type: "reference" };
  /** Editor-written description (alt text) for accessibility + image SEO. */
  alt?: string;
};

// @sanity/color-input returns an object like { hex: "#0ea5e9", hsl: {...}, rgb: {...}, alpha: 1 }
// We only use the hex value.
export type SanityColor = {
  hex: string;
  alpha?: number;
};

export type NavItem = {
  _id: string;
  label: string;
  href: string;
  location: "header" | "footer" | "both";
  order: number;
};

export type ServiceOption = {
  label?: string;
  durationMinutes?: number;
  priceCents?: number;
  bookingUrl?: string;
};

export type Service = {
  _id: string;
  title: string;
  slug: { current: string };
  tagline?: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  priceCents?: number;
  bookingUrl?: string;
  options?: ServiceOption[];
  bookingMode?: "slots" | "inquire" | "hidden";
  description?: string;
  body?: unknown;
  heroImage?: SanityImage;
  gallery?: SanityImage[];
  whatToExpect?: unknown;
  order?: number;
  isActive?: boolean;
  seo?: SeoFields;
};

export type Instructor = {
  _id: string;
  name: string;
  title?: string;
  slug?: { current: string };
  photo?: SanityImage;
  bio?: unknown;
  specialties?: string;
  yearsExperience?: number;
};

export type Faq = {
  _id: string;
  question: string;
  answer: unknown;
  category?: string;
  order?: number;
};

export type Testimonial = {
  _id: string;
  quote: string;
  author: string;
  authorTitle?: string;
  photo?: SanityImage;
  rating?: number;
  source?: string;
  featured?: boolean;
};

export type Page = {
  _id: string;
  title: string;
  slug: { current: string };
  body?: unknown;
  // About-page section headings (optional; only the /about page uses them).
  storyHeading?: string;
  teamHeading?: string;
  seo?: SeoFields;
};

// ============================================================================
// QUERIES
// ============================================================================

export async function getSiteSettings(): Promise<SiteSettings | null> {
  // The `...` spread returns every field; the alias resolves the uploaded hero
  // video file (if any) to a playable URL so the Hero can prefer it over a pasted URL.
  return sanity.fetch<SiteSettings | null>(
    groq`*[_type == "siteSettings"][0]{ ..., "heroVideoFileUrl": homeHeroVideo.asset->url }`,
    {},
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getNavItems(
  location: "header" | "footer" = "header",
): Promise<NavItem[]> {
  return sanity.fetch<NavItem[]>(
    groq`*[_type == "navItem" && (location == $location || location == "both")] | order(order asc) { _id, label, href, location, order }`,
    { location },
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getAllServices(): Promise<Service[]> {
  return sanity.fetch<Service[]>(
    groq`*[_type == "service" && isActive != false] | order(orderRank asc, order asc) { _id, title, slug, tagline, description, durationMinutes, priceCents, bookingUrl, options[]{label, durationMinutes, priceCents, bookingUrl}, bookingMode, heroImage, order, isActive, seo }`,
    {},
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  return sanity.fetch<Service | null>(
    groq`*[_type == "service" && slug.current == $slug][0]`,
    { slug },
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getAllInstructors(): Promise<Instructor[]> {
  return sanity.fetch<Instructor[]>(
    groq`*[_type == "instructor"] | order(name asc) { _id, name, title, slug, photo, bio, specialties, yearsExperience }`,
    {},
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getAllFaqs(): Promise<Faq[]> {
  return sanity.fetch<Faq[]>(
    groq`*[_type == "faq"] | order(category asc, order asc) { _id, question, answer, category, order }`,
    {},
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getFeaturedTestimonials(): Promise<Testimonial[]> {
  return sanity.fetch<Testimonial[]>(
    groq`*[_type == "testimonial" && featured == true] | order(_createdAt desc) { _id, quote, author, authorTitle, photo, rating, source, featured }`,
    {},
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getAllTestimonials(): Promise<Testimonial[]> {
  return sanity.fetch<Testimonial[]>(
    groq`*[_type == "testimonial"] | order(_createdAt desc) { _id, quote, author, authorTitle, photo, rating, source, featured }`,
    {},
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  return sanity.fetch<Page | null>(
    groq`*[_type == "page" && slug.current == $slug][0]`,
    { slug },
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
}
