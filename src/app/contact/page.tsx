import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { getSiteSettings } from "@/lib/sanity-queries";
import {
  buildBreadcrumbListJsonLd,
  buildLocalBusinessJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

// Next.js requires segment config to be a literal; keep in sync with REVALIDATE_SECONDS in src/lib/cache.ts.
export const revalidate = 10;

export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  return buildPageMetadata({
    fallback: {
      title: "Contact",
      description: `Contact ${siteSettings?.name ?? "us"} by phone, email, or visit us in person.`,
    },
    path: "/contact",
    siteSettings,
  });
}

export default async function ContactPage() {
  const siteSettings = await getSiteSettings();
  const contact = siteSettings?.contact;

  return (
    <>
      <JsonLd data={buildLocalBusinessJsonLd(siteSettings)} />
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      {/* Tinted page-header band: carries the homepage's section treatment
          onto interior pages so they don't read as bare white. */}
      <section className="border-b border-border/60 bg-muted/40">
        <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
          <header>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Get in touch
            </h1>
            <p className="mt-4 text-base text-foreground/70">
              Reach out by phone, email, or stop by during business hours.
            </p>
          </header>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div className="space-y-6">
          {contact?.address && (
            <div className="flex gap-4">
              <MapPin className="mt-1 size-5 text-foreground/60" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  Address
                </h2>
                <p className="mt-1 whitespace-pre-line text-base">
                  {contact.address}
                </p>
              </div>
            </div>
          )}

          {contact?.hours && (
            <div className="flex gap-4">
              <Clock className="mt-1 size-5 text-foreground/60" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  Hours
                </h2>
                <p className="mt-1 whitespace-pre-line text-base">
                  {contact.hours}
                </p>
              </div>
            </div>
          )}

          {contact?.phone && (
            <div className="flex gap-4">
              <Phone className="mt-1 size-5 text-foreground/60" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  Phone
                </h2>
                <p className="mt-1 text-base">
                  <a
                    href={`tel:${contact.phone}`}
                    className="hover:text-foreground/70"
                  >
                    {contact.phone}
                  </a>
                </p>
              </div>
            </div>
          )}

          {contact?.email && (
            <div className="flex gap-4">
              <Mail className="mt-1 size-5 text-foreground/60" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
                  Email
                </h2>
                <p className="mt-1 text-base">
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-foreground/70"
                  >
                    {contact.email}
                  </a>
                </p>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Link
              href="/services"
              className={`${buttonVariants({ size: "lg" })} px-8`}
            >
              Book a service
            </Link>
          </div>
        </div>

        {contact?.googleMapsUrl && (
          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              src={contact.googleMapsUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map"
            />
          </div>
        )}
      </div>
      </div>
    </>
  );
}
