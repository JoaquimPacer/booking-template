# ADR 0004: Support an external scheduler (JaneApp) per client

**Date:** 2026-05-30
**Status:** Accepted

## Context

Theresa does oncology / medically-adjacent massage. Real online booking for her would mean collecting health-adjacent info + payments, which drags in **HIPAA** (or at least serious data-sensitivity) and **payment handling**. Doing that ourselves means enterprise Neon + BAAs across Vercel/Neon/Twilio + legal review, or a strict data-minimization design we maintain and stand behind. That is a large, slow, risky lift for client #1.

Theresa already uses **JaneApp**, built for health practices: online booking, **Jane Payments** (card at booking, pre-payment, no-show protection), intake, and HIPAA on their side. Jane provides copy-paste "Book Online" buttons/links for any website. Cost to her is far less than enterprise infra + legal.

## Decision

The booking-template supports **two booking modes per client deploy**, chosen by one Sanity field (`siteSettings.externalBookingUrl`):

1. **External scheduler** (Theresa): set `externalBookingUrl` to her Jane booking page. Every "Book" button links out to Jane (new tab); `/book/[slug]` redirects to Jane. **We store zero patient data.** The site is a marketing front-end.
2. **Built-in scheduler** (non-medical clients): leave it blank -> our own Phase 2B/2C engine (slot picker, Stripe, etc.).

The in-house engine stays fully intact for clients who don't need HIPAA (trainers, tutors, barbers, dance studios).

## Consequences

- **HIPAA exposure for Theresa drops to ~zero on our side**: no health or payment data in Neon. Jane is the system of record; we are not a business associate handling PHI.
- **Faster to a sellable demo for Theresa**: no Stripe/email/SMS build needed for her launch. Marketing site + link to Jane = shippable now.
- The template is more broadly sellable: "we plug into your existing scheduler" works for businesses already on Jane/Acuity/etc.
- Tradeoff: external-scheduler clients don't get our unified /admin or in-house flow. Acceptable; medical clients value compliance over our UX.
- The in-house /book notes field was relabeled to discourage health details (defense-in-depth for non-Jane clients).
- **Revisit at:** a non-medical client who wants the full in-house paid flow (drives Phase 2C Stripe), or if Theresa wants booking embedded on her own domain (Jane supports iframe embed codes; we currently link out, which is most reliable).
