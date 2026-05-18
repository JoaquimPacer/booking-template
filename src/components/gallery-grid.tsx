// Gallery section. 3-6 images in a responsive grid. Optional; renders
// nothing if no images are passed.

import Image from "next/image";
import { urlFor } from "@/lib/sanity-image";
import type { SanityImage } from "@/lib/sanity-queries";

interface GalleryGridProps {
  images: SanityImage[];
  heading?: string;
}

export function GalleryGrid({ images, heading = "Gallery" }: GalleryGridProps) {
  if (!images || images.length === 0) return null;

  return (
    <section className="border-t border-border bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{heading}</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {images.map((img, i) => {
            const url = urlFor(img)?.width(800).height(800).fit("crop").auto("format").url();
            if (!url) return null;
            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg bg-background"
              >
                <Image
                  src={url}
                  alt={`Gallery image ${i + 1}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
