# Roadmap

## Status (updated 2026-06-10)

**Now:** 1H, the $10k premium pass (style presets + A/B demo switcher) + SEO closeout + Search Console, on `feature/premium-design`. Started 2026-06-10.
**Next:** GSC/GBP verification with Joaquim; Theresa handoff items (Sanity invite confirmation, backup drill, Loom); then finish 1.5 (replicate-prospect services/photos) + Newberry targeting; 1.6 operator drills before the first pitch.
**Blocked:** Theresa's Canva edit link (4 flyer fixes wait on it).
**Pace:** theresaattea.com went LIVE ~June 6 (ahead of the doc'd plan); 1E/1F were finished inside the launch push but the docs lagged until 2026-06-10. 2C-2E and Phase 3 re-tagged "deferred until first non-medical client," retiring the stale June 12 Phase-3 date.

This block is updated at the end of every session and read back at the start of the next one.

Living view of the booking-template build phases. For the full spec see the companion docs repo: `booking-flow-pitches/templates/BOOKING_TEMPLATE_V1_SPEC.md`. For the original approved plan (canonical decisions) see `C:/Users/f927g/.claude/plans/c-users-f927g-onedrive-documents-github-wobbly-nygaard.md`.

## Phase calendar

**Note (2026-05-11):** Phase 1.5 was moved earlier in the order (used to be parallel with Phase 3) so Joaquim can begin the multi-business cold-call pitch funnel as soon as Phase 1 ships. NXTS WordPress sprint became uncertain, so Phase 1 started early.

| Phase | Dates | Status | Deliverable |
| --- | --- | --- | --- |
| **0** | May 9-11 | **Done** | Empty scaffold deployed at `booking-template.vercel.app`; Neon + Sanity wired; Prisma schema migrated to staging + main |
| **1** | May 11-22 | Done except 1G demo seed | Marketing surface + SEO baseline. Broken into substeps 1A-1H below. |
| 1A | May 11 | Done | Sanity content schemas: `siteSettings` (with brand theme tokens), `page`, `service`, `instructor`, `faq`, `testimonial`, `navItem`, plus embedded objects `brand`, `cta`, `seo`. 9 schemas total. |
| 1B | May 11 | Done | shadcn/ui init + components installed: Button, Card, Accordion, Sheet, Input, Textarea, Label, Skeleton. |
| 1C | May 11 | Done | Shared layout: SiteHeader with logo/nav/mobile drawer, SiteFooter, BrandTheme injects Sanity-driven CSS variables (colors flow from Studio to the entire site). |
| 1D | May 11 | Done | 6 marketing routes: `/`, `/services`, `/services/[slug]`, `/about`, `/faq`, `/contact`. Editable CTAs (`headerCta`, `heroCta` in Site Settings). All ISR-cached. |
| 1E | June 1-6 | **Done** | SEO baseline shipped during the launch push: `app/sitemap.ts` (dynamic from Sanity), `app/robots.ts`, per-page `generateMetadata`, all five JSON-LD types (LocalBusiness, Service, Person, FAQPage, BreadcrumbList). Verified serving on the live site 2026-06-10. Small gaps (getAllServices seo projection, metadataBase, 404 page, alt text) close in 1H. |
| 1F | June 5-6 | **Done**, numbers pending | Mobile polish + hero LCP/video work landed (commits 8030670..dfe6262). Fresh verified PSI/Lighthouse numbers get recorded during 1H (before/after the premium pass). |
| 1G | open | Half done | Vercel Analytics live in layout (Done). Lonestar Massage Demo seed for the template URL still open. |
| **1H** | June 10- | **In progress** | $10k premium pass: style presets (`classic` = current look stays default / `warm-editorial` / `soft-luxe`) + preview-only A/B demo switcher; interior-page styling (Theresa's request: About/FAQ/Contact carry the homepage feel); SEO gap closure; PSI before/after numbers; Google Search Console + Business Profile. On `feature/premium-design`. |
| **1.5** | ~60% built | In progress | `scripts/replicate-prospect.ts` exists (Places text search + details -> seeds siteSettings + testimonials, dry-run default). Open: service docs, photo upload, Vercel preview spin-up. Original spec: `scripts/replicate-prospect.ts`: given a Google Place ID, pull business name, address, hours, reviews, photos via Places API, seed a fresh Sanity dataset, spin up a Vercel preview URL. Used in the cold-call pitch motion (find 4.5★ business, build near-replica, send URL). Multi-business pitch funnel runs in parallel from this point on (5-8 prospects per push, archive after 3-4 weeks if no bite). |
| **1.6** | May 29-31 | Pending | **Operator drills.** Joaquim runs every common operation solo without AI help, so he can demo and recover confidently on calls. Drills include: (a) Vercel Instant Rollback from a deliberately-broken deploy, (b) Sanity content add/edit/delete + publish + verify timing, (c) brand color change via Sanity reflected on production, (d) API key rotation (Places, Sanity, Neon) without breaking the site, (e) custom domain add + DNS configuration on a throwaway domain to learn the flow, (f) Lighthouse comparison report (Phase 1.5C output) generation from scratch. Each drill = a written checklist Joaquim follows; passing = he can do it in under 5 minutes without referencing docs. |
| **2** | May 20-June 6 | 2A-2B Done; 2C-2E deferred | Booking core, broken into 2A-2E below. |
| 2A | May 20 | Done | `durationMinutes` + `priceCents` on Sanity Service; `src/lib/format.ts`; rendered on cards + detail. Coupon migration (fixed-dollar credits + Booking cancellation fields). |
| 2B | May 20-21 | Done | In-house slot picker at `/book/[slug]` (date + time picker, intake form, creates PENDING booking). Pure availability engine (`src/lib/availability.ts`) + DST-safe tz helpers (`src/lib/tz.ts`) + 18 unit tests. Seeds: her real 12 services -> Sanity, Studio + hours + Service rows -> Neon. `bookingMode` field (online / inquire-only / hidden). Merged to main and in production (verified 2026-06-10; branch archived as tag `archive/phase-2b-booking`). |
| 2C | Deferred | **Deferred until first non-medical client** (decided 2026-06-10) | Stripe Checkout: pay full price upfront to confirm a booking. Coupon redemption at checkout. Theresa books via JaneApp (ADR 0004), so nothing here blocks her. |
| 2D | Deferred | **Deferred until first non-medical client** | Stripe webhook -> confirm booking; Resend confirmation email with .ics; Twilio SMS; cancellation auto-credit (issues a Coupon). |
| 2E | Deferred | **Deferred until first non-medical client** | Packages + gift cards (prepaid credits). See ADR 0003. Neuropathy No More flips from inquire-only to a real 4-session package here. |
| **3** | Deferred | **Deferred until first non-medical client** (decided 2026-06-10; the admin UI mostly serves clients on the in-house booking engine) | Admin UI (`/admin`, NextAuth-gated): bookings list, refund button, edit availability, edit services. Error states, loading skeletons, 500 page. Sanity Studio walkthrough screencap. (SEO polish, the 404 page, and the Lighthouse batch reporting moved into 1H.) |
| **4** | last week of June | Pending | Public demo at fake-business URL (e.g. `lonestar-massage-demo.vercel.app`); 90-second screencap of booking flow; Sanity Studio walkthrough video for client onboarding. Pitch Theresa + 4-7 other prospects from the Phase 1.5 funnel. Joaquim runs all operator drills from Phase 1.6 the day before the first real pitch as a final readiness check. |

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

- All work happens on feature branches (e.g. `feature/premium-design`), verified on the branch's automatic Vercel preview URL, and merges to `main` only after approval. Never commit directly to `main`: production deploys from it. (This supersedes the earlier "solo work goes straight to main" rule, 2026-06-10.)
- Every push to main triggers a Vercel production deploy. Watch the dashboard for any red builds, and re-verify the live site after the deploy lands.
- **Branch archive protocol:** when a branch is finished or deprecated, `git tag archive/<branch-name> <sha>`, push the tag, then delete the branch (remote + local). The tag keeps that exact state checkout-able forever (`git checkout archive/phase-2b-booking`) while the branch list stays clean.

## How phases connect to NXTS (the WP project)

The WP build for NXTS is a *separate, parallel* track that finishes around May 15. After NXTS goes live on WordPress + Acuity, you have full focus on this template track until the massage clinic pitch.

NXTS does NOT migrate to this template. It stays on WordPress. This template is for new clients only.

## Status check command

To see your local repo's state at any time:

```powershell
cd C:\Users\f927g\Repos\booking-template
git log --oneline | Select-Object -First 10
```

The last 10 commits show what's been done recently.
