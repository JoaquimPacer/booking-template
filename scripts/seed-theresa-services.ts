/* eslint-disable no-console */
// scripts/seed-theresa-services.ts
//
// One-time seed: creates Theresa Attea's services + her instructor doc in
// whatever Sanity project the current .env points at.
//
// HOW TO USE:
//   1. In .env, set NEXT_PUBLIC_SANITY_PROJECT_ID to Theresa's Sanity project ID (7vrjehyn).
//   2. Run: npx tsx scripts/seed-theresa-services.ts --apply
//   3. Service docs and her Instructor doc appear in her Sanity Studio under "production".
//
// WHAT IT CREATES (8 docs total):
//   - 1 Instructor doc: Theresa Attea
//   - 7 Service docs: her 7 modalities pulled from cancerrehabaustin.com/theresa-attea
//
// DURATION + PRICE are left empty because they're not public on her existing site.
// Joaquim fills those manually in Sanity Studio after asking Theresa OR using
// reasonable Austin-market placeholders for the pitch.
//
// All data is editable in Sanity Studio after creation; this script just sets
// initial values.

import "dotenv/config";

// Service definitions. Tagline = short blurb shown on cards. Description =
// longer text used on detail page. Sourced from her about page + standard
// modality descriptions; edit freely after seeding.
const SERVICES = [
  {
    title: "Oncology Massage",
    slug: "oncology-massage",
    tagline:
      "Gentle, specialized care for those in or after cancer treatment",
    description:
      "An individually tailored massage session for clients in active cancer treatment or with a history of cancer. Gentle pressure, careful positioning, and oncology-trained technique. Benefits include reduced pain, decreased anxiety and stress, relief from nausea, diminished peripheral neuropathy, less swelling, increased energy, and improved overall well-being.",
    order: 10,
  },
  {
    title: "Craniosacral Therapy",
    slug: "craniosacral-therapy",
    tagline: "A subtle, gentle technique that supports the body's natural rhythm",
    description:
      "Craniosacral therapy uses light touch (about the weight of a nickel) to release tension deep in the central nervous system. Supports stress reduction, headaches, chronic pain, sleep issues, and emotional regulation. Particularly useful for those who find conventional massage too intense.",
    order: 20,
  },
  {
    title: "Swedish Massage",
    slug: "swedish-massage",
    tagline: "Flowing, rhythmic strokes for full-body relaxation",
    description:
      "The classic massage modality: long flowing strokes, kneading, and gentle pressure to ease muscle tension, improve circulation, and promote deep relaxation. A great starting point if you're new to bodywork or want a restorative session.",
    order: 30,
  },
  {
    title: "Myofascial Release",
    slug: "myofascial-release",
    tagline: "Sustained pressure to release connective-tissue restrictions",
    description:
      "Myofascial release applies steady, gentle pressure into the connective tissue restrictions to eliminate pain and restore motion. Effective for chronic pain, sports recovery, and movement dysfunction.",
    order: 40,
  },
  {
    title: "Manual Lymphatic Drainage",
    slug: "manual-lymphatic-drainage",
    tagline: "Specialized technique to reduce swelling and support immune function",
    description:
      "Manual lymphatic drainage is a gentle, rhythmic technique designed to support the lymphatic system. Often used for lymphedema, post-surgical recovery, immune support, and reducing inflammation. Performed by a CMLDT (Certified Manual Lymphatic Drainage Therapist).",
    order: 50,
  },
  {
    title: "Structural Integration",
    slug: "structural-integration",
    tagline: "Realigning posture and movement through deep fascia work",
    description:
      "Structural integration is a systematic process of releasing patterns of stress and impaired function through manipulation of the body's fascia. Goal: better posture, freer movement, and reduced chronic pain.",
    order: 60,
  },
  {
    title: "Reiki and Energy Balancing",
    slug: "reiki-energy-balancing",
    tagline: "Gentle hands-on energy work for relaxation and balance",
    description:
      "A light-touch (or no-touch) modality intended to support the body's natural healing processes. Many clients use Reiki alongside traditional medical care for stress reduction, sleep support, and a sense of calm.",
    order: 70,
  },
  {
    title: "Infant and Pediatric Massage",
    slug: "infant-pediatric-massage",
    tagline: "Specialized, gentle work for babies and children",
    description:
      "Massage adapted for infants and children. Used to support sleep, digestion, bonding, and general well-being. Also helpful for kids with chronic conditions or sensory needs.",
    order: 80,
  },
];

