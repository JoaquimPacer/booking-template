# 0002 — Prospects folder convention in booking-flow-pitches

**Date**: 2026-05-12
**Status**: accepted
**Repo affected**: `booking-flow-pitches` (not booking-template, despite this ADR's location)

---

## Context

The `booking-flow-pitches` repo originally had a `clients/` folder at the root, with one subfolder per signed client (e.g., `clients/native-texan-two-step/`). The CLIENT-FOLDER-CONVENTION.md was established 2026-05-11.

By 2026-05-12, Joaquim is actively pitching multiple prospects in parallel (Newberry Automotive as client #3 candidate, with Theresa massage therapist queued behind). Several questions arose:

- Where do pitch-stage work products live? Audit deliverables, discovery questions, competitor scans, call prep — these accumulate for prospects who haven't signed yet.
- If a prospect declines, do their files clutter `clients/` permanently?
- If a prospect signs, can we promote their folder to `clients/` without losing git history?
- Should pre-signed work live in a separate repo entirely?

## Decision

Add a top-level `prospects/` folder to `booking-flow-pitches`. Identical folder shape to `clients/` (per CLIENT-FOLDER-CONVENTION.md). On signed deal, promote via `git mv prospects/<slug>/ clients/<slug>/`.

```
booking-flow-pitches/
  clients/                     ← signed clients
    native-texan-two-step/
    newberry-automotive/       ← when promoted
  prospects/                   ← pitched, not signed
    newberry-automotive/       ← starts here
    massage-therapist/         ← future
  briefs/
  templates/
  scripts/
  session-summaries/
```

## Rules

1. **Folder shape is identical** to `clients/<slug>/` per CLIENT-FOLDER-CONVENTION.md. Mechanical promotion.
2. **No `build/` folder for prospects.** Build (code, plugin, site source) work begins only after promotion to `clients/`. Avoids investing engineering on unsigned prospects. Strategy docs and audit deliverables are fine in prospect-stage.
3. **PROJECT-STATUS.md** must be present at every prospect folder root and reflect "prospect" stage explicitly.
4. **Promotion is atomic**: `git mv prospects/<slug>/ clients/<slug>/` in one commit. Preserves full file history.
5. **Declined prospects**: move to `prospects/_archive/` with a SHORT note in the README on why declined. Don't delete (may pitch again later).
6. **Prospects do not get GitHub access invitations.** They are pitch-stage; access is granted post-signing.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Single `clients/` folder with status field | Mixes signed work with speculative work; hard to skim "what am I pitching." |
| Separate `booking-flow-prospects` repo | Cross-repo promotion via `git filter-repo` fragments history; tools/templates require duplication or symlinks; doubles MEMORY.md scope. |
| `pitches/` folder naming (matching repo name `booking-flow-pitches`) | "Pitches" implies marketing collateral; "prospects" is the standard sales-pipeline term. Cleaner semantic. |
| Add a `clients/pitch-stage/` subfolder | Buries pitches inside `clients/`; clutters when most are not clients. |

## Consequences

- **Positive**: clean separation of pipeline stages, git-history preservation on promotion, tools and templates auto-shared via root, MEMORY.md scope unchanged.
- **Positive**: PROJECT-STATUS.md at folder root makes pipeline stage scannable at a glance for any AI agent.
- **Negative (minor)**: CLIENT-FOLDER-CONVENTION.md will need a one-line note that "this convention also applies to `prospects/` subfolders" so it stays the source of truth. Will be added in a follow-up commit.
- **Negative (minor)**: introduces one new top-level folder in the repo. Tradeoff accepted.

## Supersedes

None. This is a new convention.

## Superseded by

(none yet)

## See also

- `booking-flow-pitches/clients/CLIENT-FOLDER-CONVENTION.md` — folder shape definition
- `booking-flow-pitches/prospects/newberry-automotive/` — first application of this convention
- Master plan for Newberry: `~/.claude/plans/c-users-f927g-downloads-newberry-analyt-gentle-sonnet.md` (v6 — proposed and approved this ADR)
