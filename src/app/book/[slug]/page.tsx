import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Mail, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatDurationMinutes, formatPriceCents } from "@/lib/format";
import { getServiceBySlug, getSiteSettings } from "@/lib/sanity-queries";
import { buildPageMetadata } from "@/lib/seo";
import { computeServiceSlots } from "@/lib/booking-data";
import { BookingFlow } from "./booking-flow";

// Availability depends on live bookings + the current time, so this page must
// never be statically cached.
export const dynamic = "force-dynamic";

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BookPageProps) {
  const { slug } = await params;
  const [service, siteSettings] = await Promise.all([
    getServiceBySlug(slug),
    getSiteSettings(),
  ]);
  if (!service) return {};
  return buildPageMetadata({
    fallback: {
      title: `Book ${service.title}`,
      description: `Book ${service.title}${siteSettings?.name ? ` with ${siteSettings.name}` : ""}.`,
    },
    path: `/book/${slug}`,
    siteSettings,
  });
}

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service || service.isActive === false) notFound();

  const mode = service.bookingMode ?? "slots";
  const duration = formatDurationMinutes(service.durationMinutes);
  const price = formatPriceCents(service.priceCents);

  const Header = (
    <header className="mb-8">
      <Link
        href={`/services/${slug}`}
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        &larr; Back to {service.title}
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
        Book {service.title}
      </h1>
      {(duration || price) && (
        <div className="mt-3 flex items-center gap-4 text-foreground/80">
          {duration && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {duration}
            </span>
          )}
          {price && <span className="font-semibold">{price}</span>}
        </div>
      )}
    </header>
  );

  // Inquire-only (e.g. multi-session packages) and "hidden" services don't use
  // the slot picker. Show how to reach out instead.
  if (mode !== "slots" || !service.durationMinutes) {
    const siteSettings = await getSiteSettings();
    const contact = siteSettings?.contact;
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
        {Header}
        <div className="rounded-xl border border-border bg-muted/30 p-6 md:p-8">
          <p className="text-base text-foreground/80">
            This one is booked directly with us, so we can plan the schedule
            around you. Reach out and we&apos;ll get you started.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {contact?.phone && (
              <a
                href={`tel:${contact.phone}`}
                className={`${buttonVariants({ size: "lg" })} px-6`}
              >
                <Phone className="size-4" aria-hidden="true" />
                Call {contact.phone}
              </a>
            )}
            {contact?.email && (
              <a
                href={`mailto:${contact.email}?subject=${encodeURIComponent(`Booking inquiry: ${service.title}`)}`}
                className={`${buttonVariants({ variant: "outline", size: "lg" })} px-6`}
              >
                <Mail className="size-4" aria-hidden="true" />
                Email us
              </a>
            )}
            <Link
              href="/contact"
              className={`${buttonVariants({ variant: "outline", size: "lg" })} px-6`}
            >
              Contact page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = await computeServiceSlots(service);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
      {Header}
      <BookingFlow
        service={{
          slug,
          title: service.title,
          durationMinutes: service.durationMinutes,
          priceLabel: price,
        }}
        data={data}
      />
    </div>
  );
}
