# ADR 0008: Client email on their own domain, Cloudflare in and Resend out

**Date:** 2026-10-19 (records a decision made and first built on 2026-08-01)
**Status:** Accepted

Every client gets a working `name@theirdomain.com` without anyone buying a mailbox. Mail
arrives in the Gmail they already read, and replies leave as the business address. This ADR
records why, because the runbook and the provisioner shipped on 2026-08-02 without one.

## Context

Clients want a professional address on their own domain. Most of them already live in a
personal Gmail and will not check a second inbox. Joaquim does not want to hold anyone's
mail, and the stack has to stay at $0 per client until the volume justifies a paid plan.

## Decision

1. **Inbound: Cloudflare Email Routing.** It forwards each address into the client's own
   Gmail. Free, unlimited addresses, receive only. It needs the apex MX to be Cloudflare's,
   so any old MX (registrar parking, GoDaddy and similar) is deleted first.
2. **Outbound: Gmail "Send mail as" over Resend SMTP** (`smtp.resend.com`, port 465). Email
   Routing cannot send at all, so a relay is required.
3. **One free Resend account per client domain, registered to an address on the client's
   own domain.** Resend's free plan verifies one domain per account. Registering it on their
   domain means the account belongs to the client and leaves with them (global Rule 21);
   Joaquim only administers it. Set the Cloudflare forward up first so the signup email can
   arrive.
4. **Authentication:** Cloudflare adds the apex SPF; Resend adds DKIM plus MX and SPF on a
   `send.` subdomain (no clash with the apex MX); DMARC is added by hand at `p=none`.
5. **Scripted DNS, hand-done Gmail wizard.** The DNS side is provisioned by
   `booking-flow-pitches/tools/email/provision-email.mjs`; the ten-minute Gmail wizard is
   done on the client's screen with them, per `booking-flow-pitches/templates/CLIENT-EMAIL-SETUP.md`.

## Alternatives declined

- **Migadu mailboxes.** An earlier draft recommended paying for them. Joaquim redirected to
  the Gmail approach on 2026-08-01: it costs less and has better custody, since Joaquim never
  holds a client's mail (session summary `booking-flow-pitches/session-summaries/2026-08-03-client-domain-email.md`).
  Declined for now, not forever; it is the natural landing spot in the exit path below.
- **Cloudflare Email Sending** ($5 a month on Workers Paid). It does outbound SMTP, but it
  was in public beta as of August 2026 and was rejected for client business email on that
  basis. Worth a re-check once it is generally available.

## Consequences

- $0 per client, no second inbox, no new password for the client.
- Around the fourth client, consolidate onto Resend Pro ($20 a month, ten domains, one
  account) instead of juggling free accounts.
- Gmail can refuse Cloudflare-forwarded mail whose original sender is Google itself (seen on
  Native Texan Two Step, 2026-08-19, verification mail refused for over a day). The fix is a
  per-domain Email Worker that re-delivers Google-origin mail through the client's Resend
  account (`native-texan-two-step/tools/email-relay-worker/`). Domains without that worker
  do not have the fix.
- Rotating a client's Resend key means updating Gmail's send-as password and, where a relay
  worker exists, its stored key.

## Exit path

If Google ever changes or removes "Send mail as", point the domain's MX at a real mailbox
provider (Migadu or similar) and move the addresses there. Nothing is lost in transit,
because Cloudflare owns the receiving side and past mail already sits in the client's own
Gmail.

## Sources

- Runbook: `booking-flow-pitches/templates/CLIENT-EMAIL-SETUP.md`
- Provisioner: `booking-flow-pitches/tools/email/provision-email.mjs`
- Decision notes: `booking-flow-pitches/session-summaries/2026-08-03-client-domain-email.md`
- Related: [ADR 0005](./0005-fork-per-client-and-template-sync.md) (each client owns their own stack)
