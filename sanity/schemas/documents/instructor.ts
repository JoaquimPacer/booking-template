import { defineField, defineType } from "sanity";

// Practitioner / instructor / staff bio. Surfaced on the About page and
// optionally on service pages (e.g. "Provided by Theresa").
export const instructor = defineType({
  name: "instructor",
  title: "Instructor",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "title",
      title: "Title / credentials",
      type: "string",
      description: "e.g. 'Licensed Massage Therapist', 'LMT, 8 years experience'.",
    }),
    defineField({
      name: "slug",
      title: "URL slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "specialties",
      title: "Specialties",
      type: "array",
      of: [{ type: "string" }],
      description: "Short tags shown as pills.",
    }),
    defineField({
      name: "yearsExperience",
      title: "Years of experience",
      type: "number",
    }),
    defineField({
      name: "social",
      title: "Social links",
      type: "object",
      fields: [
        defineField({ name: "instagram", type: "url" }),
        defineField({ name: "linkedin", type: "url" }),
      ],
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "title", media: "photo" },
  },
});
