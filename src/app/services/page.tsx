import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { ServiceCard } from "@/components/service-card";
import { getAllServices, getSiteSettings } from "@/lib/sanity-queries";
import { buildBreadcrumbListJsonLd, buildPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

// Next.js requires segment config to be a literal; keep in sync with REVALIDATE_SECONDS in src/lib/cache.ts.
export const revalidate = 10;

export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  return buildPageMetadata({
    path: "/services",
    siteSettings,
    fallback: {
      title: "Massage Services in South Austin",
      description:
        "Explore oncology, lymphatic drainage, craniosacral, pregnancy, pediatric, and therapeutic massage with Theresa Attea, LMT in South Austin. Book online.",
    },
  });
}

export default async function ServicesPage() {
  const [services, siteSettings] = await Promise.all([
    getAllServices(),
    getSiteSettings(),
  ]);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      {/* Tinted page-header band: carries the homepage's section treatment
          onto interior pages so they don't read as bare white. */}
      <section className="border-b border-border/60 bg-muted/40">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{siteSettings?.servicesPageEyebrow ?? "What we offer"}</p>
            <h1 className="page-title text-4xl font-bold tracking-tight md:text-5xl">
              {siteSettings?.servicesPageHeading ?? "Services"}
            </h1>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-16">
        {services.length === 0 ? (
          <div className="text-center text-foreground/60">
            <p>No services available yet.</p>
          </div>
        ) : (
          {/* 1-2 cards center under the centered page header instead of
              stranding left in a 3-column grid; 3+ keeps the original layout. */}
          <div
            className={cn(
              "grid grid-cols-1 gap-6",
              services.length === 1 && "mx-auto max-w-md",
              services.length === 2 && "mx-auto max-w-3xl sm:grid-cols-2",
              services.length >= 3 && "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {services.map((service, i) => (
              <Reveal key={service._id} delay={(i % 3) * 75} className="h-full">
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
