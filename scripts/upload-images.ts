/* eslint-disable no-console */
// scripts/upload-images.ts
//
// Uploads images (from URLs or local files) into Sanity image fields, so the
// site has real pictures without clicking through Studio one field at a time.
//
// This is the UPLOAD half of the imagery pipeline. The GENERATE half (AI image
// generation via ComfyUI / FLUX / OpenAI) just needs to drop files or URLs into
// the IMAGES list below; the upload + linking is identical either way.
//
// SAFE BY DEFAULT: uses setIfMissing, so it never overwrites an image you've
// already set in Studio. Pass --force to replace existing images.
//
// USAGE:
//   npx tsx scripts/upload-images.ts            # dry-run (shows the plan)
//   npx tsx scripts/upload-images.ts --apply    # fetch, upload, and link
//   npx tsx scripts/upload-images.ts --apply --force   # also overwrite existing

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { groq } from "next-sanity";
import type { SanityClient } from "@sanity/client";

type Target =
  | { kind: "instructorPhoto" } // -> instructor.photo
  | { kind: "homeHero" } // -> siteSettings.homeHero
  | { kind: "serviceHero"; slug: string }; // -> service-<slug>.heroImage

interface ImageJob {
  source: string; // http(s) URL or local file path
  alt?: string;
  target: Target;
}

// Real assets available right now. Theresa's headshot is the one genuine photo
// found on her clinic page. AI-generated outputs get appended here later.
const IMAGES: ImageJob[] = [
  {
    source:
      "https://images.squarespace-cdn.com/content/v1/56ccc0017c65e45f2e2049c3/c1afdcb9-6c86-4351-b441-e0f2198dc814/TheresaAtteaHeadshot.jpg",
    alt: "Theresa Attea, LMT",
    target: { kind: "instructorPhoto" },
  },
];

// Field name per target. Hardcoded (not user input), so safe to inline in GROQ.
function fieldFor(t: Target): "photo" | "homeHero" | "heroImage" {
  if (t.kind === "instructorPhoto") return "photo";
  if (t.kind === "homeHero") return "homeHero";
  return "heroImage";
}

async function resolveDoc(sanity: SanityClient, t: Target): Promise<string | null> {
  if (t.kind === "instructorPhoto") {
    return sanity.fetch<string | null>(groq`*[_type=="instructor"][0]._id`);
  }
  if (t.kind === "homeHero") {
    return sanity.fetch<string | null>(groq`*[_type=="siteSettings"][0]._id`);
  }
  const id = `service-${t.slug}`;
  return sanity.fetch<string | null>(groq`*[_id==$id][0]._id`, { id });
}

async function loadBytes(source: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${source}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(source);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Jobs: ${IMAGES.length}  (force=${force})`);
  console.log("");

  for (const job of IMAGES) {
    const field = fieldFor(job.target);
    const docId = await resolveDoc(sanityWrite, job.target);
    const label = `${field} <- ${job.source.slice(0, 64)}`;

    if (!docId) {
      console.log(`  SKIP (no target doc) ${label}`);
      continue;
    }

    if (!apply) {
      console.log(`  would set ${docId}.${field}`);
      continue;
    }

    if (!force) {
      const already = await sanityWrite.fetch<boolean>(
        groq`defined(*[_id==$id][0].${field})`,
        { id: docId },
      );
      if (already) {
        console.log(`  KEEP ${docId}.${field} (already set; use --force to replace)`);
        continue;
      }
    }

    const bytes = await loadBytes(job.source);
    const asset = await sanityWrite.assets.upload("image", bytes, {
      filename: `${field}-${Date.now()}.jpg`,
    });
    const value = {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
      ...(job.alt ? { alt: job.alt } : {}),
    };
    await sanityWrite.patch(docId).set({ [field]: value }).commit();
    console.log(`  SET  ${docId}.${field}  (asset ${asset._id})`);
  }

  console.log("");
  console.log(apply ? "Done." : "(Dry-run. Re-run with --apply to upload.)");
}

main().catch((err) => {
  console.error("Image upload failed:");
  console.error(err);
  process.exit(1);
});
