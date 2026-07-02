# CLAUDE.md

Project notes for the booking-template repo. The global engineering and writing rules
(in `~/.claude/CLAUDE.md`) apply here too; this file only adds what is specific to this repo.

@AGENTS.md

## Project-specific notes

### Stack
- Next.js 16 App Router (see AGENTS.md above re: breaking changes from older Next versions)
- Tailwind v4 (CSS-first config in `globals.css`; no `tailwind.config.ts`)
- Sanity v3 (schemas at `sanity/schemas/`)
- Prisma + Neon Postgres
- shadcn/ui `base-nova` preset (uses `@base-ui/react`; does NOT support `asChild` like Radix-based shadcn)

### Common commands
- Type check: `npx tsc --noEmit`
- Dev server: `npm run dev`
- Build (runs migrations): `npm run build`
- Sanity Studio: `localhost:3000/studio`

### Where things live
- Marketing pages: `src/app/<route>/page.tsx`
- Sanity schemas: `sanity/schemas/{documents,objects}/`
- GROQ queries: `src/lib/sanity-queries.ts`
- SEO helpers + JSON-LD builders: `src/lib/seo.ts`
- Brand theme injection from Sanity: `src/components/brand-theme.tsx`
- ISR cache durations (single source of truth): `src/lib/cache.ts`

### Documentation
- Phase plan: `docs/ROADMAP.md`
- Architecture: `docs/ARCHITECTURE.md`
- Content flow (ISR / Sanity / Vercel): `docs/HOW_CONTENT_FLOWS.md`
- ADRs: `docs/decisions/`

### Conventions
- ADRs are immutable; supersede via a new numbered ADR rather than editing.
- Anki cards go to `C:\Users\f927g\Documents\Anki\<topic>\<YYYY-MM-DD>-<descriptor>.csv`; never in this repo.
- No em-dashes in any output.
- New Sanity content types need a registry entry in `sanity/schemas/index.ts`.
- Hardcoded CTAs (Book now etc.) belong in Sanity fields with a code fallback, not as bare strings in components.
