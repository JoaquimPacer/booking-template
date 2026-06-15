import Image from "next/image";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { JsonLd } from "@/components/json-ld";
import { urlFor } from "@/lib/sanity-image";
import {
  getAllInstructors,
  getPageBySlug,
  getSiteSettings,
} from "@/lib/sanity-queries";
import {
  buildBreadcrumbListJsonLd,
  buildPageMetadata,
  buildPersonJsonLd,
} from "@/lib/seo";

// Next.js requires segment config to be a literal; keep in sync with REVALIDATE_SECONDS in src/lib/cache.ts.
export const revalidate = 10;

export async function generateMetadata() {
  const [aboutPage, siteSettings] = await Promise.all([
    getPageBySlug("about"),
    getSiteSettings(),
  ]);
  return buildPageMetadata({
    seo: aboutPage?.seo,
    fallback: {
      title: "Meet Theresa, Your Massage Therapist",
      description:
        "Meet Theresa Attea, LMT: a registered nurse, oncology massage specialist, and two-time cancer survivor offering gentle, skilled bodywork in South Austin.",
    },
    path: "/about",
    siteSettings,
  });
}

export default async function AboutPage() {
  const [aboutPage, instructors, siteSettings] = await Promise.all([
    getPageBySlug("about"),
    getAllInstructors(),
    getSiteSettings(),
  ]);

  // Fallback: use siteSettings.description if no page doc exists.
  const description = siteSettings?.description;

  return (
    <>
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      {instructors.map((instructor) => (
        <JsonLd key={instructor._id} data={buildPersonJsonLd(instructor)} />
      ))}

      {/* Tinted page-header band: carries the homepage's section treatment
          onto interior pages so they don't read as bare white. */}
      <section className="border-b border-border/60 bg-muted/40">
        <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
          <header>
            <p className="eyebrow">{aboutPage?.storyHeading ?? "My Story"}</p>
            <h1 className="page-title text-4xl font-bold tracking-tight md:text-5xl">
              {aboutPage?.title ?? "About"}
            </h1>
          </header>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
      {Boolean(aboutPage?.body) ? (
        <div className="prose prose-slate max-w-none">
          <PortableText value={aboutPage!.body as PortableTextBlock[]} />
        </div>
      ) : (
        description && (
          <p className="text-lg text-foreground/80">{description}</p>
        )
      )}

      {instructors.length > 0 && (
        <section className={Boolean(aboutPage?.body) || description ? "mt-16" : ""}>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {aboutPage?.teamHeading ?? "Meet Theresa"}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-12 md:grid-cols-2">
            {instructors.map((instructor) => {
              const photoUrl = instructor.photo
                ? urlFor(instructor.photo)?.width(400).height(400).fit("crop").url()
                : null;
              return (
                <div key={instructor._id} className="flex flex-col gap-4">
                  {photoUrl && (
                    <Image
                      src={photoUrl}
                      alt={instructor.name}
                      width={200}
                      height={200}
                      className="size-32 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{instructor.name}</h3>
                    {instructor.title && (
                      <p className="text-sm text-foreground/60">{instructor.title}</p>
                    )}
                  </div>
                  {Boolean(instructor.bio) && (
                    <div className="prose prose-slate prose-sm max-w-none">
                      <PortableText value={instructor.bio as PortableTextBlock[]} />
                    </div>
                  )}
                  {instructor.specialties && (
                    <div className="flex flex-wrap gap-2">
                      {instructor.specialties
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-muted px-3 py-1 text-xs"
                          >
                            {s}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      </div>
    </>
  );
}
