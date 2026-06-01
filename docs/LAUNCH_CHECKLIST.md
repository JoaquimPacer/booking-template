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
- [ ] Add a **hero image** to each service in Studio, then `npx tsx scripts/publish-all.ts --apply`.
- [ ] Remove any leftover test text (footer, taglines).

## 1. Booking (decide which mode)
- **External scheduler (JaneApp / Acuity / etc.):** get their booking link.
  - Jane clinic-wide link: **Jane > Settings > Branding > "Book Online Buttons"** > copy the plain URL.
  - Paste into **Sanity > Site Settings > Booking > External booking link**. Publish. Every Book button now routes there.
  - (Optional later) per-service deep links: in Jane, click the treatment on the live booking page, copy the browser URL; add a per-service Jane field. Not required for launch.
- **Built-in scheduler (non-medical clients):** leave External booking link blank, then:
  - `npx tsx scripts/seed-studio-db.ts --apply` (Studio + hours + services into Neon)
  - Confirm real weekly hours in `scripts/seed-studio-db.ts`.

## 2. Content + access
- [ ] Confirm real **business hours** (Site Settings > Contact & footer) — shows on Contact page + footer.
- [ ] Add **Google Maps embed URL** (Maps > the listing > Share > Embed a map > copy the `src` URL) into Contact & footer.
- [ ] Set **business name, tagline, description, phone, email, address, social links**.
- [ ] Upload **logo** (transparent PNG/SVG) if they have one; otherwise the business name shows as text (fine).
- [ ] **Invite the client to Sanity** as Editor: sanity.io/manage > their project > Members > Invite (their email).
- [ ] Add the client's **domain + localhost:3000 to Sanity CORS**: sanity.io/manage > API > CORS origins.

## 3. Go live (production)
- [ ] Merge the branch to **main** (production deploys from main):
  - `git checkout main && git merge <branch> && git push`
- [ ] In Vercel: **Settings > Domains > Add** their domain (e.g. `theirbusiness.com`).
- [ ] At their **registrar** (GoDaddy/Namecheap/etc.): add the DNS records Vercel shows (A `76.76.21.21` and/or CNAME `cname.vercel-dns.com`). Vercel auto-issues SSL.
- [ ] DNS propagation: 15 min - a few hours (up to 48). Verify the domain serves the site over HTTPS.
- [ ] Re-confirm the preview login wall is off / production is public.

## 4. Handoff
- [ ] Record a **5-minute Loom**: how to edit text, swap a photo, change a price in Sanity. (Also a value-add talking point.)
- [ ] Send them: their live URL, their Sanity Studio link (`<domain>/studio`), the Loom.
- [ ] Confirm what to do if something looks wrong: screenshot + text you (they don't touch code; data is backed up).

## 5. Per-client env (when each client gets their own infra at scale)
- Each client = own Sanity project + own Vercel project + (if using built-in booking) own Neon DB.
- Set in that client's Vercel project env: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_STUDIO_TITLE`, Sanity tokens, and (if built-in booking) `DATABASE_URL`/`DIRECT_URL`.

## Quick "what lives where" (for explaining to clients)
- **Sanity** = everything you see + edit (words, photos, prices, the dashboard).
- **Neon** = the live records: bookings, customers, payments, availability. (Idle for clients on an external scheduler like Jane.)
- **Vercel/Next.js** = runs the site; pulls from both and builds the pages. Sanity and Neon never talk to each other; the code is the brain that combines them.
