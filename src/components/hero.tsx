// Full-width hero with overlay text. Background is video (preferred),
// image (fallback), or gradient (final fallback). All Sanity-driven.

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { urlFor } from "@/lib/sanity-image";
import type { SanityImage } from "@/lib/sanity-queries";

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  image?: SanityImage | null;
  videoUrl?: string | null;
}

export function Hero({
  title,
  subtitle,
  ctaLabel = "Book now",
  ctaHref = "/services",
  image,
  videoUrl,
}: HeroProps) {
  const imageUrl = image
    ? urlFor(image)?.width(2000).height(1200).fit("crop").auto("format").url()
    : null;

  return (
    <section className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden bg-foreground text-background">
      {videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-10 object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--brand-primary, #0f172a), var(--brand-secondary, #475569))",
          }}
        />
      )}
      <div className="absolute inset-0 -z-10 bg-black/50" aria-hidden="true" />
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-background/90 md:text-xl">
            {subtitle}
          </p>
        )}
        <div className="mt-10 flex justify-center">
          <Link
            href={ctaHref}
            className={`${buttonVariants({ size: "lg" })} px-8 text-base`}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
