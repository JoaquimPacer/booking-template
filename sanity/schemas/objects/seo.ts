import { defineField, defineType } from "sanity";
import { CharacterCountInput } from "../../components/CharacterCountInput";

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
        "Optional. The blue link line in Google results. On a service or inner page your business name is added to the end automatically, so write only the specific part, for example 'Oncology Massage in South Austin' (aim ~30-45 chars; it becomes ~55 with your name). On the site-wide default below it shows exactly as typed, so include your name there (aim ~50-60). Leave blank to auto-use the page name.",
      validation: (r) => r.max(60),
      components: { input: CharacterCountInput },
    }),
    defineField({
      name: "metaDescription",
      title: "Meta description",
      type: "text",
      rows: 3,
      description:
        "Optional. The grey summary line under the title in Google results. Leave blank to auto-use your tagline/description. Aim ~150-160 chars if you set it.",
      validation: (r) => r.max(160),
      components: { input: CharacterCountInput },
    }),
    defineField({
      name: "ogImage",
      title: "Social share image (Open Graph)",
      type: "image",
      description: "Shown when someone shares the page on Facebook, LinkedIn, etc. Recommended 1200x630px.",
    }),
  ],
});
