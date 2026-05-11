import { defineField, defineType } from "sanity";

// Reusable SEO object embedded inside other documents.
// Each page/service/instructor can have its own SEO override; if absent,
// siteSettings.defaultSeo provides fallback values.
export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta title",
      type: "string",
      description: "Shown in browser tab + Google search results. Aim ~50-60 chars.",
      validation: (r) => r.max(60),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta description",
      type: "text",
      rows: 3,
      description: "Shown under the title in Google search results. Aim ~150-160 chars.",
      validation: (r) => r.max(160),
    }),
    defineField({
      name: "ogImage",
      title: "Social share image (Open Graph)",
      type: "image",
      description: "Shown when someone shares the page on Facebook, LinkedIn, etc. Recommended 1200x630px.",
    }),
  ],
});
