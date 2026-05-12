import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { ServiceCard } from "@/components/service-card";
import { TestimonialCard } from "@/components/testimonial-card";
import {
  getAllServices,
  getFeaturedTestimonials,
  getSiteSettings,
} from "@/lib/sanity-queries";
import { buildLocalBusinessJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

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
  const [siteSettings, services, testimonials] = await Promise.all([
    getSiteSettings(),
    getAllServices(),
    getFeaturedTestimonials(),
  ]);

  const heroTitle =
    siteSettings?.tagline ?? siteSettings?.name ?? "Welcome";
  const heroSubtitle = siteSettings?.description;
  const heroCtaLabel = siteSettings?.heroCta?.label ?? "Book now";
  const heroCtaHref = siteSettings?.heroCta?.href ?? "/services";

  return (
    <>
      <JsonLd data={buildLocalBusinessJsonLd(siteSettings)} />

      <Hero
        title={heroTitle}
        subtitle={heroSubtitle}
        ctaLabel={heroCtaLabel}
        ctaHref={heroCtaHref}
      />

      {/* Services section */}
      {services.length > 0 && (
        <section className="container mx-auto px-4 py-20">
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
              <Link href="/services" className={buttonVariants({ variant: "outline" })}>
                See all services
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Testimonials section */}
      {testimonials.length > 0 && (
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                What clients are saying
              </h2>
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
      <section className="border-t border-border py-20">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to book?
          </h2>
          <p className="mt-4 text-base text-foreground/70">
            Browse our services and find an open time today.
          </p>
          <div className="mt-8">
            <Link href="/services" className={`${buttonVariants({ size: "lg" })} px-8`}>
              See services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
