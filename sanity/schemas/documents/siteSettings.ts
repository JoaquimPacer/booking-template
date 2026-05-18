import { defineField, defineType } from "sanity";

// Site-wide singleton. One document per deploy. Holds the business name,
// brand theme, contact info, social links, and default SEO fallbacks.
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Business name",
      type: "string",
      description: "Shown in the header and footer.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      description: "Short one-line description shown in hero and meta tags.",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "Longer description used in About section and SEO fallback.",
    }),
    defineField({
      name: "brand",
      title: "Brand theme (colors, fonts, logos)",
      type: "brand",
    }),
    defineField({
      name: "homeHero",
      title: "Home page hero background image",
      type: "image",
      description: "Large image behind the hero text on the homepage. Recommended 1920x1080+. Used as fallback if homeHeroVideoUrl is not set.",
      options: { hotspot: true },
    }),
    defineField({
      name: "homeHeroVideoUrl",
      title: "Home page hero background video URL",
      type: "url",
      description: "Optional. Direct URL to an .mp4 video (e.g. hosted on Vercel Blob, Mux, or any CDN). Plays as the hero background; takes priority over homeHero image. Should be short (10-30s), no audio, looping-friendly.",
    }),
    defineField({
      name: "homeHeroOverlayOpacity",
      title: "Home page hero overlay darkness (0-80)",
      type: "number",
      description: "Strength of the dark overlay on top of the hero image/video, as a percentage. Higher = darker (better text legibility). Lower = brighter (video shows through more). Default 35.",
      initialValue: 35,
      validation: (r) => r.min(0).max(80),
    }),
    defineField({
      name: "homeIntroHeading",
      title: "Home page intro heading",
      type: "string",
      description: "Optional heading shown above the about-preview section on the home page (e.g. 'Welcome' or 'About').",
    }),
    defineField({
      name: "homeIntroBody",
      title: "Home page intro body",
      type: "text",
      rows: 4,
      description: "Optional paragraph shown below the intro heading.",
    }),
    defineField({
      name: "homeGallery",
      title: "Home page gallery images",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      description: "Optional. 3-6 images shown in a grid on the homepage. Use for showing the space, atmosphere, or before/after.",
      validation: (r) => r.max(8),
    }),
    defineField({
      name: "headerCta",
      title: "Header button",
      type: "cta",
      description: "The primary button in the top navigation bar. Defaults to 'Book now' -> /services if not set.",
    }),
    defineField({
      name: "heroCta",
      title: "Homepage hero button",
      type: "cta",
      description: "The primary button in the homepage hero section. Defaults to 'Book now' -> /services if not set.",
    }),
    defineField({
      name: "contact",
      title: "Contact information",
      type: "object",
      fields: [
        defineField({ name: "phone", type: "string" }),
        defineField({ name: "email", type: "string", validation: (r) => r.email() }),
        defineField({ name: "address", type: "text", rows: 3 }),
        defineField({
          name: "hours",
          type: "text",
          rows: 4,
          description: "e.g. Mon-Fri 9am-6pm, Sat 10am-4pm, Closed Sun",
        }),
        defineField({ name: "googleMapsUrl", title: "Google Maps embed URL", type: "url" }),
        defineField({
          name: "googlePlaceId",
          title: "Google Place ID",
          type: "string",
          description: "Used by Phase 1.5 replicate script + future reviews display.",
        }),
      ],
    }),
    defineField({
      name: "social",
      title: "Social links",
      type: "object",
      fields: [
        defineField({ name: "instagram", type: "url" }),
        defineField({ name: "facebook", type: "url" }),
        defineField({ name: "tiktok", type: "url" }),
        defineField({ name: "youtube", type: "url" }),
      ],
    }),
    defineField({
      name: "footerText",
      title: "Footer text",
      type: "text",
      rows: 2,
      description: "Copyright line, disclaimers, etc.",
    }),
    defineField({
      name: "defaultSeo",
      title: "Default SEO (fallback for pages without explicit SEO)",
      type: "seo",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "tagline" },
  },
});
