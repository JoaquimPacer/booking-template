import { defineField, defineType } from "sanity";

// Generic editable page. Used for /about, /contact, custom pages a client
// wants without code changes. The route folder in src/app/ still needs to
// exist, but the body content comes from here.
export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
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
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        { type: "image", options: { hotspot: true } },
      ],
    }),
    // About-page section headings. Only used by the /about route; other pages
    // can leave these blank. The component falls back to a default when unset.
    defineField({
      name: "storyHeading",
      title: "Story heading (About page)",
      type: "string",
      description:
        'Small eyebrow text above the page title on the About page. Defaults to "My Story" if left blank.',
      initialValue: "My Story",
    }),
    defineField({
      name: "teamHeading",
      title: "Team heading (About page)",
      type: "string",
      description:
        'Heading above the team / bio section on the About page. Defaults to "Meet Theresa" if left blank.',
      initialValue: "Meet Theresa",
    }),
    // Contact-page header copy. Only used by the /contact route; other pages can
    // leave these blank. The component falls back to a default when unset.
    defineField({
      name: "contactEyebrow",
      title: "Eyebrow (Contact page)",
      type: "string",
      description:
        'Small kicker above the heading on the Contact page. Defaults to "Say hello" if left blank. (Only visible on the premium look.)',
      initialValue: "Say hello",
    }),
    defineField({
      name: "contactHeading",
      title: "Heading (Contact page)",
      type: "string",
      description:
        'Main heading on the Contact page. Defaults to "Get in touch" if left blank.',
      initialValue: "Get in touch",
    }),
    defineField({
      name: "contactIntro",
      title: "Intro line (Contact page)",
      type: "string",
      description:
        'Sentence under the "Get in touch" heading on the Contact page. Defaults to "Reach out by phone, email, or text." if left blank.',
      initialValue: "Reach out by phone, email, or text.",
    }),
    defineField({
      name: "contactButtonLabel",
      title: "Button label (Contact page)",
      type: "string",
      description:
        'Label of the booking button on the Contact page. Defaults to "Book a service" if left blank.',
      initialValue: "Book a service",
    }),
    // FAQ-page header copy. Only used by the /faq route; other pages can leave
    // these blank. The component falls back to a default when unset.
    defineField({
      name: "faqEyebrow",
      title: "Eyebrow (FAQ page)",
      type: "string",
      description:
        'Small kicker above the heading on the FAQ page. Defaults to "Good to know" if left blank. (Only visible on the premium look.)',
      initialValue: "Good to know",
    }),
    defineField({
      name: "faqHeading",
      title: "Heading (FAQ page)",
      type: "string",
      description:
        'Main heading on the FAQ page. Defaults to "Frequently asked questions" if left blank.',
      initialValue: "Frequently asked questions",
    }),
    defineField({
      name: "faqIntro",
      title: "Intro line (FAQ page)",
      type: "text",
      rows: 2,
      description:
        'Sentence under the FAQ heading. Defaults to "Find quick answers below. If you don’t see what you’re looking for, get in touch." if left blank.',
      initialValue:
        "Find quick answers below. If you don’t see what you’re looking for, get in touch.",
    }),
    defineField({
      name: "seo",
      title: "SEO override",
      type: "seo",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "slug.current" },
  },
});
