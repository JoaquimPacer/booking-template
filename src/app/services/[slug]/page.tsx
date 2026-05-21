import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { urlFor } from "@/lib/sanity-image";
import { formatDurationMinutes, formatPriceCents } from "@/lib/format";
import {
  getAllServices,
  getServiceBySlug,
  getSiteSettings,
} from "@/lib/sanity-queries";
import {
  buildBreadcrumbListJsonLd,
  buildPageMetadata,
  buildServiceJsonLd,
} from "@/lib/seo";

// Next.js requires segment config to be a literal; keep in sync with REVALIDATE_SECONDS in src/lib/cache.ts.
export const revalidate = 10;

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const services = await getAllServices();
  return services.map((s) => ({ slug: s.slug.current }));
}

export async function generateMetadata({ params }: ServicePageProps) {
  const { slug } = await params;
  const [service, siteSettings] = await Promise.all([
    getServiceBySlug(slug),
    getSiteSettings(),
  ]);
  if (!service) return {};
  return buildPageMetadata({
    seo: service.seo,
    fallback: { title: service.title, description: service.description },
    path: `/services/${slug}`,
    siteSettings,
  });
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const [service, siteSettings] = await Promise.all([
    getServiceBySlug(slug),
    getSiteSettings(),
  ]);
  if (!service) notFound();

  const heroUrl = service.heroImage
    ? urlFor(service.heroImage)?.width(1600).height(800).fit("crop").auto("format").url()
    : null;

  return (
    <article className="pb-20">
      <JsonLd data={buildServiceJsonLd(service, siteSettings)} />
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug.current}` },
        ])}
      />
      {/* Header banner: the service photo if one is set, otherwise an on-brand
          gradient so the page never looks blank. Title + meta sit on top. */}
      <header className="relative isolate flex min-h-[280px] items-end overflow-hidden md:min-h-[360px]">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={service.title}
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-10 object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--brand-primary, #0f172a), var(--brand-secondary, #475569))",
            }}
          />
        )}
        <div className="absolute inset-0 -z-10 bg-black/40" aria-hidden="true" />
        <div className="container mx-auto max-w-3xl px-4 pb-10 pt-24 text-background">
          <Link
            href="/services"
            className="text-sm text-background/80 hover:text-background"
          >
            &larr; All services
          </Link>
          <h1
            className="mt-3 text-4xl font-bold tracking-tight md:text-5xl"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
          >
            {service.title}
          </h1>
          {service.tagline && (
            <p
              className="mt-3 max-w-2xl text-lg text-background/90"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
            >
              {service.tagline}
            </p>
          )}
          {(service.durationMinutes || service.priceCents) && (
            <div className="mt-4 flex items-center gap-6">
              {service.durationMinutes && (
                <span className="inline-flex items-center gap-2 text-background/90">
                  <Clock className="size-4" aria-hidden="true" />
                  {formatDurationMinutes(service.durationMinutes)}
                </span>
              )}
              {service.priceCents && (
                <span className="text-xl font-semibold">
                  {formatPriceCents(service.priceCents)}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto max-w-3xl px-4 pt-10">
        <div>
          <Link
            href={`/book/${service.slug.current}`}
            className={`${buttonVariants({ size: "lg" })} px-8`}
          >
            Book this service
          </Link>
        </div>

        {Boolean(service.body) && (
          <div className="prose prose-slate mt-12 max-w-none">
            <PortableText value={service.body as PortableTextBlock[]} />
          </div>
        )}

        {Boolean(service.whatToExpect) && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold">What to expect</h2>
            <div className="prose prose-slate mt-4 max-w-none">
              <PortableText value={service.whatToExpect as PortableTextBlock[]} />
            </div>
          </div>
        )}

        {service.gallery && service.gallery.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold">Gallery</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              {service.gallery.map((img, i) => {
                const url = urlFor(img)?.width(600).height(600).fit("crop").url();
                if (!url) return null;
                return (
                  <Image
                    key={i}
                    src={url}
                    alt={`${service.title} ${i + 1}`}
                    width={600}
                    height={600}
                    className="aspect-square rounded-lg object-cover"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Second CTA only on content-rich pages, where scrolling back up is a chore. */}
        {Boolean(service.body) && (
          <div className="mt-16 border-t border-border pt-8 text-center">
            <Link
              href={`/book/${service.slug.current}`}
              className={`${buttonVariants({ size: "lg" })} px-8`}
            >
              Book this service
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
