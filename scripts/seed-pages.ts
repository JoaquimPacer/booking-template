/* eslint-disable no-console */
// scripts/seed-pages.ts
//
// Seeds the editable "page" documents for /about, /contact, and /faq so their
// header text fields become editable in Studio. Until these exist, every field
// shows the component's hardcoded fallback and cannot be changed without code.
//
// Each field is seeded to its CURRENT fallback value, so the pages render
// byte-identical; this only moves the existing copy into Sanity. We deliberately
// do NOT set `body` on the About page: the About component branches on whether a
// body exists (no body => it shows siteSettings.description and uses different
// spacing), so seeding an empty body would CHANGE what renders. Body stays unset.
//
// USAGE:
//   npx tsx scripts/seed-pages.ts            # dry-run (prints the plan)
//   npx tsx scripts/seed-pages.ts --apply    # write published docs to Sanity
//
// Idempotent: deterministic ids ("page-<slug>"), so re-running updates in place
// rather than duplicating. createOrReplace on a non-"drafts." id writes the
// PUBLISHED document directly (same approach as scripts/seed-nav.ts).

import "dotenv/config";

// One object per route. Keys map 1:1 to the fields the matching page component
// reads from its page document, set to that component's exact fallback string.
const PAGES: Array<Record<string, unknown> & { _id: string; slug: string }> = [
  {
    _id: "page-about",
    slug: "about",
    // Read by src/app/about/page.tsx
    title: "About", // aboutPage?.title ?? "About"
    storyHeading: "My Story", // aboutPage?.storyHeading ?? "My Story"
    teamHeading: "Meet Theresa", // aboutPage?.teamHeading ?? "Meet Theresa"
    // body intentionally omitted (see header note).
  },
  {
    _id: "page-contact",
    slug: "contact",
    // Read by src/app/contact/page.tsx. `title` is required by the schema but
    // the Contact component never renders it (its <h1> uses contactHeading), so
    // this value is a Studio-only label and does not appear on the page.
    title: "Contact",
    contactEyebrow: "Say hello", // contactPage?.contactEyebrow ?? "Say hello"
    contactHeading: "Get in touch", // contactPage?.contactHeading ?? "Get in touch"
    contactIntro: "Reach out by phone, email, or text.", // contactPage?.contactIntro ?? "Reach out by phone, email, or text."
    contactButtonLabel: "Book a service", // contactPage?.contactButtonLabel ?? "Book a service"
  },
  {
    _id: "page-faq",
    slug: "faq",
    // Read by src/app/faq/page.tsx. `title` is required by the schema but the
    // FAQ component never renders it (its <h1> uses faqHeading), so this value
    // is a Studio-only label and does not appear on the page.
    title: "FAQ",
    faqEyebrow: "Good to know", // faqPage?.faqEyebrow ?? "Good to know"
    faqHeading: "Frequently asked questions", // faqPage?.faqHeading ?? "Frequently asked questions"
    // faqPage?.faqIntro ?? "Find quick answers below. ..." — curly apostrophes
    // copied exactly from the component fallback.
    faqIntro:
      "Find quick answers below. If you don’t see what you’re looking for, get in touch.",
  },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"}`);
  console.log(`Pages: ${PAGES.length}`);
  for (const p of PAGES) {
    const fields = Object.keys(p).filter((k) => k !== "_id" && k !== "slug");
    console.log(`  ${p._id}  (/${p.slug})  fields: ${fields.join(", ")}`);
  }
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to write the published docs above.)");
    return;
  }

  for (const p of PAGES) {
    const { _id, slug, ...fields } = p;
    await sanityWrite.createOrReplace({
      _id, // no "drafts." prefix => published document
      _type: "page",
      slug: { _type: "slug", current: slug },
      ...fields,
    } as { _id: string; _type: string });
    console.log(`  wrote published ${_id} (/${slug})`);
  }
  console.log("");
  console.log("Done. The About/Contact/FAQ header fields are now editable in Studio > Page.");
}

main().catch((err) => {
  console.error("Page seed failed:");
  console.error(err);
  process.exit(1);
});
