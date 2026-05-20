import { defineField, defineType } from "sanity";

// Marketing-side of a bookable service. Operational fields (price, duration,
// capacity) live in Postgres on the Service table; this doc holds the
// storytelling content. The two are linked by `slug`.
export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Service name",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "URL slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "tagline",
      title: "Tagline (1 line)",
      type: "string",
      description: "Short line shown on service cards. Aim under 80 chars.",
      validation: (r) => r.max(120),
    }),
    defineField({
      name: "durationMinutes",
      title: "Duration (minutes)",
      type: "number",
      description: "Length of the session in minutes. Used in service cards, detail pages, and time-slot picker. Example: 60 for a one-hour session.",
      validation: (r) => r.positive().integer(),
    }),
    defineField({
      name: "priceCents",
      title: "Price (in cents)",
      type: "number",
      description: "Price in CENTS (multiply dollars by 100). Example: $80 = 8000. Used for display + Stripe checkout. Stored in cents to avoid floating-point money bugs.",
      validation: (r) => r.positive().integer(),
    }),
    defineField({
      name: "bufferMinutes",
      title: "Cleanup time after (minutes)",
      type: "number",
      description: "Extra time reserved after this session before the next booking can start (cleanup, notes, reset). Leave blank or 0 for none. Example: 15.",
      initialValue: 0,
      validation: (r) => r.min(0).integer(),
    }),
    defineField({
      name: "description",
      title: "Short description",
      type: "text",
      rows: 3,
      description: "Used for SEO meta description fallback.",
    }),
    defineField({
      name: "body",
      title: "Full description (rich text)",
      type: "array",
      of: [{ type: "block" }, { type: "image" }],
      description: "Shown on the service detail page.",
    }),
    defineField({
      name: "heroImage",
      title: "Hero image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "gallery",
      title: "Image gallery",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "whatToExpect",
      title: "What to expect",
      type: "array",
      of: [{ type: "block" }],
      description: "Step-by-step or bulleted list of what the client experiences.",
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      description: "Lower numbers appear first on the services page.",
      initialValue: 100,
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      description: "Uncheck to hide from the public site without deleting.",
      initialValue: true,
    }),
    defineField({
      name: "seo",
      title: "SEO override",
      type: "seo",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "tagline", media: "heroImage" },
  },
});
