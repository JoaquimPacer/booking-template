# Next steps (Phase 0 wrap-up)

This file is for Joaquim. After Phase 0 scaffolding (this commit), there are external account steps that can't be done locally. Knock these out in any order.

## 1. Push this repo to GitHub

```sh
cd C:/Users/f927g/OneDrive/Documents/GitHub/booking-template
gh repo create JoaquimPacer/booking-template --public --source=. --remote=origin --push
```

If `gh` is not authenticated yet: `gh auth login`. Pick GitHub.com, HTTPS, paste token or browser-auth.

## 2. Create Neon Postgres project

1. Go to [console.neon.tech](https://console.neon.tech). Sign up with GitHub (free).
2. New project: name it `booking-template`. Region = closest to you.
3. After creation, you'll have a `main` branch. Create a second branch: **Branches** > **Create branch** > name = `staging`.
4. For each branch, **Connection Details** > copy the **Pooled connection** URL. You'll have two `DATABASE_URL` strings.

## 3. Create Sanity project

1. Go to [sanity.io/manage](https://sanity.io/manage). Sign up with GitHub (free).
2. Create new project: name = `booking-template`, plan = Free.
3. Copy the **Project ID** (e.g. `abcd1234`).
4. Default dataset is `production` (public). Free tier limit: keep it public.

## 4. Connect to Vercel

1. Go to [vercel.com](https://vercel.com). Sign up with GitHub (free).
2. Import `JoaquimPacer/booking-template` as a new Vercel project.
3. Framework preset = Next.js (auto-detected).
4. Skip env vars at first import (it'll fail to deploy, that's expected).

## 5. Set Vercel env vars

In the Vercel project > **Settings** > **Environment Variables**, add the following per environment.

**Production** (deploys from `main`):
```
DATABASE_URL=<Neon main branch URL>
NEXT_PUBLIC_SANITY_PROJECT_ID=<Sanity project ID from step 3>
NEXT_PUBLIC_SANITY_DATASET=production
NEXTAUTH_URL=https://booking-template.vercel.app
NEXTAUTH_SECRET=<generate via: openssl rand -base64 32>
```

**Preview** (deploys from any non-main branch):
```
DATABASE_URL=<Neon staging branch URL>
NEXT_PUBLIC_SANITY_PROJECT_ID=<Sanity project ID>
NEXT_PUBLIC_SANITY_DATASET=production
NEXTAUTH_URL=https://booking-template-git-<branch>.vercel.app
NEXTAUTH_SECRET=<different random value>
```

(Stripe / Resend / Twilio / Google Calendar can be added in Phase 2 when those features are wired in.)

## 6. Apply Prisma schema to Neon

From your local machine after env vars are pasted:

```sh
cp .env.example .env.local
# Fill in DATABASE_URL with the Neon `staging` branch URL.
npx prisma migrate dev --name initial_schema
```

This creates all the tables on the Neon staging branch. After verifying it works, do the same for the `main` branch:

```sh
DATABASE_URL=<Neon main branch URL> npx prisma migrate deploy
```

## 7. Trigger first Vercel deploy

```sh
git push origin main
```

Vercel auto-deploys. Visit `booking-template.vercel.app`. You should see the default Next.js landing page (this is fine for Phase 0, Phase 1 replaces it).

Visit `booking-template.vercel.app/studio`. Sanity Studio should load, prompt you to log in, and show an empty content workspace.

## 8. Phase 0 verification checklist

Per the approved plan:
- [ ] `booking-template.vercel.app` returns 200 with the Next default landing.
- [ ] `npx prisma migrate deploy` runs cleanly against the Neon staging branch.
- [ ] Sanity Studio loads at `booking-template.vercel.app/studio`.
- [ ] `docs/decisions/0001-stack-choice.md` is committed.

When all four are checked, Phase 0 is done. Phase 1 (marketing surface + Sanity content models) starts May 16.

## OneDrive sync note

This repo lives under OneDrive (`C:/Users/f927g/OneDrive/Documents/GitHub/booking-template/`). The `node_modules/` folder is 1+ GB and many small files. OneDrive will try to sync it. Two options:

- **Option A (recommended):** right-click `node_modules/` in File Explorer > **Free up space** to mark it offline-only. OneDrive stops syncing it but it stays usable locally.
- **Option B:** move the entire `booking-template/` folder out of OneDrive (e.g. to `C:/dev/booking-template/`). More work but bulletproof.

Same applies to `.next/` after first build.
