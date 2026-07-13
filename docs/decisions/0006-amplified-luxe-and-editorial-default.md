# ADR 0006: Amplified Luxe preset and Editorial as house default

**Date:** 2026-07-12
**Status:** Accepted (merge to main gated, see Consequences)

## Context

Two real client demos showed prospects could not see the difference between
the B - Editorial and C - Luxe presets. Under the hood they shared everything
except shadows and motion, so there was genuinely little to see, and the
switcher demo undersold the design capability it exists to showcase.

A redesign was prototyped in the newberry-automotive fork (branch
`design/luxe-amplified`, kept unmerged there as a shareable option, since
James had already seen the site and it must not change under him). Design
lesson from the iterations, proven by pixel measurement: on blue-ish brand
palettes, tasteful color washes converge with Editorial's warm grays; a
visible difference has to be structural, not chromatic.

## Decision

1. **Luxe is amplified structurally** (one appended soft-luxe-scoped block in
   `globals.css`): tinted section bands become floating rounded gradient
   panels, cards and testimonials carry deep brand-tinted elevation, radius
   grows to 1.25rem, CTAs get a top-lit gradient, the header floats frosted,
   the footer takes a 30 percent brand tint. Classic and Editorial rules are
   untouched (verified byte-identical by screenshot comparison during design).
2. **B - Editorial is the house default for new clients**: schema
   `initialValue` and the `layout.tsx` runtime fallback both moved from
   `classic` to `warm-editorial`. Datasets with an explicit preset choice are
   unaffected.
3. Three presets stay the full menu; no fourth option (more choices overwhelm
   clients).
4. `docs/STYLE_PRESETS.md` is the single source of truth for what each preset
   is and how to present it to clients.

## Consequences

- Every future client fork starts with the amplified Luxe available and
  Editorial as its default look.
- **Merge gate:** booking-template `main` still auto-deploys
  theresaattea.com, and Theresa's live preset IS soft-luxe, so merging this
  branch changes her live site dramatically. The branch stays unmerged until
  either (a) Joaquim approves her new look on a preview of her content, or
  (b) the Theresa fork migration (ADR 0005 follow-up) lands first. Whichever
  happens, the decision is explicit, never a side effect.
- The runtime fallback change flips any dataset with NO explicit preset from
  Classic to Editorial rendering. Known affected: the Lonestar pitch demo and
  the qa-sparse fixture (both non-client). Theresa and Newberry have explicit
  values and are unaffected.
- Newberry keeps its own copy of the amplified Luxe on its unmerged
  `design/luxe-amplified` branch as a client-facing option; if James opts in,
  merge that branch in the fork.
- **Revisit at:** the Theresa merge decision, or if a client asks for the old
  subtle Luxe (git history has it).
