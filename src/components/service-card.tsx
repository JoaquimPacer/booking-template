// Service card. Title + tagline + Book button. Operational data (price,
// duration) will join in Phase 2 from Postgres.

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { Service } from "@/lib/sanity-queries";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between transition-shadow hover:shadow-md">
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
