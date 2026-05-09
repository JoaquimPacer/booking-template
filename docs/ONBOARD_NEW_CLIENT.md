# Onboard a new client

Process for spinning up a per-client deploy from this template. Target time: under one full day of dev work.

## 1. Create the client repo

On GitHub, click "Use this template" on `JoaquimPacer/booking-template` and create a new repo named `<client-slug>` (e.g. `lonestar-massage`). Set it private if appropriate.

```sh
gh repo clone JoaquimPacer/<client-slug>
cd <client-slug>
npm install
```

## 2. Create the Neon Postgres project

At [console.neon.tech](https://console.neon.tech), create a new project named after the client. Create two branches: `main` (production) and `staging`.

Copy the `DATABASE_URL` for each branch.

## 3. Create the Sanity project

At [sanity.io/manage](https://sanity.io/manage), create a new project. Note the **project ID**. Create two datasets: `production` and `staging` (Sanity charges only for the second dataset on the Growth tier; for free tier, use `production` only).

## 4. Apply the schema

```sh
DATABASE_URL=<staging-url> npx prisma migrate deploy
```

This creates all the tables. Repeat for `main` once the client is live.

## 5. Connect the repo to Vercel

At [vercel.com](https://vercel.com), import the new GitHub repo as a new Vercel project. Set environment variables (per `.env.example`) at three levels:

- **Production** (deploys from `main` branch)
- **Preview** (deploys from every other branch, used for staging)
- **Development** (only used by `vercel dev`)

Critical vars per environment:
- `DATABASE_URL` (different per env: prod uses Neon `main`, preview uses Neon `staging`)
- `NEXT_PUBLIC_SANITY_PROJECT_ID` (same across envs)
- `NEXT_PUBLIC_SANITY_DATASET` (`production` for prod, `staging` for preview)
- `NEXTAUTH_SECRET` (different random value per env)
- Stripe (test keys for preview, live keys for prod)
- Resend (`onboarding@resend.dev` for preview, verified `bookings@<clientdomain>.com` for prod)
- Twilio (account SID + auth token + phone number)
- Google Calendar (client ID + secret + redirect URI matching the deploy URL)

## 6. First deploy

Push to `main`. Vercel auto-deploys. Verify at `<client-slug>.vercel.app`.

## 7. Sanity content seed

Walk the client through Sanity Studio at `<client-slug>.vercel.app/studio`. Have them populate the site, services, instructors, FAQ, and contact info. Or seed it yourself from their existing public material per the rapid-replicate workflow.

## 8. Hook up the domain

Buy or transfer the client's domain (Hover or similar). In Vercel project settings, add the custom domain. DNS update propagates in minutes.

## 9. Google Business Profile linkage

In the client's Google Business Profile dashboard, add the new website URL in the "Website" field. Submit `<domain>/sitemap.xml` to Google Search Console.

## 10. Stripe live mode

Once the domain is live and the client is taking bookings, switch Stripe from test to live keys in Vercel production env vars. Verify with one $1 test booking from the client's own card.

## Time tracking

Log start/end timestamps the first three times you do this. Aim to compress to under 4 hours by the third client.
