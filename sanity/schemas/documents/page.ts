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
