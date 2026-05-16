// Sanity image URL builder. Use to generate sized, optimized image URLs
// from a Sanity image reference.
//
// Example:
//   import { urlFor } from "@/lib/sanity-image";
//   <img src={urlFor(siteSettings.brand.logo).width(200).url()} />
//
// Sanity's image CDN serves automatic WebP, AVIF, and on-the-fly resize/crop.

import { createImageUrlBuilder } from "@sanity/image-url";
import { sanity } from "./sanity";
import type { SanityImage } from "./sanity-queries";

const builder = createImageUrlBuilder(sanity);

export function urlFor(source: SanityImage | null | undefined) {
  if (!source) return null;
  return builder.image(source);
}
