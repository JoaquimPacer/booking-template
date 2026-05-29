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
      title: "Where the button goes",
      type: "string",
      description: "Pick the page this button opens.",
      options: {
        list: [
          { title: "Services (browse & book)", value: "/services" },
          { title: "Contact", value: "/contact" },
          { title: "About", value: "/about" },
          { title: "FAQ", value: "/faq" },
          { title: "Home", value: "/" },
        ],
      },
      initialValue: "/services",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "style",
      title: "Button style",
      type: "string",
      options: {
        list: [
          { title: "Primary (filled, high contrast)", value: "primary" },
          { title: "Secondary (outlined, transparent)", value: "secondary" },
          { title: "Ghost (text only, minimal)", value: "ghost" },
          { title: "Hidden (no button shown)", value: "hidden" },
        ],
        layout: "radio",
      },
      initialValue: "primary",
    }),
    defineField({
      name: "size",
      title: "Button size",
      type: "string",
      description: "How big the button is. Larger sizes stand out more.",
      options: {
        list: [
          { title: "Small", value: "small" },
          { title: "Normal", value: "normal" },
          { title: "Large", value: "large" },
          { title: "Extra large", value: "xlarge" },
        ],
        layout: "radio",
      },
      initialValue: "normal",
    }),
    defineField({
      name: "align",
      title: "Button position",
      type: "string",
      description:
        "Left, center, or right. Applies on the home hero. (In the top menu bar the button always sits on the right.)",
      options: {
        list: [
          { title: "Left", value: "left" },
          { title: "Center", value: "center" },
          { title: "Right", value: "right" },
        ],
        layout: "radio",
      },
      initialValue: "center",
    }),
  ],
});
