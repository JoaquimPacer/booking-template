// Footer. Server component. Pulls site name, contact info, social links,
// and footer nav items from Sanity.

import Link from "next/link";
import { getNavItems, getSiteSettings } from "@/lib/sanity-queries";
import { cn } from "@/lib/utils";

export async function SiteFooter() {
  const [siteSettings, footerNavItems] = await Promise.all([
    getSiteSettings(),
    getNavItems("footer"),
  ]);

  const siteName = siteSettings?.name ?? "Booking Template";
  const contact = siteSettings?.contact;
  const social = siteSettings?.social;
  const footerText = siteSettings?.footerText;
  const year = new Date().getFullYear();

  // Columns render only when they have content, and the grid adapts so an
  // unconfigured site never shows empty "Visit"/"Links" headings.
  const hasVisit = Boolean(
    contact?.address || contact?.hours || contact?.phone || contact?.email,
  );
  const hasLinks = footerNavItems.length > 0;
  const columnCount = 1 + (hasVisit ? 1 : 0) + (hasLinks ? 1 : 0);

  return (
    <footer className="site-footer mt-16 border-t border-border bg-background py-12">
      <div
        className={cn(
          "container mx-auto grid grid-cols-1 gap-8 px-4",
          columnCount === 2 && "md:grid-cols-2",
          columnCount === 3 && "md:grid-cols-3",
        )}
      >
        <div>
          <h3 className="text-base font-semibold">{siteName}</h3>
          {siteSettings?.tagline && (
            <p className="mt-2 text-sm text-foreground/70">{siteSettings.tagline}</p>
          )}
          {social && (
            <div className="mt-4 flex gap-3 text-sm">
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noreferrer" className="text-foreground/70 hover:text-foreground">
                  Instagram
                </a>
              )}
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noreferrer" className="text-foreground/70 hover:text-foreground">
                  Facebook
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noreferrer" className="text-foreground/70 hover:text-foreground">
                  TikTok
                </a>
              )}
              {social.youtube && (
                <a href={social.youtube} target="_blank" rel="noreferrer" className="text-foreground/70 hover:text-foreground">
                  YouTube
                </a>
              )}
            </div>
          )}
        </div>

        {hasVisit && (
        <div>
          <h3 className="footer-heading text-base font-semibold">Visit</h3>
          {contact?.address && (
            <p className="mt-2 whitespace-pre-line text-sm text-foreground/70">{contact.address}</p>
          )}
          {contact?.hours && (
            <p className="mt-2 whitespace-pre-line text-sm text-foreground/70">{contact.hours}</p>
          )}
          {contact?.phone && (
            <p className="mt-2 text-sm text-foreground/70">
              <a href={`tel:${contact.phone}`} className="hover:text-foreground">{contact.phone}</a>
            </p>
          )}
          {contact?.email && (
            <p className="mt-1 text-sm text-foreground/70">
              <a href={`mailto:${contact.email}`} className="hover:text-foreground">{contact.email}</a>
            </p>
          )}
        </div>
        )}

        {hasLinks && (
        <div>
          <h3 className="footer-heading text-base font-semibold">Links</h3>
          <nav className="mt-2 flex flex-col gap-1 text-sm">
            {footerNavItems.map((item) => (
              <Link key={item._id} href={item.href} className="text-foreground/70 hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        )}
      </div>

      <div className="mt-12 border-t border-border pt-6 text-center text-xs text-foreground/60">
        {footerText && <p>{footerText}</p>}
        <p className="mt-1">&copy; {year} {siteName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
