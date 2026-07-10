# ADR 0005: Fork per client, with a deliberate template sync process

**Date:** 2026-07-09
**Status:** Accepted

## Context

Two models were on the table for organizing client site code as JQ Innovation grows (raised 2026-07-04):

- **Model A, shared repo.** One codebase (`booking-template`), one Vercel project per client with client-specific env + domain. Shared fixes reach every client on the next deploy. Theresa runs this way today: `booking-template` `main` auto-deploys theresaattea.com through the `theresa-attea-lmt` Vercel project.
- **Model B, fork per client.** Each client is a separate repo forked from `booking-template`. Newberry Automotive already lives this way (`newberry-automotive` repo, its own git history).

The tension became concrete on 2026-07-05: an empty-state layout bug (homepage intro stranded half-width when a client has no instructor document) was fixed in the Newberry fork (`newberry-automotive` commit `37c0fc1`) but not in the template, so the template kept the latent bug for every future fork until it was ported back by hand (this branch).

## Decision

**Model B: one repo per client, forked from `booking-template`.** Joaquim's call (2026-07-09): each client is a big deal, and separate repos force per-client deliberateness. Changes to a live client's site should be a conscious act in that client's repo, never a side effect of template work. The duplication cost is accepted at the current client count.

`booking-template` remains the canonical template: generic, unbranded, hardened. Client forks diverge freely for client-specific needs.

**Sync process (both directions, manual and deliberate):**

1. **Fork to template (upstreaming).** When a fix lands in a client fork, ask at that moment: is this generic? If yes, port it to `booking-template` promptly so future forks inherit it. The port of Newberry's `37c0fc1` in this branch is the first instance of this rule.
2. **Template to forks (propagation).** When `booking-template` gets a fix, list the active client forks and decide per fork whether to apply it. Priority order: security fixes first (always propagate), then clarity/UX hardening (usually propagate), then cosmetic improvements (case by case). Client-specific styling never flows in either direction.
3. **Periodic diff review.** Every so often (for example when starting a new client), diff `booking-template` against each active fork to catch fixes that step 1 missed. The review looks for generic improvements sitting only in a fork, with the same security-first priority.

## Consequences

- Future clients start from a hardened template and diverge safely; no client's production can be changed by work on another client or on the template itself.
- Manual sync effort is the accepted price. If the client count grows to where the periodic diff review stops being practical, revisit (a shared-core package or Model A hybrid would be the candidates).
- **Theresa is the temporary exception**: her production still deploys from `booking-template` `main`. Migrating her to her own fork (own repo, `theresa-attea-lmt` Vercel project repointed at it) is a parked follow-up for a dedicated session. Until then, every push to template `main` is a production deploy for her and must be treated with production care.
- The pitch-demo Vercel project (`booking-template`, Lonestar demo content) keeps deploying from the template repo; that is fine because it is not a client.
- **Revisit at:** the Theresa fork migration (removes the exception above), or when active client forks exceed roughly five and the manual diff review starts to slip.
