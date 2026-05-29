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
      description:
        "Optional. The title shown in the browser tab + as the blue link in Google results. Leave blank to auto-use your business name. Aim ~50-60 chars if you set it.",
      validation: (r) => r.max(60),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta description",
      type: "text",
      rows: 3,
      description:
        "Optional. The grey summary line under the title in Google results. Leave blank to auto-use your tagline/description. Aim ~150-160 chars if you set it.",
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