// Instructor doc for Theresa. Bio + credentials pulled from her about page.
const INSTRUCTOR = {
  name: "Theresa Attea",
  title: "LMT, CMLDT, LMTI, RN, BSN",
  slug: "theresa-attea",
  yearsExperience: 28,
  specialties:
    "Oncology massage, Craniosacral therapy, Manual lymphatic drainage, Myofascial release, Pediatric massage",
  // Bio is a portable text array (rich text). Each block is a paragraph.
  bio: [
    {
      _type: "block",
      _key: "p1",
      style: "normal",
      children: [
        {
          _type: "span",
          _key: "p1s1",
          text: "Theresa Attea has practiced massage therapy since 1996, bringing nearly three decades of experience to her work. She is a Licensed Massage Therapist (LMT), Certified Manual Lymphatic Drainage Therapist (CMLDT), Licensed Massage Therapy Instructor (LMTI), and a Registered Nurse (RN) with a Bachelor of Science in Nursing (BSN).",
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "p2",
      style: "normal",
      children: [
        {
          _type: "span",
          _key: "p2s1",
          text: "Before transitioning fully into bodywork, Theresa spent 25 years as a critical care nurse, specializing in pediatrics and patient safety. She is a two-time cancer survivor and stem cell transplant recipient, which deeply informs her approach to oncology massage and her care for clients facing serious illness.",
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "p3",
      style: "normal",
      children: [
        {
          _type: "span",
          _key: "p3s1",
          text: "Theresa trained at the Lauterstein-Conway School of Massage Therapy, completed oncology massage training in Tracy Walton's curriculum, and currently teaches massage therapy at Austin Community College. Every session is tailored to the client in front of her: her work blends technical skill, clinical knowledge, and warmth.",
          marks: [],
        },
      ],
      markDefs: [],
    },
  ],
};

async function main() {
  const apply = process.argv.includes("--apply");
  const { sanityWrite } = await import("../src/lib/sanity-write");

  console.log(`Seeding to project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
  console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production"}`);
  console.log("");
  console.log(`Plan: 1 Instructor doc + ${SERVICES.length} Service docs.`);
  console.log("");

  if (!apply) {
    console.log("(Dry-run. Re-run with --apply to actually write.)");
    SERVICES.forEach((s) => console.log(`  Service: ${s.title}`));
    console.log(`  Instructor: ${INSTRUCTOR.name}`);
    return;
  }

  // Create the instructor doc.
  console.log(`Creating instructor: ${INSTRUCTOR.name}...`);
  await sanityWrite.create({
    _type: "instructor",
    name: INSTRUCTOR.name,
    title: INSTRUCTOR.title,
    slug: { _type: "slug", current: INSTRUCTOR.slug },
    yearsExperience: INSTRUCTOR.yearsExperience,
    specialties: INSTRUCTOR.specialties,
    bio: INSTRUCTOR.bio,
  });

  // Create each service doc.
  for (const [i, svc] of SERVICES.entries()) {
    console.log(`Creating service ${i + 1}/${SERVICES.length}: ${svc.title}...`);
    await sanityWrite.create({
      _type: "service",
      title: svc.title,
      slug: { _type: "slug", current: svc.slug },
      tagline: svc.tagline,
      description: svc.description,
      order: svc.order,
      isActive: true,
      // durationMinutes and priceCents intentionally left undefined.
      // Joaquim fills these in Sanity Studio after confirming with Theresa.
    });
  }

  console.log("");
  console.log("Done. Verify in Sanity Studio:");
  console.log("  1. Switch to the project's dataset (already production).");
  console.log("  2. Click Service in sidebar to see all 7.");
  console.log("  3. Click Instructor to see Theresa Attea.");
  console.log("  4. Fill in Duration + Price on each Service per real-world values.");
}

main().catch((err) => {
  console.error("Seed failed:");
  console.error(err);
  process.exit(1);
});
