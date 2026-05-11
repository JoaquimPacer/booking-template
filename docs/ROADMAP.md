# Roadmap

Living view of the booking-template build phases. For the full spec see the companion docs repo: `booking-flow-pitches/templates/BOOKING_TEMPLATE_V1_SPEC.md`. For the original approved plan (canonical decisions) see `C:/Users/f927g/.claude/plans/c-users-f927g-onedrive-documents-github-wobbly-nygaard.md`.

## Phase calendar

**Note (2026-05-11):** Phase 1.5 was moved earlier in the order (used to be parallel with Phase 3) so Joaquim can begin the multi-business cold-call pitch funnel as soon as Phase 1 ships. NXTS WordPress sprint became uncertain, so Phase 1 started early.

| Phase | Dates | Status | Deliverable |
| --- | --- | --- | --- |
| **0** | May 9-11 | **Done** | Empty scaffold deployed at `booking-template.vercel.app`; Neon + Sanity wired; Prisma schema migrated to staging + main |
| **1** | May 11-22 | In progress | Sanity content models (`siteSettings` with brand theme tokens, `page`, `service`, `instructor`, `faq`, `testimonial`, `navItem`, `cta`, `seo`); marketing pages bound to Sanity content (`/`, `/services`, `/services/[slug]`, `/about`, `/faq`, `/contact`); Lighthouse > 90 mobile + desktop; SEO baseline (schema.org JSON-LD, sitemap.xml, robots.txt, OG tags); shadcn/ui hero (full-width overlay), service card (text-only, no photo), FAQ accordion; Vercel Analytics on; Lonestar Massage Demo seeded |
| **1.5** | May 22-29 | Pending (pulled forward) | `scripts/replicate-prospect.ts`: given a Google Place ID, pull business name, address, hours, reviews, photos via Places API, seed a fresh Sanity dataset, spin up a Vercel preview URL. Used in the cold-call pitch motion (find 4.5★ business, build near-replica, send URL). Multi-business pitch funnel runs in parallel from this point on (5-8 prospects per push, archive after 3-4 weeks if no bite). |
| **2** | May 29-June 12 | Pending | Booking core: service browse, list + calendar toggle for time-slot picker, Stripe Checkout, webhook driving booking confirmation, Resend email with .ics, Twilio SMS, cancel/reschedule by client via signed URL. Until this ships, "Book now" buttons link to either `mailto:` or a Sanity-configured external scheduler URL per client. |
| **3** | June 12-26 | Pending | Admin UI (`/admin`, NextAuth-gated): bookings list, refund button, edit availability, edit services. Error states, loading skeletons, 404/500 pages. SEO polish. `scripts/lighthouse-all.ps1` batch script (run Lighthouse against home + each marketing page on mobile + desktop, output HTML reports for pitch comparisons). Sanity Studio walkthrough screencap. |
| **4** | last week of June | Pending | Public demo at fake-business URL (e.g. `lonestar-massage-demo.vercel.app`); 90-second screencap of booking flow; Sanity Studio walkthrough video for client onboarding. Pitch Theresa + 4-7 other prospects from the Phase 1.5 funnel. |

## What "done" means for each phase

Each phase has explicit verification gates. Phase 0's gates were:

- Production URL returns 200 (HTML response with Next default landing or our marketing page).
- `/studio` route loads embedded Sanity Studio.
- `prisma migrate deploy` ran cleanly against Neon main during the Vercel build.
- ADR 0001 (stack choice rationale) committed in `docs/decisions/`.

Phase 1+ gates will be added to this doc as we approach each phase.

## What we explicitly do NOT ship in v1

These are part of the long-term vision (`BOOKING_TEMPLATE_LONG_TERM_VISION.md` in the companion docs repo) but deferred to v2:

- Multi-instructor classes (dance-studio use case)
- Lead/follow role balancing (dance-specific)
- Stripe Connect splits to multiple instructors
- Waitlist promotion logic
- Outlook calendar sync (Google Calendar only for v1)
- Full client portal as a separate paid tier
- Cal.com fork (we use Google Calendar API directly; ~200 LOC vs forking thousands of files)
- Multi-tenant runtime (each client gets their own deploy + DB)

The full v2 schema lives at `booking-flow-pitches/templates/v2-future/schema-full.prisma` for when a dance/group-class client arrives.

## How phases connect to git

- Each phase produces commits on `main` (since you're working solo, no feature branches needed for routine work).
- Major feature branches (e.g. `feature/admin-ui`) might appear in Phase 3 when adding the admin section, then merge to main when done. Each branch automatically gets a Vercel preview URL for testing.
- Every push to main triggers a Vercel production deploy. Watch the dashboard for any red builds.

## How phases connect to NXTS (the WP project)

The WP build for NXTS is a *separate, parallel* track that finishes around May 15. After NXTS goes live on WordPress + Acuity, you have full focus on this template track until the massage clinic pitch.

NXTS does NOT migrate to this template. It stays on WordPress. This template is for new clients only.

## Status check command

To see your local repo's state at any time:

```powershell
cd "$env:USERPROFILE\OneDrive\Documents\GitHub\booking-template"  # or your moved path
git log --oneline | Select-Object -First 10
```

The last 10 commits show what's been done recently.
