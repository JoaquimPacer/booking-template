# Architecture decision record (ADR) 0008: Client email on their own domain, Cloudflare in and Resend out

**Date:** 2026-10-19 (records a decision made and first built on 2026-08-01)
**Status:** Accepted

Every client gets a working `name@theirdomain.com` without anyone buying a mailbox. Mail
arrives in the Gmail they already read, and replies leave as the business address. This ADR
records why, because the runbook and the provisioner shipped on 2026-08-02 without one.

## Context

Clients want a professional address on their own domain. Most of them already live in a
personal Gmail and will not check a second inbox. Joaquim does not want to hold anyone's
mail. Start with free plans where they support the client's needs and account ownership.

## Decision

1. **Inbound: Cloudflare Email Routing.** It forwards each address into the client's own
   Gmail. Free, unlimited addresses, receive only. It needs Cloudflare's mail exchanger
   (MX) records at the domain root. For an existing mail service, use the staged migration
   below before replacing its MX records.
2. **Outbound: Gmail "Send mail as" over Resend's Simple Mail Transfer Protocol (SMTP)**
   (`smtp.resend.com`, port 465). Email Routing cannot send at all, so a relay is required.
3. **Each client owns their Cloudflare and Resend accounts.** Open both accounts in the
   client's name, with JQ Innovation as an invited member. The client controls account
   recovery and billing and keeps access when our work ends (global Rule 21). Use one
   Resend account per client domain. Its free plan verifies one domain per account. Set
   the Cloudflare forward up before registering Resend to the client's business address
   so the signup email can arrive.
4. **Mail authentication:** The Domain Name System (DNS) holds the domain's routing and
   authentication records. Cloudflare adds Sender Policy Framework (SPF) at the domain
   root. Resend adds DomainKeys Identified Mail (DKIM) plus MX and SPF on a `send.` subdomain,
   separate from the root MX records. Add Domain-based Message Authentication, Reporting,
   and Conformance (DMARC) by hand at `p=none`.
5. **Scripted DNS, hand-done Gmail wizard.** The DNS side is provisioned by
   the provisioner linked below. The ten-minute Gmail wizard is done on the client's
   screen with them, following the runbook linked below.

## Alternatives declined

- **Migadu mailboxes.** An earlier draft recommended paying for them. Joaquim redirected to
  the Gmail approach on 2026-08-01: it costs less and has better custody, since Joaquim never
  holds a client's mail (see the decision notes linked below).
  A mailbox provider remains an option in the exit path below.
- **Cloudflare Email Sending** ($5 a month on Workers Paid). It does outbound SMTP, but it
  was in public beta as of August 2026 and was rejected for client business email on that
  basis. Worth a re-check once it is generally available.

## Consequences

- Clients keep using their existing inbox. Free plans keep costs at $0 where they meet
  the client's needs and allow JQ Innovation to join as an invited member.
- When a client needs a paid plan, upgrade that client's independently owned account.
  Each client's Cloudflare routing and Resend sending stay in accounts they own.
  A shared account requires separate client approval as a temporary stopgap, with a
  handover date and the client's ownership and exit rights recorded. By that date, create
  accounts in the client's name, invite JQ Innovation, and move routing and sending using
  the staged migration below. Verify delivery before removing the client's configuration
  from the shared account.
- Gmail can refuse Cloudflare-forwarded mail whose original sender is Google itself (seen on
  Native Texan Two Step, 2026-08-19, verification mail refused for over a day). The fix is a
  per-domain Email Worker that re-delivers Google-origin mail through the client's Resend
  account (`native-texan-two-step/tools/email-relay-worker/`). Domains without that worker
  do not have the fix.
- Rotating a client's Resend application programming interface (API) key means updating
  Gmail's send-as password and, where a relay worker exists, its stored key.

## Exit path

If Google changes or removes "Send mail as", or the client chooses another provider,
migrate in stages:

1. Set up the new provider in parallel, in an account the client owns. Create every
   address and alias and prepare its sending authentication records. Leave the current
   route and sending service active.
2. Lower the DNS time-to-live (TTL) for the records that will change, for example to
   300 seconds where supported. Wait at least the previous TTL before switching so
   existing cached records have time to expire.
3. Move the MX records to the new provider and update its SPF, DKIM and other required
   sending records. Keep any authentication needed by the old sender during the overlap
   and update Gmail's sending settings or set up the client's new mail app.
4. Send test messages from an external mailbox to every migrated address and alias.
   Reply through the new provider and confirm receipt in the external mailbox. Check the
   providers' logs for delivery, rejection and authentication results in both directions.
   Resolve failures and repeat the tests before calling the switch complete.
5. Keep the old route and sending service live for at least seven days after the switch,
   and longer if their logs show traffic still arriving. Monitor both providers and
   investigate missing test messages or delivery failures during that window.
6. After that window and successful delivery checks, retire the old route, revoke its
   sending credentials, and remove obsolete records. Restore the normal TTL and confirm
   the client can administer the new provider without JQ Innovation.

Mail in flight during the switch can be delayed, rejected or lost. The overlap and tests
reduce that risk but cannot prove that every message arrived. Past mail remains in the
client's Gmail unless separately copied or moved, so agree on any history transfer with
the client before retiring that inbox.

## Sources

- [Runbook](../../../booking-flow-pitches/templates/CLIENT-EMAIL-SETUP.md): Documents the Gmail setup and delivery checks.
- [Provisioner](../../../booking-flow-pitches/tools/email/provision-email.mjs): Records the scripted DNS setup.
- [Decision notes](../../../booking-flow-pitches/session-summaries/2026-08-03-client-domain-email.md): Records the original implementation and checks.
- Related: [ADR 0005](./0005-fork-per-client-and-template-sync.md) supports each client owning their own stack.
