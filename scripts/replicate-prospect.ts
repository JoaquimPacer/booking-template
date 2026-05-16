/* eslint-disable no-console */
// scripts/replicate-prospect.ts
//
// Pulls business data from Google Places API (New) and seeds it into a
// Sanity dataset, producing a near-replica of the prospect's business as
// content on our booking-template site.
//
// USAGE:
//   npx tsx scripts/replicate-prospect.ts --place-id="ChIJ..."
//   npx tsx scripts/replicate-prospect.ts --search="Theresa Attea LMT Austin TX"
//   npx tsx scripts/replicate-prospect.ts --search="massage therapy Austin TX" --pick=2
//   npx tsx scripts/replicate-prospect.ts --place-id="ChIJ..." --apply
//
// --search runs a Text Search on Google Places; the script prints the top 5
// matches with their Place IDs and ratings, then proceeds with the #1 match
// by default. Use --pick=N to choose a different rank.
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
  placeId?: string;
  search?: string;
  pick: number;
  apply: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let placeId: string | undefined;
  let search: string | undefined;
  let pick = 1;
  let apply = false;

  for (const arg of args) {
    if (arg.startsWith("--place-id=")) {
      placeId = arg.slice("--place-id=".length).replace(/^["']|["']$/g, "");
    } else if (arg.startsWith("--search=")) {
      search = arg.slice("--search=".length).replace(/^["']|["']$/g, "");
    } else if (arg.startsWith("--pick=")) {
      pick = parseInt(arg.slice("--pick=".length), 10);
    } else if (arg === "--apply") {
      apply = true;
    }
  }

  if (!placeId && !search) {
    console.error("Error: pass either --place-id=<id> OR --search=\"<query>\".");
    console.error('  npx tsx scripts/replicate-prospect.ts --search="Theresa Attea LMT Austin TX"');
    console.error('  npx tsx scripts/replicate-prospect.ts --place-id="ChIJ..."');
    process.exit(1);
  }

  if (placeId && search) {
    console.error("Error: pass --place-id OR --search, not both.");
    process.exit(1);
  }

  if (placeId && (placeId.startsWith("http") || placeId.includes("/"))) {
    console.error("Error: --place-id looks like a URL, not a Place ID.");
    console.error("Place IDs are short strings like 'ChIJN1t_tDeuEmsRUsoyG83frY4'.");
    console.error("");
    console.error("Either pass a direct Place ID, or use --search to look up by name:");
    console.error('  npx tsx scripts/replicate-prospect.ts --search="business name + city"');
    process.exit(1);
  }

  return { placeId, search, pick, apply };
}

interface TextSearchMatch {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
}

async function searchPlaces(query: string, apiKey: string): Promise<TextSearchMatch[]> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const fieldMask = "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places search returned ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { places?: TextSearchMatch[] };
  return data.places ?? [];
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

async function resolvePlaceId(args: CliArgs, apiKey: string): Promise<string> {
  if (args.placeId) return args.placeId;

  // Search mode
  console.log(`Searching Google Places for: "${args.search}"...`);
  const matches = await searchPlaces(args.search!, apiKey);

  if (matches.length === 0) {
    console.error(`No matches found for "${args.search}". Try a more specific query (include city, state).`);
    process.exit(1);
  }

  console.log(`\nFound ${matches.length} match${matches.length === 1 ? "" : "es"}. Top 5:\n`);
  matches.slice(0, 5).forEach((m, i) => {
    const star = m.rating ? `${m.rating}★` : "no rating";
    const count = m.userRatingCount ?? 0;
    console.log(`  ${i + 1}. ${m.displayName?.text ?? "(no name)"} (${star}, ${count} reviews)`);
    console.log(`     ${m.formattedAddress ?? ""}`);
    console.log(`     Place ID: ${m.id}`);
  });

  const idx = args.pick - 1;
  if (idx < 0 || idx >= matches.length) {
    console.error(`\n--pick=${args.pick} is out of range (1-${matches.length}).`);
    process.exit(1);
  }

  const chosen = matches[idx];
  console.log(`\nUsing #${args.pick}: ${chosen.displayName?.text} (${chosen.id})`);
  console.log("(To pick a different match, re-run with --pick=N.)\n");
  return chosen.id;
}

async function main() {
  const args = parseArgs();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("Error: GOOGLE_PLACES_API_KEY is not set in .env");
    console.error("Get one at console.cloud.google.com > APIs & Services > Credentials.");
    process.exit(1);
  }

  const placeId = await resolvePlaceId(args, apiKey);

  console.log(`Fetching Place ${placeId}...`);
  const place = await fetchPlaceDetails(placeId, apiKey);
  console.log(`Got: ${place.displayName?.text ?? "(unknown)"} (${place.rating ?? "?"}★, ${place.userRatingCount ?? 0} reviews)`);

  const plan = buildSeedPlan(place, placeId);

  if (!args.apply) {
    previewPlan(plan);
    return; // natural exit; avoids libuv UV_HANDLE_CLOSING assertion on Windows
  }

  await applyPlan(plan, placeId);
}

main().catch((err) => {
  console.error("\nReplicate failed:");
  console.error(err);
  process.exit(1);
});
