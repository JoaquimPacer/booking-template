/* eslint-disable no-console */
// scripts/seed-faqs.ts
//
// Seeds a reasonable starter set of FAQs for a massage practice. These are
// generic-but-sensible defaults Theresa (or any client) can edit, reorder, or
// delete in Studio under "FAQs".
//
// USAGE:
//   npx tsx scripts/seed-faqs.ts            # dry-run (prints the plan)
//   npx tsx scripts/seed-faqs.ts --apply    # write to Sanity
//
// Idempotent: deterministic ids ("faq-<key>"), so re-running updates in place.

import "dotenv/config";

interface FaqSeed {
  key: string;
  question: string;
  answer: string; // single paragraph; converted to portable text below
  category: string;
  order: number;
}

const FAQS: FaqSeed[] = [
  {
    key: "first-visit",
    question: "What should I expect on my first visit?",
    answer:
      "We'll start with a short conversation about what's going on and what you'd like to get out of the session. From there, the work is tailored to you, and you're always in control of pressure and comfort. Most people arrive a few minutes early to settle in.",
    category: "Getting started",
    order: 10,
  },
  {
    key: "what-to-wear",
    question: "What should I wear, and what happens during the session?",
    answer:
      "You undress to your level of comfort and are always draped with a sheet; only the area being worked on is uncovered. If you'd rather stay partially clothed, that's completely fine. Just let us know what feels right for you.",
    category: "Getting started",
    order: 20,
  },
  {
    key: "how-often",
    question: "How often should I come in?",
    answer:
      "It depends on your goals. For general relaxation, many people come monthly. For a specific issue or recovery, a closer series of sessions early on tends to help more. We'll talk through what makes sense for you, with no pressure.",
    category: "Getting started",
    order: 30,
  },
  {
    key: "oncology-safe",
    question: "Is massage safe during or after cancer treatment?",
    answer:
      "Yes, with the right training and adjustments. Theresa is trained in oncology massage and adapts pressure, positioning, and technique to where you are in treatment or recovery. If you're in active treatment, we may coordinate with your care team.",
    category: "Health & safety",
    order: 40,
  },
  {
    key: "conditions",
    question: "Can massage help with my specific condition?",
    answer:
      "Massage and bodywork can help with many things, from chronic pain and tension to swelling, stress, and recovery. If you're unsure whether it's a good fit for your situation, reach out and we'll talk it through honestly before you book.",
    category: "Health & safety",
    order: 50,
  },
  {
    key: "payment",
    question: "How do I pay, and do you take cards?",
    answer:
      "Payment details are handled through our booking system when you schedule. If you have a question about pricing or payment options, just get in touch and we'll be glad to help.",
    category: "Booking & payment",
    order: 60,
  },
  {
    key: "cancellation",
    question: "What's your cancellation policy?",
    answer:
      "Life happens, so we just ask for as much notice as you can give if you need to reschedule. Please reach out directly and we'll find a new time that works.",
    category: "Booking & payment",
    order: 70,
  },
];

function toPortableText(text: string, key: string) {
  return [
    {
      _type: "block",
      _key: `${key}-b`,
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
    },
  ];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`FAQs: ${FAQS.length}`);
  for (const f of FAQS) console.log(`  [${f.category}] ${f.question}`);
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to write.)");
    return;
  }

  for (const f of FAQS) {
    await sanityWrite.createOrReplace({
      _id: `faq-${f.key}`,
      _type: "faq",
      question: f.question,
      answer: toPortableText(f.answer, f.key),
      category: f.category,
      order: f.order,
    });
    console.log(`Wrote faq-${f.key}`);
  }
  console.log("");
  console.log("Done. Edit/reorder/delete in Studio > FAQs.");
}

main().catch((err) => {
  console.error("FAQ seed failed:");
  console.error(err);
  process.exit(1);
});
