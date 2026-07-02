import { defineArrayMember, defineField, defineType } from "sanity";
import { orderRankField } from "@sanity/orderable-document-list";

// Marketing-side of a bookable service. Operational fields (price, duration,
// capacity) live in Postgres on the Service table; this doc holds the
// storytelling content. The two are linked by `slug`.
export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "booking", title: "Pricing & booking" },
    { name: "media", title: "Images" },
    { name: "seo", title: "SEO / Google" },
  ],
  fields: [
    // Active first, so it's easy to toggle a service on/off without scrolling.
    defineField({
      name: "isActive",
      title: "Active (showing on the site)",
      type: "boolean",
      description: "Turn off to hide this service from the public site without deleting it.",
      initialValue: true,
      group: "content",
    }),
    defineField({
      name: "title",
      title: "Service name",
      type: "string",
      validation: (r) => r.required(),
      group: "content",
    }),
    defineField({
      name: "slug",
      title: "URL slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
      group: "content",
    }),
    defineField({
      name: "tagline",
      title: "Tagline (1 line)",
      type: "string",
      description: "Short line shown on service cards. Aim under 80 chars.",
      validation: (r) => r.max(120),
      group: "content",
    }),
    defineField({
      name: "durationMinutes",
      title: "Duration (minutes)",
      type: "number",
      description: "Length of the session in minutes. Used in service cards, detail pages, and time-slot picker. Example: 60 for a one-hour session.",
      validation: (r) => r.positive().integer(),
      group: "booking",
    }),
    defineField({
      name: "priceCents",
      title: "Price (in cents)",
      type: "number",
      description: "Price in CENTS (multiply dollars by 100). Example: $80 = 8000. Used for display + Stripe checkout. Stored in cents to avoid floating-point money bugs.",
      validation: (r) => r.positive().integer(),
      group: "booking",
    }),
    defineField({
      name: "bufferMinutes",
      title: "Cleanup time after (minutes)",
      type: "number",
      description: "Extra time reserved after this session before the next booking can start (cleanup, notes, reset). Leave blank or 0 for none. Example: 15.",
      initialValue: 0,
      validation: (r) => r.min(0).integer(),
      group: "booking",
    }),
    defineField({
      name: "description",
      title: "Short description",
      type: "text",
      rows: 3,
      description:
        "Not shown on the page. It's the backup text Google shows under your link in search results, used only if you leave the Meta description (in the SEO / Google tab) blank. Aim 150-160 characters.",
      group: "content",
    }),
    defineField({
      name: "body",
      title: "Full description (rich text)",
      type: "array",
      of: [{ type: "block" }, { type: "image" }],
      description: "Shown on the service detail page.",
      group: "content",
    }),
    defineField({
      name: "heroImage",
      title: "Hero image",
      type: "image",
      options: { hotspot: true },
      group: "media",
    }),
    defineField({
      name: "gallery",
      title: "Image gallery",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              type: "string",
              title: "Describe this photo (alt text)",
              description:
                "One short sentence about what the photo shows. Helps Google understand the photo and screen readers describe it.",
            },
          ],
        },
      ],
      group: "media",
    }),
    defineField({
      name: "whatToExpect",
      title: "What to expect",
      type: "array",
      of: [{ type: "block" }],
      description: "Step-by-step or bulleted list of what the client experiences.",
      group: "content",
    }),
    // Optional cancellation policy. When both are left blank the service page
    // shows nothing; fill them to add a collapsible policy section (same
    // accordion the FAQ page uses). Per-service so each treatment can have its
    // own wording (e.g. oncology gets a gentler illness clause).
    defineField({
      name: "cancellationHeading",
      title: "Cancellation policy heading (optional)",
      type: "string",
      description:
        'Optional. Title shown on the collapsible policy on this service page, e.g. "Cancellation Policy for Oncology Massage". Leave blank to hide the policy entirely.',
      group: "content",
    }),
    defineField({
      name: "cancellationBody",
      title: "Cancellation policy text (optional)",
      type: "array",
      of: [{ type: "block" }],
      description:
        "Optional. The policy itself, shown inside the collapsible section when expanded. Leave blank to hide it.",
      group: "content",
    }),
    // Drag-to-reorder: editors reorder services by dragging them in the
    // Services list (no typing numbers). The plugin stores the position here.
    { ...orderRankField({ type: "service" }), group: "content" },
    // Legacy numeric order, hidden from the form. Kept as a tiebreak so the
    // public site still has a stable order before the first drag.
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 100,
      hidden: true,
      group: "content",
    }),
    defineField({
      name: "bookingUrl",
      title: "Booking link for this service (optional)",
      type: "url",
      description:
        "Optional. Paste this service's exact JaneApp (or other scheduler) link so the Book button lands right on this treatment. Leave blank to use the site-wide booking link from Site Settings.",
      group: "booking",
    }),
    defineField({
      name: "options",
      title: "Length / price options",
      type: "array",
      group: "booking",
      description:
        "Leave empty for a single-price service (it uses the Duration and Price above). Add two or more options to offer different lengths (e.g. 60 and 90 minutes), each with its own price and booking link. When set, these take over and the service page shows a length picker.",
      of: [
        defineArrayMember({
          type: "object",
          name: "serviceOption",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              description: 'Shown on the picker, e.g. "60 minutes".',
              validation: (r) => r.required(),
            }),
            defineField({
              name: "durationMinutes",
              title: "Duration (minutes)",
              type: "number",
              validation: (r) => r.positive().integer(),
            }),
            defineField({
              name: "priceCents",
              title: "Price (in cents)",
              type: "number",
              description: "Price in CENTS (dollars times 100). $135 = 13500.",
              validation: (r) => r.positive().integer(),
            }),
            defineField({
              name: "bookingUrl",
              title: "Booking link for this option",
              type: "url",
              description:
                "The JaneApp (or other scheduler) deep link for this specific length.",
            }),
          ],
          preview: {
            select: {
              label: "label",
              priceCents: "priceCents",
              durationMinutes: "durationMinutes",
            },
            prepare({ label, priceCents, durationMinutes }) {
              const name =
                label ||
                (typeof durationMinutes === "number"
                  ? `${durationMinutes} minutes`
                  : "Option");
              const price =
                typeof priceCents === "number"
                  ? ` — $${(priceCents / 100).toFixed(2).replace(/\.00$/, "")}`
                  : "";
              return { title: `${name}${price}` };
            },
          },
        }),
      ],
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
      group: "booking",
    }),
    defineField({
      name: "seo",
      title: "SEO override",
      type: "seo",
      group: "seo",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "tagline", media: "heroImage" },
  },
});
