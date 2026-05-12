/* eslint-disable no-console */
// scripts/replicate-prospect.ts
//
// Pulls business data from Google Places API (New) and seeds it into a
// Sanity dataset, producing a near-replica of the prospect's business as
// content on our booking-template site.
//
// USAGE:
//   npx tsx scripts/replicate-prospect.ts --place-id="ChIJ..."
//   npx tsx scripts/replicate-prospect.ts --place-id="ChIJ..." --dry-run
//
// REQUIRED ENV (in .env at project root):
//   GOOGLE_PLACES_API_KEY      Google Cloud key with Places API (New) enabled
//   NEXT_PUBLIC_SANITY_PROJECT_ID
//   NEXT_PUBLIC_SANITY_DATASET (defaults to 'production')
//   SANITY_API_WRITE_TOKEN     Editor-permission token from sanity.io/manage
//
// WHAT IT WRITES:
//   1. Updates the singleton siteSettings doc:
//        - name, tagline, description (from Place)
//        - contact.phone, contact.address, contact.googleMapsUrl, contact.googlePlaceId
//        - contact.hours (from Place opening_hours)
//   2. Creates ~3 testimonial docs from top Place reviews (featured = true)
//
// WHAT IT DOES NOT DO (deferred to Phase 1.5C+ or manual):
//   - Generate service docs (massage types vary per prospect; human judgment needed)
//   - Upload Place photos as Sanity images (each photo would need a fetch+upload step)
//   - Generate instructor bios (requires looking at the business's actual staff)
//   - Tune brand colors (visual decision)
//
// SAFETY:
//   - Default mode does a dry-run preview before writing. Use --apply to actually write.
//   - WARNING: writes to the live Sanity dataset. To preserve the original Lonestar
//     Demo content, first export the dataset (`sanity dataset export`).
//   - Recommendation: run this against a NEW Sanity project per prospect rather
//     than overwriting the demo. See README for the per-prospect-project workflow.

import "dotenv/config";

interface CliArgs {
  placeId: string;
  apply: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let placeId = "";
  let apply = false;

  for (const arg of args) {
    if (arg.startsWith("--place-id=")) {
      placeId = arg.slice("--place-id=".length).replace(/^["']|["']$/g, "");
    } else if (arg === "--apply") {
      apply = true;
    }
  }

  if (!placeId) {
    console.error("Error: --place-id=<id> is required.");
    console.error('Example: npx tsx scripts/replicate-prospect.ts --place-id="ChIJ..."');
    process.exit(1);
  }

  return { placeId, apply };
}

interface PlaceDetails {
  name: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  editorialSummary?: { text: string };
  reviews?: Array<{
    name: string;
    rating: number;
    text?: { text: string };
    authorAttribution?: { displayName: string };
    publishTime?: string;
  }>;
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetails> {
  const fields = [
    "displayName",
    "formattedAddress",
    "nationalPhoneNumber",
    "internationalPhoneNumber",
    "regularOpeningHours",
    "rating",
    "userRatingCount",
    "websiteUri",
    "googleMapsUri",
    "editorialSummary",
    "reviews",
    "primaryType",
    "primaryTypeDisplayName",
  ].join(",");

  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}&key=${apiKey}`;

  const res = await fetch(url, {
    headers: { "X-Goog-FieldMask": fields },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API returned ${res.status}: ${body}`);
  }

  return (await res.json()) as PlaceDetails;
}

interface SeedPlan {
  siteSettings: {
    name: string;
    tagline?: string;
    description?: string;
    contact: {
      phone?: string;
      address?: string;
      hours?: string;
      googleMapsUrl?: string;
      googlePlaceId: string;
    };
  };
  testimonials: Array<{
    quote: string;
    author: string;
    rating: number;
    source: string;
    featured: boolean;
  }>;
}

function buildSeedPlan(place: PlaceDetails, placeId: string): SeedPlan {
  const name = place.displayName?.text ?? place.name ?? "Unnamed Business";
  const summary = place.editorialSummary?.text;
  const tagline = summary
    ? summary.split(".")[0]
    : place.primaryTypeDisplayName?.text;

  const reviews = (place.reviews ?? []).filter((r) => r.rating >= 4 && r.text?.text);
  const testimonials = reviews.slice(0, 3).map((r) => ({
    quote: r.text!.text,
    author: r.authorAttribution?.displayName ?? "Verified visitor",
    rating: r.rating,
    source: "Google Review",
    featured: true,
  }));

  return {
    siteSettings: {
      name,
      tagline,
      description: summary,
      contact: {
        phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
        address: place.formattedAddress,
        hours: place.regularOpeningHours?.weekdayDescriptions?.join("\n"),
        googleMapsUrl: place.googleMapsUri,
        googlePlaceId: placeId,
      },
    },
    testimonials,
  };
}

function previewPlan(plan: SeedPlan) {
  console.log("\n=== SEED PLAN (dry run) ===\n");
  console.log("Site Settings:");
  console.log(`  Name:        ${plan.siteSettings.name}`);
  console.log(`  Tagline:     ${plan.siteSettings.tagline ?? "(none)"}`);
  console.log(`  Description: ${plan.siteSettings.description ?? "(none)"}`);
  console.log(`  Phone:       ${plan.siteSettings.contact.phone ?? "(none)"}`);
  console.log(`  Address:     ${plan.siteSettings.contact.address ?? "(none)"}`);
  console.log(`  Hours:`);
  (plan.siteSettings.contact.hours ?? "").split("\n").forEach((h) => console.log(`    ${h}`));
  console.log(`\nTestimonials to create (${plan.testimonials.length}):`);
  plan.testimonials.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.rating}★] ${t.author}: "${t.quote.slice(0, 80)}..."`);
  });
  console.log("\nTo apply, re-run with --apply.\n");
}

async function applyPlan(plan: SeedPlan, _placeId: string) {
  // Lazy-load to avoid env requirement on dry-run.
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log("\n=== APPLYING ===");

  // Update siteSettings (singleton at document id "siteSettings")
  console.log("Updating siteSettings...");
  await sanityWrite.createOrReplace({
    _id: "siteSettings",
    _type: "siteSettings",
    ...plan.siteSettings,
  });

  // Create testimonials
  for (const [i, t] of plan.testimonials.entries()) {
    console.log(`Creating testimonial ${i + 1}/${plan.testimonials.length}...`);
    await sanityWrite.create({
      _type: "testimonial",
      ...t,
    });
  }

  console.log("Done. Verify at: localhost:3000 (after restart) or your Vercel deploy.");
}

async function main() {
  const { placeId, apply } = parseArgs();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("Error: GOOGLE_PLACES_API_KEY is not set in .env");
    console.error("Get one at console.cloud.google.com > APIs & Services > Credentials.");
    process.exit(1);
  }

  console.log(`Fetching Place ${placeId}...`);
  const place = await fetchPlaceDetails(placeId, apiKey);
  console.log(`Got: ${place.displayName?.text ?? "(unknown)"} (${place.rating ?? "?"}★, ${place.userRatingCount ?? 0} reviews)`);

  const plan = buildSeedPlan(place, placeId);

  if (!apply) {
    previewPlan(plan);
    process.exit(0);
  }

  await applyPlan(plan, placeId);
}

main().catch((err) => {
  console.error("\nReplicate failed:");
  console.error(err);
  process.exit(1);
});
