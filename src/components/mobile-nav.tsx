"use client";

// Mobile hamburger menu. Client component so it can close the drawer the moment
// you tap a link (a server component can't hold the open/closed state). The
// business name + every link + the button all close the drawer on click.

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/sanity-queries";

interface MobileNavProps {
  siteName: string;
  navItems: NavItem[];
  cta?: {
    label: string;
    href: string;
    variant: "default" | "outline" | "ghost";
    show: boolean;
    external?: boolean;
  };
}

export function MobileNav({ siteName, navItems, cta }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={(o) => setOpen(o)}>
      <SheetTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetTitle className="text-left">
          <Link href="/" onClick={close} className="transition-colors hover:text-primary">
            {siteName}
          </Link>
        </SheetTitle>
        <SheetDescription className="sr-only">Main navigation</SheetDescription>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item._id}
              href={item.href}
              onClick={close}
              className="rounded-md px-2 py-2.5 text-base font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {cta?.show && (
            <Link
              href={cta.href}
              onClick={close}
              {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                buttonVariants({ variant: cta.variant }),
                "cta-button mt-4 h-auto self-center px-8 py-2.5 text-base",
              )}
            >
              {cta.label}
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
