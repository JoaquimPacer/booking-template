// Service card. The WHOLE card is one big clickable target (navigates to the
// service detail page, which has the prominent "Book this service" button).
// No small per-card button: the whole card is the affordance.
//
// Shows: optional photo, title, tagline, duration, price. Photo/duration/price
// appear only when set in Sanity.

import Image from "next/image";
import Link from "next/link";
import { Clock, Flower2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { urlFor } from "@/lib/sanity-image";
import { formatDurationMinutes, formatPriceCents } from "@/lib/format";
import type { Service } from "@/lib/sanity-queries";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const imageUrl = service.heroImage
    ? urlFor(service.heroImage)?.width(800).height(500).fit("crop").url()
    : null;
  const options = Array.isArray(service.options) ? service.options : [];
  const hasOptions = options.length > 0;
  const optDurations = options
    .map((o) => o.durationMinutes)
    .filter((d): d is number => typeof d === "number");
  const optPrices = options
    .map((o) => o.priceCents)
    .filter((p): p is number => typeof p === "number");
  const duration = hasOptions
    ? optDurations.map((d) => formatDurationMinutes(d)).join(" or ")
    : formatDurationMinutes(service.durationMinutes);
  const price = hasOptions
    ? optPrices.length
      ? `from ${formatPriceCents(Math.min(...optPrices))}`
      : ""
    : formatPriceCents(service.priceCents);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {/* Stretched link: covers the whole card (image included) and navigates to
          the detail page. z-10 so it sits ABOVE the relative image container,
          which otherwise swallows clicks on the photo. No other interactive
          children, so nothing needs to sit above it. */}
      <Link
        href={`/services/${service.slug.current}`}
        className="absolute inset-0 z-10"
        aria-label={`Learn more about ${service.title}`}
      />

      {/* Image area is ALWAYS present so every card is the same height. With a
          photo it shows it; without, an on-brand gradient placeholder keeps the
          grid tidy until a hero image is added in Sanity. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={service.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--brand-primary, #4f6b5d), var(--brand-secondary, #e6e0d6))",
            }}
            aria-hidden="true"
          >
            <Flower2 className="size-10 text-background/70" />
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="text-xl transition-colors group-hover:text-primary">
          {service.title}
        </CardTitle>
        {service.tagline && (
          <p className="mt-2 text-sm text-foreground/70">{service.tagline}</p>
        )}
        {(duration || price) && (
          <div className="mt-3 flex items-center gap-4 text-base text-foreground/80">
            {duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden="true" />
                {duration}
              </span>
            )}
            {price && <span className="font-semibold">{price}</span>}
          </div>
        )}
      </CardHeader>
      <CardContent className="mt-auto pt-4">
        <span className="inline-flex items-center gap-1 text-base font-semibold text-primary transition-all group-hover:gap-2">
          View details &amp; book &rarr;
        </span>
      </CardContent>
    </Card>
  );
}
