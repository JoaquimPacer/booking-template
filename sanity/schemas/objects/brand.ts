import { defineField, defineType } from "sanity";
import { FontPicker } from "../../components/FontPicker";

// Brand theme tokens. Inject as CSS variables at runtime in src/app/layout.tsx
// so the entire site retheme happens whenever these values change in Sanity.
// Each client's Sanity dataset = their own visual identity, zero code changes needed.
export const brand = defineType({
  name: "brand",
  title: "Brand theme",
  type: "object",
  fields: [
    defineField({
      name: "stylePreset",
      title: "Style preset",
      type: "string",
      description:
        "Switches the whole site's design style in one click. Classic is the original look. Safe to change and change back; your content is never affected.",
      options: {
        list: [
          { title: "Classic (original look)", value: "classic" },
          { title: "Warm Editorial (premium A)", value: "warm-editorial" },
          { title: "Soft Luxe (premium B)", value: "soft-luxe" },
          { title: "Bold Editorial (premium C)", value: "bold-editorial" },
        ],
        layout: "radio",
      },
      initialValue: "classic",
    }),
    defineField({
      name: "primaryColor",
      title: "Primary color",
      type: "color",
      description: "Used for primary buttons, links, and brand highlights. Pick a color that pops against your background.",
      options: { disableAlpha: true },
    }),
    defineField({
      name: "secondaryColor",
      title: "Secondary color",
      type: "color",
      description: "Used for secondary buttons and accents. Often a muted version of your primary.",
      options: { disableAlpha: true },
    }),
    defineField({
      name: "accentColor",
      title: "Accent color",
      type: "color",
      description: "Used sparingly for highlights, badges, and success states. Pick something that stands out.",
      options: { disableAlpha: true },
    }),
    defineField({
      name: "backgroundColor",
      title: "Page background",
      type: "color",
      description: "The default page background. Usually white or a very light neutral.",
      options: { disableAlpha: true },
    }),
    defineField({
      name: "foregroundColor",
      title: "Text color",
      type: "color",
      description: "The default body text color. Usually dark gray or near-black for readability.",
      options: { disableAlpha: true },
    }),
    defineField({
      name: "headingFont",
      title: "Heading font",
      type: "string",
      description: "Font family for headings (h1-h6). Each dropdown option previews in its own font.",
      initialValue: "Geist",
      components: { input: FontPicker },
    }),
    defineField({
      name: "bodyFont",
      title: "Body font",
      type: "string",
      description: "Font family for paragraph text. Should be highly readable.",
      initialValue: "Geist",
      components: { input: FontPicker },
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      description: "SVG or transparent PNG. Shown in the header. Recommend at least 200px wide.",
    }),
    defineField({
      name: "favicon",
      title: "Favicon",
      type: "image",
      description: "32x32 or 64x64 PNG/ICO. Shown in browser tabs.",
    }),
  ],
});
