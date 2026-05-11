import { defineField, defineType } from "sanity";

// Brand theme tokens. Inject as CSS variables at runtime in src/app/layout.tsx
// so the entire site retheme happens whenever these values change in Sanity.
// Each client's Sanity dataset = their own visual identity, zero code changes needed.
export const brand = defineType({
  name: "brand",
  title: "Brand theme",
  type: "object",
  fields: [
    defineField({
      name: "primaryColor",
      title: "Primary color",
      type: "string",
      description: "Hex value (e.g. #0ea5e9). Used for CTAs, links, brand highlights.",
      initialValue: "#0ea5e9",
      validation: (r) => r.regex(/^#([0-9a-fA-F]{3}){1,2}$/, { name: "hex color" }),
    }),
    defineField({
      name: "secondaryColor",
      title: "Secondary color",
      type: "string",
      description: "Hex value. Used for secondary buttons, accents.",
      initialValue: "#64748b",
      validation: (r) => r.regex(/^#([0-9a-fA-F]{3}){1,2}$/, { name: "hex color" }),
    }),
    defineField({
      name: "accentColor",
      title: "Accent color",
      type: "string",
      description: "Hex value. Used sparingly for highlights, badges, success states.",
      initialValue: "#10b981",
      validation: (r) => r.regex(/^#([0-9a-fA-F]{3}){1,2}$/, { name: "hex color" }),
    }),
    defineField({
      name: "backgroundColor",
      title: "Page background",
      type: "string",
      description: "Hex value. The default page background.",
      initialValue: "#ffffff",
      validation: (r) => r.regex(/^#([0-9a-fA-F]{3}){1,2}$/, { name: "hex color" }),
    }),
    defineField({
      name: "foregroundColor",
      title: "Text color",
      type: "string",
      description: "Hex value. The default body text color.",
      initialValue: "#0f172a",
      validation: (r) => r.regex(/^#([0-9a-fA-F]{3}){1,2}$/, { name: "hex color" }),
    }),
    defineField({
      name: "headingFont",
      title: "Heading font",
      type: "string",
      description: "Google Font family name (e.g. Playfair Display, Inter). Used for h1-h6.",
      initialValue: "Geist",
    }),
    defineField({
      name: "bodyFont",
      title: "Body font",
      type: "string",
      description: "Google Font family name. Used for body text.",
      initialValue: "Geist",
    }),
    defineField({
      name: "logo",
      title: "Logo (light backgrounds)",
      type: "image",
      description: "SVG or transparent PNG, shown in the header.",
    }),
    defineField({
      name: "logoDark",
      title: "Logo (dark backgrounds)",
      type: "image",
      description: "Optional. Used over dark hero overlays. Falls back to the main logo if not set.",
    }),
    defineField({
      name: "favicon",
      title: "Favicon",
      type: "image",
      description: "32x32 or 64x64 PNG/ICO. Shown in browser tabs.",
    }),
  ],
});
