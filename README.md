# booking-template

Reusable Next.js + Sanity + Postgres + Prisma booking template. Fork into a per-client repo, customize content in Sanity, deploy to Vercel.

## Read first if you're a fresh-context AI

1. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the high-level overview + Mermaid diagrams.
2. [docs/decisions/0001-stack-choice.md](./docs/decisions/0001-stack-choice.md) (and the rest of `docs/decisions/`) for why the stack is what it is.
3. The companion docs repo: `github.com/JoaquimPacer/booking-flow-pitches`. Especially:
   - `templates/BOOKING_TEMPLATE_V1_SPEC.md` for the v1 scope.
   - `templates/BOOKING_TEMPLATE_LONG_TERM_VISION.md` for the full Acuity-clone target.
   - Latest `session-summaries/<YYYY-MM-DD>.md` for the most recent direction.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind + Prisma + Neon (Postgres) + Sanity (hosted, embedded Studio at `/studio`) + NextAuth.js + Stripe + Resend + Twilio + Google Calendar API. Hosted on Vercel.

## Local dev

```sh
cp .env.example .env              # then fill in values (use .env, NOT .env.local; Prisma's CLI reads .env)
npx prisma generate               # generate the Prisma client
npx prisma migrate dev            # apply schema to your local Neon branch
npm run dev                       # http://localhost:3000
                                  # Studio at http://localhost:3000/studio
```

## Per-client onboarding

See [docs/ONBOARD_NEW_CLIENT.md](./docs/ONBOARD_NEW_CLIENT.md). High-level: GitHub "Use this template" -> new repo -> new Neon project -> new Sanity project -> wire env vars in Vercel -> push.

## Updating content (for clients / non-devs)

See [docs/UPDATING_CONTENT.md](./docs/UPDATING_CONTENT.md). Marketing content (text, photos, services, FAQ) lives in Sanity Studio at `/studio`. No Git involved. Booking config (prices, schedules, refunds) lives in the admin UI at `/admin`.

## Deploy

Push to GitHub, Vercel auto-deploys. `main` branch = production. Every other branch = preview URL (staging). Env vars are set per environment in Vercel project settings.

## License

MIT during development. Source-available license (BSL-style) when commercialized; clients own data + use code, can't resell. See companion `booking-flow-pitches/clients/native-texan-two-step/license-source-available.md` for the model.
