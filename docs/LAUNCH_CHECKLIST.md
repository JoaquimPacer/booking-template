# Launch checklist (per client)

A repeatable list for taking a client site from "built" to "live on their domain."
Work top to bottom. Most steps are one-time per client.

## 0. Before the call / demo
- [ ] Site is on a branch, pushed; grab the **Vercel preview URL** (Deployments > the branch deployment > Visit).
- [ ] **Turn off the preview login wall** so they can open it: Vercel > project > Settings > Deployment Protection > Vercel Authentication > **Off**. (Pages public; secrets stay server-side, nothing sensitive leaks.)
- [ ] Run the content scripts so nothing looks half-built:
  - `npx tsx scripts/fix-brand-colors.ts --apply`
  - `npx tsx scripts/set-homepage-content.ts --apply`
  - `npx tsx scripts/seed-faqs.ts --apply`
  - `npx tsx scripts/seed-nav.ts --apply`
- [ ] Add a **hero image** to each service in Studio, then `npx tsx scripts/publish-all.ts --apply` 
- [ ] Remove any leftover test text (footer, taglines).

## 1. Booking (decide which mode)
- **External scheduler (JaneApp / Acuity / etc.):** get their booking link.
  - Jane clinic-wide link: **Jane > Settings > Branding > "Book Online Buttons"** > copy the plain URL.
  - Paste into **Sanity > Site Settings > Booking > External booking link**. Publish. Every Book button now routes there.
  - Per-service deep links: in Jane, click each treatment on the live booking page and copy the browser URL (the `#/.../treatment/ID` link). Paste into each service's "Booking link for this service" field in Studio.
  - VERIFY the deep links before trusting them: `npx tsx scripts/check-jane-links.ts` drives a real browser to each link and reports which treatment it actually lands on (Jane's hash links are easy to mislabel). Bulk-set with `npx tsx scripts/set-booking-links.ts --apply`.
  - Same service at multiple lengths (e.g. 60/90 min): combine into one card + length picker via the service **Options** field in Studio, or `npx tsx scripts/combine-service-options.ts --apply`.
- **Built-in scheduler (non-medical clients):** leave External booking link blank, then:
  - `npx tsx scripts/seed-studio-db.ts --apply` (Studio + hours + services into Neon)
  - Confirm real weekly hours in `scripts/seed-studio-db.ts`.

## 2. Content + access
- [ ] Confirm real **business hours** (Site Settings > Contact & footer) — shows on Contact page + footer.
- [ ] Add **Google Maps embed URL** (Maps > the listing > Share > Embed a map > copy the `src` URL) into Contact & footer.
- [ ] Set **business name, tagline, description, phone, email, address, social links**.
- [ ] Upload **logo** (transparent PNG/SVG) if they have one; otherwise the business name shows as text (fine).
- [ ] **One Sanity organization per client.** Create the org first (sanity.io/manage > create organization), then the project inside it. This walls clients off; a project member can otherwise see sibling projects' names + usage in the same org. (To move an existing project: project Settings > Danger zone > Transfer ownership > pick the org. Keeps the project ID/tokens/settings intact.)
- [ ] **Invite the client to Sanity** as **Editor** (NOT Admin): their project > Members > Invite (their email). Editor edits all content but cannot see your API tokens or project settings; Admin can. After inviting, have them **log out and back in** so the grant registers (a fresh permission doesn't apply to a live session, this is why "Editor can't edit" usually clears on re-login). Test the role with a throwaway account first.
- [ ] Add the client's **domain (and `www`) to Sanity CORS** with **Allow credentials** on: their project > API > CORS origins. This is what makes `clientdomain.com/studio` load. (Add `localhost:3000` once per dev machine too.)
- [ ] **(Recommended at scale) Centralize DNS in Cloudflare** (free): add each domain as a zone, confirm the imported records (especially MX/email), then point the registrar's nameservers at Cloudflare. After that every DNS change lives in one dashboard you control, no per-client registrar logins. The one-time nameserver switch needs the registrar login once.
- [ ] **(Optional) Dedicated studio subdomain** `studio.clientdomain.com`: add a CNAME (in Cloudflare/DNS), add the domain in Vercel, and the template's host-based rewrite serves the studio there. Cleaner than `/studio` for editors. Add it to Sanity CORS too.

## 3. Go live (production)
- [ ] Merge the branch to **main** (production deploys from main):
  - `git checkout main && git merge <branch> && git push`
- [ ] In Vercel: **Settings > Domains > Add** their domain (e.g. `theirbusiness.com`).
- [ ] At their **registrar / DNS host**: add the DNS records **exactly as Vercel shows them** (currently apex A `216.198.79.1` and `www` CNAME `cname.vercel-dns.com`; Vercel may display newer values, use those). Vercel auto-issues SSL. Do **not** change nameservers (keeps their email intact) unless you're moving DNS to Cloudflare per section 2.
- [ ] DNS propagation: 15 min - a few hours (up to 48). Verify the domain serves the site over HTTPS.
- [ ] Re-confirm the preview login wall is off / production is public.

## 4. Handoff
- [ ] Record a **5-minute Loom**: how to edit text, swap a photo, change a price in Sanity. (Also a value-add talking point.)
- [ ] Send them: their live URL, their Sanity Studio link (`<domain>/studio`), the Loom.
- [ ] **Content backup + restore drill.** Export: `npx sanity dataset export production ./backups/<client>-<date>.tar.gz`. Then prove recovery ONCE: import into a scratch dataset (`npx sanity dataset import <file> restore-test`). A backup you've never restored isn't a backup. Store exports in a private backups repo or cloud drive (they're small).
- [ ] Confirm what to do if something looks wrong: screenshot + text you (they don't touch code; data is backed up).

## 5. Per-client env (when each client gets their own infra at scale)
- Each client = own Sanity project + own Vercel project + (if using built-in booking) own Neon DB.
- Set in that client's Vercel project env: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_STUDIO_TITLE`, Sanity tokens, and (if built-in booking) `DATABASE_URL`/`DIRECT_URL`.

## Quick "what lives where" (for explaining to clients)
- **Sanity** = everything you see + edit (words, photos, prices, the dashboard).
- **Neon** = the live records: bookings, customers, payments, availability. (Idle for clients on an external scheduler like Jane.)
- **Vercel/Next.js** = runs the site; pulls from both and builds the pages. Sanity and Neon never talk to each other; the code is the brain that combines them.
