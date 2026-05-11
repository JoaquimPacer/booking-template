import { defineField, defineType } from "sanity";

// Client quote. Rendered on the home page and optionally on service pages.
// Phase 1.5 replicate script will auto-populate these from Google Place reviews.
export const testimonial = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  fields: [
    defineField({
      name: "quote",
      title: "Quote",
      type: "text",
      rows: 4,
      validation: (r) => r.required(),
    }),
    defineField({
      name: "author",
      title: "Author name",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "authorTitle",
      title: "Author title / context",
      type: "string",
      description: "e.g. 'Customer since 2023', 'Verified booking'.",
    }),
    defineField({
      name: "photo",
      title: "Author photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "rating",
      title: "Star rating (1-5)",
      type: "number",
      validation: (r) => r.min(1).max(5).integer(),
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      description: "e.g. 'Google Review', 'Yelp', 'Direct'.",
    }),
    defineField({
      name: "featured",
      title: "Featured on homepage",
      type: "boolean",
      description: "Featured testimonials show on the home page; others rotate or live on /about.",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "author", subtitle: "quote", media: "photo" },
  },
});
