# ADR 0007: Theresa's fork closes the last shared-repo exception

**Date:** 2026-08-03
**Status:** Accepted
**Supersedes:** the "Theresa is the temporary exception" consequence in [ADR 0005](./0005-fork-per-client-and-template-sync.md)

## Context

ADR 0005 chose fork-per-client and flagged one exception: Theresa Attea's production site
still deployed from `booking-template` `main` through the `theresa-attea-lmt` Vercel
project. That made every push to this repo a production deploy for a live client, and it
meant template work had to be done with production care indefinitely. ADR 0005 named the
migration as its own revisit trigger.

By 2026-08-03 every other client had their own repo (Carl's Automotive, Newberry
Automotive, Native Texan Two Step, Marley Art, Clover & Comb, JQ Innovation). She was the
only one left, which made the fleet inconsistent as well as risky.

## Decision

**Theresa's site moved to `JoaquimPacer/theresa-attea-lmt` (private), carrying the full
131-commit history rather than starting from a squashed initial commit.**

Newberry started clean because it forked early and then diverged, so its own history was
the interesting part. Theresa's site was built *inside* `booking-template`, so this repo's
history literally is the record of building her site. Squashing it would have deleted the
answer to "why is this the way it is" on a live production site.

The new repo keeps `upstream` pointed here. Template fixes come across by deliberate
cherry-pick, which is what ADR 0005's sync process asked for and what a squashed fork
makes awkward.

The Vercel project, its nine environment variables, all three domains, the Sanity project,
and the Neon database were untouched. Only the project's Git source changed.

## Consequences

- **`booking-template` `main` no longer deploys to any live client.** It still feeds the
  Lonestar pitch demo, which is not a client. Template work is now ordinary work.
- Every client site is a separate repo. No client's production can be changed by work on
  another client or on the template.
- Shared history makes the ADR 0005 periodic diff review practical for her:
  `git log --oneline main..upstream/main` says exactly what she has not taken.
- Full history is now the default for future migrations of an existing live site. A fresh
  squashed start stays fine for a NEW client forking the template, where there is no prior
  history worth carrying.
- The migration record, baseline snapshot, and rollback commands live in
  `booking-flow-pitches/clients/theresa-attea/migration/`.
- **Revisit at:** active client forks exceeding roughly five, where ADR 0005 already says
  the manual diff review starts to slip and a shared-core package becomes the candidate.
