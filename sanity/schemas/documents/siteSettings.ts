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
    { name: "booking", title: "Booking" },
    { name: "pages", title: "Page labels" },
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
    defineField({
      name: "priceRange",
      title: "Price range",
      type: "string",
      description:
        'Optional. A short price range shown in your Google business listing, e.g. "$135-$185" or "$$". Leave blank to omit it.',
      group: "business",
    }),

    // ---- Look & feel ----
    defineField({
      name: "brand",
      title: "Colors, fonts, logo",
      type: "brand",
      group: "branding",
    }),

    // ---- Booking ----
    defineField({
      name: "externalBookingUrl",
      title: "External booking link (e.g. JaneApp)",
      type: "url",
      description:
        "Optional. If you take bookings through an outside scheduler like JaneApp (which also handles payments and patient privacy), paste your booking page link here. When set, every 'Book' button on the site sends clients there in a new tab, and the built-in scheduler is skipped. Leave blank to use the built-in scheduler.",
      group: "booking",
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
      description:
        "Optional heading for the 'about' section below the hero (e.g. 'Welcome'). NOTE: the PHOTO shown in this section comes from 'Instructors' in the left sidebar (edit your photo + bio there), not here.",
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
                "One short sentence, e.g. 'Massage table by the window with soft lighting'. Helps Google understand the photo and screen readers describe it.",
            },
          ],
        },
      ],
      description: "Optional. 3-6 images shown in a grid on the homepage (the space, atmosphere, etc.).",
      validation: (r) => r.max(8),
      group: "homepage",
    }),

    // ---- Homepage section copy ----
    // Headings, eyebrows, subtitles, and button labels for the three repeating
    // homepage sections (Services / Testimonials / final call-to-action). Each is
    // optional with the current wording as its default, so the homepage looks the
    // same until an editor changes it. The eyebrow lines only show on the premium
    // presets (they are hidden in Classic by design).
    defineField({
      name: "servicesEyebrow",
      title: "Services section eyebrow",
      type: "string",
      description:
        'Small kicker above the Services heading on the homepage. Defaults to "What we offer". (Only visible on the premium look.)',
      initialValue: "What we offer",
      group: "homepage",
    }),
    defineField({
      name: "servicesHeading",
      title: "Services section heading",
      type: "string",
      description: 'Heading of the Services section on the homepage. Defaults to "Our services".',
      initialValue: "Our services",
      group: "homepage",
    }),
    defineField({
      name: "servicesSubtitle",
      title: "Services section subtitle",
      type: "string",
      description:
        'Sentence under the Services heading on the homepage. Defaults to "Book directly online. Find a time that works for you.".',
      initialValue: "Book directly online. Find a time that works for you.",
      group: "homepage",
    }),
    defineField({
      name: "servicesButtonLabel",
      title: 'Services section "see all" button',
      type: "string",
      description:
        'Label of the button under the homepage services grid (only shows when there are more than 6 services). Defaults to "See all services".',
      initialValue: "See all services",
      group: "homepage",
    }),
    defineField({
      name: "testimonialsEyebrow",
      title: "Testimonials section eyebrow",
      type: "string",
      description:
        'Small kicker above the Testimonials heading on the homepage. Defaults to "Kind words". (Only visible on the premium look.)',
      initialValue: "Kind words",
      group: "homepage",
    }),
    defineField({
      name: "testimonialsHeading",
      title: "Testimonials section heading",
      type: "string",
      description: 'Heading of the Testimonials section on the homepage. Defaults to "What clients are saying".',
      initialValue: "What clients are saying",
      group: "homepage",
    }),
    defineField({
      name: "testimonialsSubtitle",
      title: "Testimonials section subtitle",
      type: "string",
      description:
        'Sentence under the Testimonials heading on the homepage. Defaults to "Real reviews from real people.".',
      initialValue: "Real reviews from real people.",
      group: "homepage",
    }),
    defineField({
      name: "finalCtaEyebrow",
      title: "Closing section eyebrow",
      type: "string",
      description:
        'Small kicker above the closing "Ready to book?" heading at the bottom of the homepage. Defaults to "Get started". (Only visible on the premium look.)',
      initialValue: "Get started",
      group: "homepage",
    }),
    defineField({
      name: "finalCtaHeading",
      title: "Closing section heading",
      type: "string",
      description: 'Heading of the closing section at the bottom of the homepage. Defaults to "Ready to book?".',
      initialValue: "Ready to book?",
      group: "homepage",
    }),
    defineField({
      name: "finalCtaSubtitle",
      title: "Closing section subtitle",
      type: "string",
      description:
        'Sentence under the closing heading on the homepage. Defaults to "Browse our services and find an open time today.".',
      initialValue: "Browse our services and find an open time today.",
      group: "homepage",
    }),
    defineField({
      name: "finalCtaButtonLabel",
      title: "Closing section button",
      type: "string",
      description: 'Label of the button in the closing homepage section. Defaults to "See services".',
      initialValue: "See services",
      group: "homepage",
    }),

    // ---- Page labels ----
    // Shared headings used outside the homepage: the Services LIST page header,
    // and the section labels that repeat on every individual service page. Each
    // is optional with its current wording as the default, so nothing changes
    // until an editor edits it.
    defineField({
      name: "servicesPageEyebrow",
      title: "Services page eyebrow",
      type: "string",
      description:
        'Small kicker above the heading on the main Services list page (/services). Defaults to "What we offer". (Only visible on the premium look.)',
      initialValue: "What we offer",
      group: "pages",
    }),
    defineField({
      name: "servicesPageHeading",
      title: "Services page heading",
      type: "string",
      description: 'Big heading on the main Services list page (/services). Defaults to "Services".',
      initialValue: "Services",
      group: "pages",
    }),
    defineField({
      name: "whatToExpectHeading",
      title: '"What to expect" heading',
      type: "string",
      description:
        'Heading above the "what to expect" section on every service page (shows only when that service has the content filled in). Defaults to "What to expect".',
      initialValue: "What to expect",
      group: "pages",
    }),
    defineField({
      name: "galleryHeading",
      title: "Service gallery heading",
      type: "string",
      description:
        'Heading above the photo gallery on a service page (shows only when that service has gallery images). Defaults to "Gallery".',
      initialValue: "Gallery",
      group: "pages",
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
          name: "addressLocality",
          title: "City",
          type: "string",
          description: "City, for your Google business listing (e.g. Austin).",
        }),
        defineField({
          name: "addressRegion",
          title: "State / region",
          type: "string",
          description: "State or region (e.g. TX).",
        }),
        defineField({
          name: "postalCode",
          title: "ZIP / postal code",
          type: "string",
        }),
        defineField({
          name: "addressCountry",
          title: "Country code",
          type: "string",
          description: "Two-letter country code (e.g. US).",
          initialValue: "US",
        }),
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
