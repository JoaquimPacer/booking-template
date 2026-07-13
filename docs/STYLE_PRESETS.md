# Style presets: what they are and how to talk about them

The single source of truth for the A / B / C design presets. If you are about
to demo the switcher to a prospect or explain the options to a client, this is
the file.

## The one-sentence version

One dropdown in Sanity (Site Settings > Brand theme > Style preset) restyles
the entire site. Content never changes; only the design personality does.

## The three looks (client-friendly words)

**A - Classic.** Clean and simple. The unmodified foundation: square-ish
corners, quiet grays, no decorative extras. For businesses that want their
site to stay out of the way.
Say: "This is the no-frills look. Fast, clear, nothing between your customer
and the Book button."

**B - Editorial. The house default.** Crisp and refined, like a well-set
magazine. Warm neutrals derived from the client's own brand colors, larger
fluid headlines, small uppercase kicker labels above sections, pill-shaped
buttons, flat surfaces. Polished but restrained.
Say: "This is our signature look. It takes your brand colors and sets
everything like print: confident type, warm tones, no gimmicks."

**C - Luxe.** Everything in Editorial, then turned into an experience:
sections float as giant rounded gradient panels, cards carry deep soft
shadows tinted with the brand color, corners get rounder everywhere, buttons
pick up a subtle top-lit gradient, the header floats frosted over the page,
the footer dresses in the brand color, and sections fade in gently as you
scroll.
Say: "Same content, different feel: the whole site gets depth and atmosphere.
Watch the sections float." (Then flip the switcher back and forth once;
the panels do the selling.)

## Demo tips

- The A/B/C switcher (bottom right) appears on every preview deployment and
  local dev automatically, never on production. To show it ON a production
  pitch demo, set the env flag `NEXT_PUBLIC_SHOW_STYLE_SWITCHER=true` on that
  Vercel project's Production environment, and unset it at go-live.
- The switcher is preview-only by design: visitors on a live site never see
  it. The client's real preset is chosen once in Sanity.
- Flipping the Sanity dropdown is instantly reversible; content is untouched.

## How it works (one paragraph of engineering)

`layout.tsx` reads `siteSettings.brand.stylePreset` from Sanity and stamps it
as `<html data-style="...">`. Every preset is a block of CSS in
`src/app/globals.css` keyed off that attribute; all colors are derived from
the client's five brand colors via `color-mix()`, so the presets work for any
palette without new Sanity fields. Classic has zero rules on purpose (it IS
the foundation). Editorial and Luxe share a premium base; Luxe adds the
structural "atmosphere" block at the end of the file.

## Defaults and history

- B - Editorial is the default for new clients (schema `initialValue` and the
  runtime fallback in `layout.tsx`; decided 2026-07-12, ADR 0006).
- The amplified Luxe (floating panels) shipped 2026-07-12 after two client
  demos showed nobody could see the old Editorial-vs-Luxe difference. Design
  lesson recorded in ADR 0006: on blue-ish palettes, color washes alone
  converge; the differentiator had to be structural.
- Per-client preset choices live in each client's own Sanity dataset; check
  Site Settings > Brand theme in that client's Studio to know what is live.
