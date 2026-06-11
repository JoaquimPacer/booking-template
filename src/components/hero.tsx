// Full-width hero with overlay text. The background image paints immediately as
// the poster (and the Largest Contentful Paint element); if a hero video is set,
// it loads after first paint and fades in over the image, so it never competes
// with the initial page load. Falls back to a brand-color gradient if neither
// image nor video is set. Overlay opacity is configurable per-client; the
// text-shadow on the title adds legibility safety regardless of overlay strength.

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HeroVideo } from "@/components/hero-video";
import { urlFor } from "@/lib/sanity-image";
import { cn } from "@/lib/utils";
import { ctaSizeClasses, ctaAlignClass, type CtaSize, type CtaAlign } from "@/lib/cta";
import { isExternalHref } from "@/lib/booking-link";
import type { SanityImage } from "@/lib/sanity-queries";

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaStyle?: "primary" | "secondary" | "ghost" | "hidden" | string;
  ctaSize?: CtaSize;
  ctaAlign?: CtaAlign;
  image?: SanityImage | null;
  videoUrl?: string | null;
  overlayOpacity?: number | null;
}

function ctaVariantFor(style: string | undefined) {
  if (style === "secondary") return "outline" as const;
  if (style === "ghost") return "ghost" as const;
  return "default" as const;
}

export function Hero({
  title,
  subtitle,
  ctaLabel = "Book now",
  ctaHref = "/services",
  ctaStyle,
  ctaSize,
  ctaAlign,
  image,
  videoUrl,
  overlayOpacity,
}: HeroProps) {
  const imageUrl = image
    ? urlFor(image)?.width(2000).height(1200).fit("crop").auto("format").url()
    : null;

  const overlayAlpha = Math.min(80, Math.max(0, overlayOpacity ?? 35)) / 100;
  const showCta = ctaStyle !== "hidden";
  const variant = ctaVariantFor(ctaStyle);

  return (
    <section className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden bg-foreground text-background">
      {/* Background media: the image paints immediately (poster + LCP); if a
          video is set, it loads a moment later and fades in over the image. */}
      <div className="absolute inset-0 -z-10">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : !videoUrl ? (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--brand-primary, #0f172a), var(--brand-secondary, #475569))",
            }}
          />
        ) : null}
        {videoUrl && (
          <HeroVideo
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      {/* Overlay color/gradient comes from .hero-overlay in globals.css (preset-
          aware); only the strength is passed through as a custom property. */}
      <div
        className="hero-overlay absolute inset-0 -z-10"
        style={{ ["--hero-overlay-alpha" as string]: overlayAlpha }}
        aria-hidden="true"
      />
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center">
        <h1
          className="hero-title text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="hero-subtitle mx-auto mt-6 max-w-2xl text-balance text-xl text-background/90 md:text-2xl"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            {subtitle}
          </p>
        )}
        {showCta && (
          <div className={cn("mt-10 flex", ctaAlignClass(ctaAlign))}>
            <Link
              href={ctaHref}
              {...(isExternalHref(ctaHref)
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className={cn(
                buttonVariants({ variant }),
                ctaSizeClasses(ctaSize),
                variant === "outline" &&
                  "border-2 border-background bg-transparent text-background hover:bg-background/10",
              )}
            >
              {ctaLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
