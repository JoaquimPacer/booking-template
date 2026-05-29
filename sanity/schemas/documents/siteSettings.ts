import { defineField, defineType } from "sanity";

// Site-wide singleton. One document per deploy. Organized into TABS (groups) so
// the editing experience maps to the site top-to-bottom instead of one long
// scroll: Business info, Look & feel, Top bar, Homepage, Contact & footer, SEO.
// Each button (header / hero) lives in the tab for the part of the site it
// appears in, so you never have to hunt for it.
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  groups: [
    { name: "business", title: "Business info", default: true },
    { name: "branding", title: "Look & feel" },
    { name: "topbar", title: "Top bar" },
    { name: "homepage", title: "Homepage" },
    { name: "contact", title: "Contact & footer" },
    { name: "seo", title: "SEO / Google" },
  ],
  fields: [
    // ---- Business info ----
    defineField({
      name: "name",
      title: "Business name",
      type: "string",
      description: "Shown in the header and footer.",
      group: "business",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      description: "Short one-line phrase. Shown as the big headline on the homepage hero.",
      group: "business",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One or two sentences. Shown under the hero headline and used as a fallback for Google.",
      group: "business",
    }),

    // ---- Look & feel ----
    defineField({
      name: "brand",
      title: "Colors, fonts, logo",
      type: "brand",
      group: "branding",
    }),

    // ---- Top bar (header) ----
    defineField({
      name: "headerCta",
      title: "Top-bar button",
      type: "cta",
      description:
        "The button in the top-right of every page. The menu links beside it are managed separately under 'Navigation' in the left sidebar.",
      group: "topbar",
    }),

    // ---- Homepage (top-to-bottom: hero, then intro, then gallery) ----
    defineField({
      name: "homeHero",
      title: "Hero background image",
      type: "image",
      description:
        "Large image behind the hero text. Used when no video is set. Recommend 1920x1080+ landscape. If neither image nor video is set, a brand-color gradient shows instead.",
      options: { hotspot: true },
      group: "homepage",
    }),
    defineField({
      name: "homeHeroVideo",
      title: "Hero background video (upload)",
      type: "file",
      options: { accept: "video/mp4,video/webm" },
      description:
        "Upload a short looping clip (10-30s, no sound). Plays behind the hero text and takes priority over the image. MP4 recommended, keep it under ~15 MB so the page loads fast.",
      group: "homepage",
    }),
    defineField({
      name: "homeHeroVideoUrl",
      title: "Hero video from a link (advanced)",
      type: "url",
      description:
        "Only needed if you are NOT uploading a video above. Paste a hosted video URL. Most people should use the upload field instead.",
      group: "homepage",
    }),
    defineField({
      name: "homeHeroOverlayOpacity",
      title: "Hero overlay darkness (0-80)",
      type: "number",
      description:
        "Darkness of the shade over the hero image/video, as a percentage. Higher = darker (easier to read the text). Lower = brighter. Default 35.",
      initialValue: 35,
      validation: (r) => r.min(0).max(80),
      group: "homepage",
    }),
    defineField({
      name: "heroCta",
      title: "Hero button",
      type: "cta",
      description: "The big button over the homepage hero image/video.",
      group: "homepage",
    }),
    defineField({
      name: "homeIntroHeading",
      title: "Intro heading",
      type: "string",
      description: "Optional heading for the 'about' section below the hero (e.g. 'Welcome').",
      group: "homepage",
    }),
    defineField({
      name: "homeIntroBody",
      title: "Intro paragraph",
      type: "text",
      rows: 4,
      description: "Optional paragraph shown under the intro heading.",
      group: "homepage",
    }),
    defineField({
      name: "homeGallery",
      title: "Gallery images",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      description: "Optional. 3-6 images shown in a grid on the homepage (the space, atmosphere, etc.).",
      validation: (r) => r.max(8),
      group: "homepage",
    }),

    // ---- Contact & footer ----
    defineField({
      name: "contact",
      title: "Contact information",
      type: "object",
      group: "contact",
      fields: [
        defineField({ name: "phone", type: "string" }),
        defineField({ name: "email", type: "string", validation: (r) => r.email() }),
        defineField({ name: "address", type: "text", rows: 3 }),
        defineField({
          name: "hours",
          type: "text",
          rows: 4,
          description: "e.g. Mon-Fri 9am-6pm, Sat 10am-4pm, Closed Sun",
        }),
        defineField({ name: "googleMapsUrl", title: "Google Maps embed URL", type: "url" }),
        defineField({
          name: "googlePlaceId",
          title: "Google Place ID",
          type: "string",
          description: "Used by the replicate script + future reviews display. You usually won't touch this.",
        }),
      ],
    }),
    defineField({
      name: "social",
      title: "Social links",
      type: "object",
      group: "contact",
      fields: [
        defineField({ name: "instagram", type: "url" }),
        defineField({ name: "facebook", type: "url" }),
        defineField({ name: "tiktok", type: "url" }),
        defineField({ name: "youtube", type: "url" }),
      ],
    }),
    defineField({
      name: "footerText",
      title: "Footer text",
      type: "text",
      rows: 2,
      description: "Copyright line, disclaimers, etc.",
      group: "contact",
    }),

    // ---- SEO ----
    defineField({
      name: "defaultSeo",
      title: "Search engine defaults (optional)",
      type: "seo",
      description:
        "Optional. Leave blank and the site fills these in from your business name + tagline. Only set these to override what Google shows.",
      group: "seo",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "tagline" },
  },
});
