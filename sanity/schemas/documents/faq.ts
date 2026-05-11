import { defineField, defineType } from "sanity";

// One question + answer. The /faq page groups these by category and renders
// in an accordion (open one, close others). Also surfaces as FAQPage
// schema.org structured data.
export const faq = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  fields: [
    defineField({
      name: "question",
      title: "Question",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "answer",
      title: "Answer",
      type: "array",
      of: [{ type: "block" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Group FAQs by topic (e.g. 'Booking', 'Pricing', 'Preparation').",
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 100,
    }),
  ],
  preview: {
    select: { title: "question", subtitle: "category" },
  },
});
