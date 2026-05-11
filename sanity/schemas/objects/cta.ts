import { defineField, defineType } from "sanity";

// Reusable call-to-action button. Embedded in hero, service pages, etc.
export const cta = defineType({
  name: "cta",
  title: "Call to Action",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Button label",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "href",
      title: "Link target",
      type: "string",
      description: "Internal path (e.g. /book) or external URL.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "style",
      title: "Button style",
      type: "string",
      options: {
        list: [
          { title: "Primary (filled)", value: "primary" },
          { title: "Secondary (outlined)", value: "secondary" },
          { title: "Ghost (text only)", value: "ghost" },
        ],
        layout: "radio",
      },
      initialValue: "primary",
    }),
  ],
});
