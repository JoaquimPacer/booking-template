// Full-width hero with overlay text. Background is video (preferred),
// image (fallback), or gradient (final fallback). All Sanity-driven.
// Overlay opacity is configurable per-client; text-shadow on the title
// adds extra legibility safety regardless of overlay strength.

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { urlFor } from "@/lib/sanity-image";
import { cn } from "@/lib/utils";
import { ctaSizeClasses, ctaAlignClass, type CtaSize, type CtaAlign } from "@/lib/cta";
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
      <div
        className="absolute inset-0 -z-10"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayAlpha})` }}
        aria-hidden="true"
      />
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center">
        <h1
          className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mx-auto mt-6 max-w-2xl text-balance text-xl text-background/90 md:text-2xl"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            {subtitle}
          </p>
        )}
        {showCta && (
          <div className={cn("mt-10 flex", ctaAlignClass(ctaAlign))}>
            <Link
              href={ctaHref}
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
