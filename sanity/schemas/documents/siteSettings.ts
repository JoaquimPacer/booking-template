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
