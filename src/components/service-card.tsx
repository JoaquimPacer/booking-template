// Service card. Title + tagline + optional photo + Book button.
// Photo appears if service.heroImage is set in Sanity; otherwise the card
// falls back to a clean text-only layout.

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { urlFor } from "@/lib/sanity-image";
import type { Service } from "@/lib/sanity-queries";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const imageUrl = service.heroImage
    ? urlFor(service.heroImage)?.width(800).height(500).fit("crop").url()
    : null;

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      {imageUrl && (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={service.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{service.title}</CardTitle>
        {service.tagline && (
          <p className="mt-2 text-sm text-foreground/70">{service.tagline}</p>
        )}
      </CardHeader>
      <CardContent className="mt-auto flex items-center justify-between pt-4">
        <Link
          href={`/services/${service.slug.current}`}
          className="text-sm font-medium text-foreground/80 hover:text-foreground"
        >
          Learn more &rarr;
        </Link>
        <Link
          href={`/book/${service.slug.current}`}
          className={buttonVariants({ size: "sm" })}
        >
          Book
        </Link>
      </CardContent>
    </Card>
  );
}
