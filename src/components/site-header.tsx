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
import { getNavItems, getSiteSettings } from "@/lib/sanity-queries";

export async function SiteHeader() {
  const [siteSettings, navItems] = await Promise.all([
    getSiteSettings(),
    getNavItems("header"),
  ]);

  const logoUrl = siteSettings?.brand?.logo
    ? urlFor(siteSettings.brand.logo)?.width(240).height(80).fit("max").url()
    : null;

  const siteName = siteSettings?.name ?? "Booking Template";
  const headerCtaLabel = siteSettings?.headerCta?.label ?? "Book now";
  const headerCtaHref = siteSettings?.headerCta?.href ?? "/services";
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
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={180}
              height={48}
              priority
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span className="text-lg font-semibold tracking-tight">{siteName}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item._id}
              href={item.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {showHeaderCta && (
            <Link
              href={headerCtaHref}
              className={cn(buttonVariants({ variant: headerCtaVariant }), ctaSizeClasses(headerCtaSize))}
            >
              {headerCtaLabel}
            </Link>
          )}
        </nav>

        {/* Mobile menu (client component: closes on tap) */}
        <MobileNav
          siteName={siteName}
          navItems={navItems}
          cta={{
            label: headerCtaLabel,
            href: headerCtaHref,
            variant: headerCtaVariant,
            show: showHeaderCta,
          }}
        />
      </div>
    </header>
  );
}
