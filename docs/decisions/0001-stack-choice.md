# ADR 0001: Stack choice — Vercel + Neon + Sanity (not droplet)

**Date:** 2026-05-09
**Status:** Accepted

## Context

The booking-template needs a stack that:
1. Costs ~$0 during build + pitch demo phase.
2. Lets non-devs (clients, instructors) update content without Git.
3. Spins up new client deploys in under one day.
4. Provides preview URLs for staging on every Git branch.
5. Doesn't require Joaquim to do ops on every client.

Considered alternatives:
- **Personal droplet (DigitalOcean) for everything.** Costs $6-12/mo total but Joaquim becomes the ops team for every client (deploys, backups, Postgres patches, security hardening). Staging is awkward (second port or second droplet).
- **Vercel + Neon + Sanity.** Free tier covers all of build/demo. ~$20/mo per Vercel team once paying clients launch (one team hosts many client projects). Zero ops.
- **Vercel + Postgres on droplet.** Hybrid. Splits ownership, doubles backup/migration headaches.

## Decision

Use **Vercel** for the Next.js app, **Neon** for Postgres, **Sanity** (hosted) for the CMS. All free tier during build phase.

## Consequences

- **Cost.** $0 while building. ~$20-25/mo when first paying client launches (Vercel Pro team + Twilio usage + the client's domain). Sanity and Neon stay on free tier for most small-business clients.
- **Ops.** Near-zero. Vercel handles deploys, certs, CDN. Neon handles Postgres backups and Git-style branching. Sanity handles Studio hosting.
- **Data control.** Postgres data is in Neon (AWS-backed), exportable on demand via `pg_dump`. Schema lives in Prisma TS files in this repo. Sanity content is exportable via `sanity dataset export`. Practical control = same as a droplet, minus the ops time.
- **Lock-in.** Neon is standard Postgres (one command to migrate to any other Postgres host). Sanity is proprietary but content is exportable. Vercel is replaceable with any Node host running Next.js.
- **Vercel commercial-use boundary.** Hobby plan is non-commercial. Once a client takes real money on a deploy, that deploy needs Pro ($20/mo per team; one team hosts many client projects). Decision deferred per-client at launch time.
- **Revisit at:** 5+ live clients, or first contractual requirement for self-hosted prod data.
