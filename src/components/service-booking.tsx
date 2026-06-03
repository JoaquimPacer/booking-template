"use client";

// Booking block for the service detail page.
//
// - Single-price service (no options): just the "Book this service" button,
//   pointing at the service's booking link (or the site-wide one).
// - Multi-option service (e.g. 60 / 90 min): a length picker; selecting a length
//   updates the Book button to that option's own booking link.
//
// Client component because the length picker is interactive.

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatDurationMinutes, formatPriceCents } from "@/lib/format";
import { bookingHref, isExternalHref } from "@/lib/booking-link";
import type { ServiceOption } from "@/lib/sanity-queries";
import { cn } from "@/lib/utils";

interface ServiceBookingProps {
  slug: string;
  externalBookingUrl?: string | null;
  /** Single-service fallback link (used when there are no options). */
  bookingUrl?: string;
  options?: ServiceOption[];
}

export function ServiceBooking({
  slug,
  externalBookingUrl,
  bookingUrl,
  options,
}: ServiceBookingProps) {
  const hasOptions = Array.isArray(options) && options.length > 0;
  const [selected, setSelected] = useState(0);

  const active = hasOptions ? options![selected] : undefined;
  const href = bookingHref(
    externalBookingUrl,
    slug,
    active ? active.bookingUrl : bookingUrl,
  );
  const external = isExternalHref(href);

  return (
    <div className="space-y-5">
      {hasOptions && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground/70">
            Choose a length
          </legend>
          <div
            role="radiogroup"
            aria-label="Choose a length"
            className="flex flex-wrap gap-3"
          >
            {options!.map((o, i) => {
              const isSelected = i === selected;
              const label =
                o.label ||
                (o.durationMinutes
                  ? formatDurationMinutes(o.durationMinutes)
                  : `Option ${i + 1}`);
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "rounded-full border-2 px-5 py-2.5 text-base font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-foreground/25 bg-background text-foreground/80 hover:border-primary hover:text-foreground",
                  )}
                >
                  {label}
                  {typeof o.priceCents === "number" && (
                    <span
                      className={cn(
                        "ml-2",
                        isSelected ? "text-foreground/70" : "text-foreground/50",
                      )}
                    >
                      {formatPriceCents(o.priceCents)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <Link
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className={cn(buttonVariants(), "h-auto px-8 py-3 text-base")}
      >
        Book this service
      </Link>
    </div>
  );
}
