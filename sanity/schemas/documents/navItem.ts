import { defineField, defineType } from "sanity";

// One navigation entry. Header and footer nav both pull from here filtered
// by the `location` field. Lets clients add/reorder nav items without code.
export const navItem = defineType({
  name: "navItem",
  title: "Navigation item",
  type: "document",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "href",
      title: "Link target",
      type: "string",
      description: "Internal path (e.g. /services) or external URL.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "location",
      title: "Where it appears",
      type: "string",
      options: {
        list: [
          { title: "Header only", value: "header" },
          { title: "Footer only", value: "footer" },
          { title: "Both", value: "both" },
        ],
        layout: "radio",
      },
      initialValue: "header",
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 100,
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "href" },
  },
});
