import { PortableText, type PortableTextBlock } from "@portabletext/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getAllFaqs } from "@/lib/sanity-queries";

export const revalidate = 60;

export const metadata = {
  title: "FAQ",
};

export default async function FaqPage() {
  const faqs = await getAllFaqs();

  // Group by category (uncategorized goes under "General").
  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const cat = faq.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <header>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mt-4 text-base text-foreground/70">
          Find quick answers below. If you don&rsquo;t see what you&rsquo;re
          looking for, get in touch.
        </p>
      </header>

      {faqs.length === 0 ? (
        <div className="mt-16 text-center text-foreground/60">
          <p>No FAQs published yet.</p>
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          {categories.map((category) => (
            <section key={category}>
              {categories.length > 1 && (
                <h2 className="mb-4 text-xl font-semibold">{category}</h2>
              )}
              <Accordion className="w-full">
                {grouped[category].map((faq) => (
                  <AccordionItem key={faq._id} value={faq._id}>
                    <AccordionTrigger className="text-left text-base font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-slate prose-sm max-w-none">
                        <PortableText value={faq.answer as PortableTextBlock[]} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
