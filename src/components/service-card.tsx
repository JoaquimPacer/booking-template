// Service card. The WHOLE card is one big clickable target (navigates to the
// service detail page, which has the prominent "Book this service" button).
// No small per-card button: the whole card is the affordance.
//
// Shows: optional photo, title, tagline, duration, price. Photo/duration/price
// appear only when set in Sanity.

import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
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
  const duration = formatDurationMinutes(service.durationMinutes);
  const price = formatPriceCents(service.priceCents);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {/* Stretched link: covers the whole card, navigates to the detail page.
          Sits behind interactive children via z-0. */}
      <Link
        href={`/services/${service.slug.current}`}
        className="absolute inset-0 z-0"
        aria-label={`Learn more about ${service.title}`}
      />

      {imageUrl && (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={service.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
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
