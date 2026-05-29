// Top navigation. Server component. Pulls site name, logo, and header
// nav items from Sanity. Includes a mobile drawer (shadcn Sheet).

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
    ? urlFor(siteSettings.brand.logo)?.width(200).height(60).fit("max").url()
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
              width={150}
              height={40}
              priority
              className="h-8 w-auto"
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

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger
            className={`${buttonVariants({ variant: "ghost", size: "icon" })} md:hidden`}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="text-left">{siteName}</SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
            <nav className="mt-6 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item._id}
                  href={item.href}
                  className="text-base font-medium text-foreground/80 transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              {showHeaderCta && (
                <Link
                  href={headerCtaHref}
                  className={cn(buttonVariants({ variant: headerCtaVariant }), ctaSizeClasses(headerCtaSize), "mt-2")}
                >
                  {headerCtaLabel}
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
