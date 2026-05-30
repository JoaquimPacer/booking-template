/* eslint-disable no-console */
// scripts/seed-nav.ts
//
// Seeds the site navigation menu (the links in the top bar + mobile hamburger
// and the footer). Without these, the menu shows only the "Book Now" button.
//
// USAGE:
//   npx tsx scripts/seed-nav.ts            # dry-run (prints the plan)
//   npx tsx scripts/seed-nav.ts --apply    # write to Sanity
//
// Idempotent: deterministic ids ("nav-<key>"), so re-running updates in place
// rather than duplicating. Edit/reorder/add more later in Studio under
// "Navigation", or change this list and re-run.

import "dotenv/config";

// location: "header" (top bar + hamburger), "footer", or "both".
const NAV = [
  { key: "home", label: "Home", href: "/", location: "both", order: 5 },
  { key: "services", label: "Services", href: "/services", location: "both", order: 10 },
  { key: "about", label: "About", href: "/about", location: "both", order: 20 },
  { key: "faq", label: "FAQ", href: "/faq", location: "both", order: 30 },
  { key: "contact", label: "Contact", href: "/contact", location: "both", order: 40 },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Nav items: ${NAV.length}`);
  for (const n of NAV) console.log(`  ${n.order}  ${n.label} -> ${n.href} (${n.location})`);
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to write.)");
    return;
  }

  for (const n of NAV) {
    await sanityWrite.createOrReplace({
      _id: `nav-${n.key}`,
      _type: "navItem",
      label: n.label,
      href: n.href,
      location: n.location,
      order: n.order,
    });
    console.log(`Wrote nav-${n.key}`);
  }
  console.log("");
  console.log("Done. The top bar + hamburger now show these links. Reorder/edit in Studio > Navigation.");
}

main().catch((err) => {
  console.error("Nav seed failed:");
  console.error(err);
  process.exit(1);
});
