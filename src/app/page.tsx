import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GalleryGrid } from "@/components/gallery-grid";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { ServiceCard } from "@/components/service-card";
import { TestimonialCard } from "@/components/testimonial-card";
import { urlFor } from "@/lib/sanity-image";
import { cn } from "@/lib/utils";
import {
  getAllInstructors,
  getAllServices,
  getFeaturedTestimonials,
  getSiteSettings,
} from "@/lib/sanity-queries";
import { buildLocalBusinessJsonLd, buildPageMetadata } from "@/lib/seo";
import { resolveCtaHref } from "@/lib/booking-link";

// Next.js requires segment config to be a literal; keep in sync with REVALIDATE_SECONDS in src/lib/cache.ts.
export const revalidate = 10;

export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  return buildPageMetadata({
    path: "/",
    siteSettings,
    fallback: {
      title: siteSettings?.name,
      description: siteSettings?.tagline,
    },
  });
}

export default async function HomePage() {
  const [siteSettings, services, testimonials, instructors] = await Promise.all([
    getSiteSettings(),
    getAllServices(),
    getFeaturedTestimonials(),
    getAllInstructors(),
  ]);
  const primaryInstructor = instructors[0];

  const heroTitle =
    siteSettings?.tagline ?? siteSettings?.name ?? "Welcome";
  const heroSubtitle = siteSettings?.description;
  const heroCtaLabel = siteSettings?.heroCta?.label ?? "Book now";
  const heroCtaHref = resolveCtaHref(
    siteSettings?.heroCta?.href,
    siteSettings?.externalBookingUrl,
  );

  return (
    <>
      <JsonLd data={buildLocalBusinessJsonLd(siteSettings)} />

      <Hero
        title={heroTitle}
        subtitle={heroSubtitle}
        ctaLabel={heroCtaLabel}
        ctaHref={heroCtaHref}
        ctaStyle={siteSettings?.heroCta?.style}
        ctaSize={siteSettings?.heroCta?.size}
        ctaAlign={siteSettings?.heroCta?.align}
        image={siteSettings?.homeHero ?? null}
        videoUrl={siteSettings?.heroVideoFileUrl ?? siteSettings?.homeHeroVideoUrl ?? null}
        overlayOpacity={siteSettings?.homeHeroOverlayOpacity ?? null}
      />

      {/* About preview section */}
      {(siteSettings?.homeIntroHeading || siteSettings?.homeIntroBody || primaryInstructor) && (
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">
            {primaryInstructor?.photo && (
              <div className="order-1 md:order-2">
                <Image
                  src={urlFor(primaryInstructor.photo)?.width(800).height(800).fit("crop").url() ?? ""}
                  alt={primaryInstructor.name}
                  width={600}
                  height={600}
                  className="aspect-square w-full rounded-2xl object-cover"
                />
              </div>
            )}
            <div className="order-2 md:order-1">
              {siteSettings?.homeIntroHeading && (
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {siteSettings.homeIntroHeading}
                </h2>
              )}
              {siteSettings?.homeIntroBody && (
                <p className="mt-6 whitespace-pre-line text-base text-foreground/80 md:text-lg">
                  {siteSettings.homeIntroBody}
                </p>
              )}
              {primaryInstructor && (
                <div className="mt-6">
                  <p className="text-base font-semibold">{primaryInstructor.name}</p>
                  {primaryInstructor.title && (
                    <p className="text-sm text-foreground/60">{primaryInstructor.title}</p>
                  )}
                </div>
              )}
              <div className="mt-8 flex justify-center">
                <Link
                  href="/about"
                  className={cn(buttonVariants({ variant: "outline" }), "h-auto px-6 py-3 text-base")}
                >
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Services section */}
      {services.length > 0 && (
        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Our services
            </h2>
            <p className="mt-4 text-base text-foreground/70">
              Book directly online. Find a time that works for you.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
          {services.length > 6 && (
            <div className="mt-10 flex justify-center">
              <Link
                href="/services"
                className={cn(buttonVariants(), "h-auto px-8 py-3 text-base")}
              >
                See all services
              </Link>
            </div>
          )}
          </div>
        </section>
      )}

      {/* Gallery section */}
      {siteSettings?.homeGallery && siteSettings.homeGallery.length > 0 && (
        <GalleryGrid images={siteSettings.homeGallery} />
      )}

      {/* Testimonials section */}
      {testimonials.length > 0 && (
        <section className="border-t border-border py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                What clients are saying
              </h2>
              <p className="mt-4 text-base text-foreground/70">
                Real reviews from real people.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((testimonial) => (
                <TestimonialCard key={testimonial._id} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to book?
          </h2>
          <p className="mt-4 text-base text-foreground/70">
            Browse our services and find an open time today.
          </p>
          <div className="mt-8">
            <Link
              href="/services"
              className={cn(buttonVariants(), "h-auto px-8 py-3 text-base")}
            >
              See services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
