import { defineField, defineType } from "sanity";
import { orderRankField } from "@sanity/orderable-document-list";

// Marketing-side of a bookable service. Operational fields (price, duration,
// capacity) live in Postgres on the Service table; this doc holds the
// storytelling content. The two are linked by `slug`.
export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  fields: [
    // Active first, so it's easy to toggle a service on/off without scrolling.
    defineField({
      name: "isActive",
      title: "Active (showing on the site)",
      type: "boolean",
      description: "Turn off to hide this service from the public site without deleting it.",
      initialValue: true,
    }),
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
    // Drag-to-reorder: editors reorder services by dragging them in the
    // Services list (no typing numbers). The plugin stores the position here.
    orderRankField({ type: "service" }),
    // Legacy numeric order, hidden from the form. Kept as a tiebreak so the
    // public site still has a stable order before the first drag.
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 100,
      hidden: true,
    }),
    defineField({
      name: "bookingUrl",
      title: "Booking link for this service (optional)",
      type: "url",
      description:
        "Optional. Paste this service's exact JaneApp (or other scheduler) link so the Book button lands right on this treatment. Leave blank to use the site-wide booking link from Site Settings.",
    }),
    defineField({
      name: "bookingMode",
      title: "How can this be booked?",
      type: "string",
      description:
        "Online booking shows the time-slot picker. Inquire only shows a 'contact to book' button instead (use this for packages or anything you handle by hand). Not bookable hides the booking button entirely.",
      options: {
        list: [
          { title: "Online booking (time-slot picker)", value: "slots" },
          { title: "Inquire only (contact to book)", value: "inquire" },
          { title: "Not bookable (hide booking button)", value: "hidden" },
        ],
        layout: "radio",
      },
      initialValue: "slots",
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
