import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GalleryGrid } from "@/components/gallery-grid";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
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
  const shownServices = services.slice(0, 6);
  const shownTestimonials = testimonials.slice(0, 6);

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
          <Reveal>
          {/* Two-column only when there's a photo to fill the second column;
              without one the text centers like every other homepage section. */}
          <div
            className={cn(
              primaryInstructor?.photo
                ? "grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12"
                : "mx-auto max-w-2xl text-center",
            )}
          >
            {primaryInstructor?.photo && (
              <div className="order-1 md:order-2">
                <Image
                  src={urlFor(primaryInstructor.photo)?.width(800).height(800).fit("crop").url() ?? ""}
                  alt={primaryInstructor.name}
                  width={600}
                  height={600}
                  sizes="(max-width: 768px) 90vw, 600px"
                  className="about-portrait aspect-square w-full rounded-2xl object-cover"
                />
              </div>
            )}
            <div className="order-2 md:order-1">
              {siteSettings?.homeIntroHeading && (
                <h2 className="section-title text-3xl font-bold tracking-tight md:text-4xl">
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
                  className={cn(buttonVariants(), "h-auto px-6 py-3 text-base")}
                >
                  {siteSettings?.name
                    ? `About ${siteSettings.name.split(/[\s,]+/)[0]}`
                    : "About us"}
                </Link>
              </div>
            </div>
          </div>
          </Reveal>
        </section>
      )}

      {/* Services section */}
      {services.length > 0 && (
        <section className="bg-muted/40 py-16 md:py-24">
          <div className="container mx-auto px-4">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">{siteSettings?.servicesEyebrow ?? "What we offer"}</p>
              <h2 className="section-title text-3xl font-bold tracking-tight md:text-4xl">
                {siteSettings?.servicesHeading ?? "Our services"}
              </h2>
              <p className="mt-4 text-base text-foreground/70">
                {siteSettings?.servicesSubtitle ??
                  "Book directly online. Find a time that works for you."}
              </p>
            </div>
          </Reveal>
          {/* 1-2 cards center under the centered header instead of stranding
              left in a 3-column grid; 3+ keeps the original layout. */}
          <div
            className={cn(
              "mt-12 grid grid-cols-1 gap-6",
              shownServices.length === 1 && "mx-auto max-w-md",
              shownServices.length === 2 && "mx-auto max-w-3xl sm:grid-cols-2",
              shownServices.length >= 3 && "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {shownServices.map((service, i) => (
              <Reveal key={service._id} delay={i * 75} className="h-full">
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
          {services.length > 6 && (
            <div className="mt-10 flex justify-center">
              <Link
                href="/services"
                className={cn(buttonVariants(), "h-auto px-8 py-3 text-base")}
              >
                {siteSettings?.servicesButtonLabel ?? "See all services"}
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
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="eyebrow">{siteSettings?.testimonialsEyebrow ?? "Kind words"}</p>
                <h2 className="section-title text-3xl font-bold tracking-tight md:text-4xl">
                  {siteSettings?.testimonialsHeading ?? "What clients are saying"}
                </h2>
                <p className="mt-4 text-base text-foreground/70">
                  {siteSettings?.testimonialsSubtitle ?? "Real reviews from real people."}
                </p>
              </div>
            </Reveal>
            {/* 1-2 quotes center under the centered header instead of
                stranding left in a 3-column grid; 3+ keeps the original layout. */}
            <div
              className={cn(
                "mt-12 grid grid-cols-1 gap-6",
                shownTestimonials.length === 1 && "mx-auto max-w-xl",
                shownTestimonials.length === 2 && "mx-auto max-w-3xl md:grid-cols-2",
                shownTestimonials.length >= 3 && "md:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {shownTestimonials.map((testimonial, i) => (
                <Reveal key={testimonial._id} delay={i * 75} className="h-full">
                  <TestimonialCard testimonial={testimonial} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <Reveal>
            <p className="eyebrow">{siteSettings?.finalCtaEyebrow ?? "Get started"}</p>
            <h2 className="section-title text-3xl font-bold tracking-tight md:text-4xl">
              {siteSettings?.finalCtaHeading ?? "Ready to book?"}
            </h2>
            <p className="mt-4 text-base text-foreground/70">
              {siteSettings?.finalCtaSubtitle ??
                "Browse our services and find an open time today."}
            </p>
            <div className="mt-8">
              <Link
                href="/services"
                className={cn(buttonVariants(), "h-auto px-8 py-3 text-base")}
              >
                {siteSettings?.finalCtaButtonLabel ?? "See services"}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
