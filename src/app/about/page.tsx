import Image from "next/image";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { urlFor } from "@/lib/sanity-image";
import {
  getAllInstructors,
  getPageBySlug,
  getSiteSettings,
} from "@/lib/sanity-queries";

export const revalidate = 60;

export const metadata = {
  title: "About",
};

export default async function AboutPage() {
  const [aboutPage, instructors, siteSettings] = await Promise.all([
    getPageBySlug("about"),
    getAllInstructors(),
    getSiteSettings(),
  ]);

  // Fallback: use siteSettings.description if no page doc exists.
  const description = siteSettings?.description;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16 md:py-24">
      <header>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          {aboutPage?.title ?? "About"}
        </h1>
      </header>

      {Boolean(aboutPage?.body) ? (
        <div className="prose prose-slate mt-8 max-w-none">
          <PortableText value={aboutPage!.body as PortableTextBlock[]} />
        </div>
      ) : (
        description && (
          <p className="mt-6 text-lg text-foreground/80">{description}</p>
        )
      )}

      {instructors.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Meet the team
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
                  {instructor.specialties && instructor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {instructor.specialties.map((s) => (
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
  );
}
