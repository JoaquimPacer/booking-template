// Top navigation. Server component. Pulls site name, logo, and header
// nav items from Sanity. The mobile drawer is a separate client component
// (MobileNav) so it can close on tap.

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { urlFor } from "@/lib/sanity-image";
import { cn } from "@/lib/utils";
import { ctaSizeClasses } from "@/lib/cta";
import { resolveCtaHref, isExternalHref } from "@/lib/booking-link";
import { getNavItems, getSiteSettings } from "@/lib/sanity-queries";

export async function SiteHeader() {
  const [siteSettings, navItems] = await Promise.all([
    getSiteSettings(),
    getNavItems("header"),
  ]);

  // Request a tall, aspect-preserving source (crisp on retina at ~h-11 display).
  // fit("max") never upscales or crops, so the logo keeps its own proportions.
  const logoUrl = siteSettings?.brand?.logo
    ? urlFor(siteSettings.brand.logo)?.height(128).fit("max").auto("format").url()
    : null;

  const siteName = siteSettings?.name ?? "Booking Template";
  const headerCtaLabel = siteSettings?.headerCta?.label ?? "Book now";
  const headerCtaHref = resolveCtaHref(
    siteSettings?.headerCta?.href,
    siteSettings?.externalBookingUrl,
  );
  const headerCtaExternal = isExternalHref(headerCtaHref);
  // Respect the "Hidden" style so the Book Now button can be removed from Sanity.
  const showHeaderCta = siteSettings?.headerCta?.style !== "hidden";
  const headerCtaSize = siteSettings?.headerCta?.size;
  const headerCtaVariant =
    siteSettings?.headerCta?.style === "ghost"
      ? ("ghost" as const)
      : siteSettings?.headerCta?.style === "secondary"
        ? ("outline" as const)
        : ("default" as const);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Left: logo / business name. Height-capped, aspect preserved, width
            capped so an unusually wide logo can't crowd the nav. */}
        <Link href="/" className="flex shrink-0 items-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={220}
              height={64}
              priority
              className="h-9 w-auto max-w-[160px] object-contain md:h-11 md:max-w-[200px]"
            />
          ) : (
            <span className="text-lg font-semibold tracking-tight">{siteName}</span>
          )}
        </Link>

        {/* Center: nav links, spread across the bar */}
        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item._id}
              href={item.href}
              className="text-base font-medium text-foreground/75 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: the primary button */}
        {showHeaderCta && (
          <Link
            href={headerCtaHref}
            {...(headerCtaExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cn(
              "hidden shrink-0 md:inline-flex",
              buttonVariants({ variant: headerCtaVariant }),
              ctaSizeClasses(headerCtaSize),
            )}
          >
            {headerCtaLabel}
          </Link>
        )}

        {/* Mobile menu (client component: closes on tap) */}
        <MobileNav
          siteName={siteName}
          navItems={navItems}
          cta={{
            label: headerCtaLabel,
            href: headerCtaHref,
            variant: headerCtaVariant,
            show: showHeaderCta,
            external: headerCtaExternal,
          }}
        />
      </div>
    </header>
  );
}
