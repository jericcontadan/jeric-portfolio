# Jeric Contadan Portfolio: Design + Build Plan

_Approved 2026-11-26; Step 0 amendments from Jeric included._

## Context
Fresh Create Next App repo (Next 16.4.6, React 19.3, Tailwind 4.3, `app/` at root, no 3D deps yet).
CLAUDE.md is the full brief. This plan turns it into one buildable step per section/session.
Real `card-front.png` / `lanyard.png` (and profile, CV, screenshots) don't exist yet → generated placeholders
at the exact final filenames/dimensions, so swapping is a file replace with zero code changes.

## Design decisions (from brainstorm)
- **Audience:** 1) internship/OJT recruiters (3rd year, grad 2028), 2) small-business freelance clients.
- **CTAs:** View Projects = primary, Contact me = secondary (Download CV lives in About). **Contact reachable from anywhere**:
  slim sticky header with a violet "Contact" pill always visible (desktop + mobile, outside the hamburger).
- **3D approach (picked B):** keep React Bits Lanyard physics (rapier rope joints) + meshline strap with
  `lanyard.png`, but replace `card.glb` with a code-built card (drei `RoundedBox`, 5:7 aspect) —
  `card-front.png` on the front face, `card-back.png` on the back. No GLB download, no photo distortion.
  - Rejected A (stock GLB): UV atlas crops/stretches portrait image, ~1MB extra. Rejected C (CSS swing): loses physics feel, off-stack.
- **Reveals:** Framer Motion (`motion` package), subtle fade/translate on enter; disabled under reduced motion. *(my call)*
- **Fonts:** Space Grotesk (headings), Inter (body), via `next/font`. *(Jeric's call)*
- **Card back:** `card-back.png`, same 5:7 ratio as the front, on the back face of the 3D card. *(Jeric's call)*
- **Placeholders:** every placeholder is obviously fake (big PLACEHOLDER stamp; `cv.pdf` says "CV coming soon"),
  tracked in `docs/placeholders.md`; `npm run check:placeholders` fails while any remain. *(Jeric's call)*
- **Palette:** ink `#0A1024`, panel `#111A35`, line `#23305A`, text `#EEF0F7`, muted `#A3ABC4`,
  violet `#6D4AFF` (fills), violet-soft `#A68CFF` (text on navy).
- Projects order: Jean Rose POS → Lechon De Jay → Gunita Kopi → PinoyCart → This Portfolio (team/real-client work first for recruiters). *(my call)*

## Non-goals / anti-goals
- No copied text/images/layouts from other portfolios; no TUP seal/logo.
- No heavy scroll-jacking or flashy motion. Canvas must never trap vertical swipes. No horizontal scroll.
- Supabase form is a later phase — Contact ships first with email/socials + form UI wired to `mailto` fallback.

## Before any code (every step)
Read relevant guide in `node_modules/next/dist/docs/01-app/` (Next 16 has breaking changes — fonts, metadata,
dynamic imports, sitemap/OG conventions). Verify R3F/drei/rapier versions support React 19.3 before installing.

## Build steps (one per session; each ends with 360/768/1280 screenshots → `/code-review` → `/commit`)

### Step 0 — Foundation
- Commit design doc to `docs/superpowers/specs/2026-11-26-portfolio-design.md` (this content).
- Design tokens in `app/globals.css` (Tailwind 4 `@theme`): navy bg + gradient, violet accent, neutrals.
- Fonts via `next/font` in `app/layout.tsx`; base metadata (title/description).
- `components/Header.tsx`: sticky, nav Home·About·Projects·Experience·Contact, Contact pill, mobile menu
  (z-index above canvas, 44px targets, focus trap, Esc closes). `components/MenuContext.tsx` exposes `menuOpen` (3D pauses on it).
- `components/Footer.tsx`: © 2026, socials, back to top. `components/Section.tsx` wrapper (max-w ~1200px, spacing, anchor id).
- `scripts/make-placeholders.mjs` (`npm run placeholders`, uses `sharp`): `card-front.png` + `card-back.png` 1000×1400,
  `lanyard.png` 2048×256, `card-static.png`, `profile.jpg`, `projects/*.png`, `cv.pdf` ("CV coming soon").
  Hashes recorded in `scripts/placeholder-hashes.json`; `scripts/check-placeholders.mjs` reports leftovers.
  Tracked in `docs/placeholders.md`. Remove Next boilerplate SVGs.
- Create public GitHub repo `jericcontadan/jeric-portfolio` and push `main`; Jeric connects it to Vercel so every later step gets a live preview.

### Step 1 — Hero (text + static card)
- `components/Hero.tsx`: label, heading, one-liner, buttons (View Projects → `#projects`, Download CV → `/cv.pdf` download),
  GitHub/LinkedIn icon links (aria-labels). Desktop: text left / card right. Mobile: text first, smaller card below.
- Right slot renders `card-static.png` via `next/image` (priority) — this is also the reduced-motion + loading fallback.

### Step 2 — 3D Lanyard
- Install `three @react-three/fiber @react-three/drei @react-three/rapier meshline`.
- `components/lanyard/Lanyard.tsx` (adapted React Bits physics, code-built card), `LanyardSlot.tsx` loads it with
  `next/dynamic({ ssr:false })` after mount/idle; static image stays until canvas is ready.
- Performance: `dpr={[1, 1.5]}`, `frameloop` → `"never"` when offscreen (IntersectionObserver), menu open, or tab hidden; fewer solver iterations on mobile.
- Touch: canvas `touch-action: pan-y`; card drag only on pointerdown hitting the card; vertical swipes scroll page.
- `prefers-reduced-motion` → never load 3D, show `/card-static.png`.
- Texture fit: `card-front.png` with `colorSpace = SRGB`, repeat/offset tuned so 1000×1400 maps 1:1 to 5:7 face; strap `RepeatWrapping` so text stays readable.

### Step 2.5 — Atmosphere *(added by Jeric after Step 2)*
- `components/Atmosphere.tsx` + `components/sky/engine.ts` + `components/sky/sky.worker.ts`: fixed full-page night sky
  behind all sections, drawn in **one canvas inside a Web Worker** (OffscreenCanvas), so the main thread (3D lanyard)
  does no per-frame sky work. Three star layers drift upward (far/mid/near cross the sky in 40/25/15 s; 192 stars
  desktop, 67 phone) and wrap bottom-to-top: far 1.5 px at 50%, mid 2–2.5 px at 80%, near 3–4 px fully white with a
  soft glow (pre-rendered sprite), ~20% of near stars light violet; a few twinkle. Meteor shower: one every 0.6–1.5 s (phones 1–2.2 s) with
  occasional bursts, up to 4 (phones 3) in flight, each crossing in 1.2–2 s: glowing 3–4 px head, tail 2–3 px tapering
  to a point, 180–300 px long (phones 140–220), white → violet → clear, random angle. Soft violet/blue glow is a bitmap drawn once, used as the background image.
  Paused when the tab is hidden or the mobile menu is open; reduced motion → still stars, no meteors.
  No OffscreenCanvas (Safari < 16.4) → still stars baked into the background image.
  - Measured, why it's built this way (lanyard fps): CSS/Web Animations version of this shower: 59 → 47 (GPU, CPU 4×
    throttled); worker canvas: 59 → 59. Main-thread canvas or live CSS gradients halved it in compositor-less WebKit.
- Header: floating centered glass pill (sticky h-16 wrapper kept for layout offsets), active section highlighted via
  `components/useActiveSection.ts` (IntersectionObserver middle band); pill-style mobile menu with tap-to-close backdrop.
- Hero: first heading line violet→white gradient; label `<TypedRole/> · MANILA` cycles Full Stack Developer / UI Designer / BSIS Student.
- `components/StatCard.tsx`: count-up number + rotating glow border (`@property --glow-angle`); `StatsRow` shown in About (Projects 5, Certificates 1, Teams Led 2).
- `npm run test:devices` also checks the sky state, nav highlight, stats, and the mobile menu.

### Step 2.6 — Hero text redesign *(Jeric's call)*
- h1 "Welcome to" (violet → light-violet gradient + soft glow) / "My Portfolio" (white), 40 → 72px.
- `<TypedRole/>` subtitle in violet-soft: Full Stack Developer / UI Designer / BSIS Student · TUP Manila.
- Intro paragraph (max ~560px), buttons View Projects → (primary, glowing) and Contact me (outlined, → `#contact`),
  "FIND ME" row of rounded-square GitHub / LinkedIn / Email links. Download CV moved to About.
- The name is no longer in the h1: it stays in the page title, description, Open Graph and author metadata,
  and the static card image is alt "Jeric Contadan".

### Step 3 — About
- `components/About.tsx`: profile photo, bio (from CLAUDE.md), stack grid grouped (Front end, Back end & data, Cloud,
  AI development, Design, Workflow) with logos (`simple-icons` SVGs or inline), 2-col mobile → 3/4-col desktop.

### Step 4 — Projects
- `data/projects.ts` (typed), `components/ProjectCard.tsx`: screenshot, title, one-line pitch, tech tags, links,
  role note ("Team project · 5 members · Full Stack Developer", "Project Leader", etc.). 1-col → 2-col grid.

### Step 5 — Experience
- `components/Experience.tsx`: Education & Leadership vertical timeline; Certificates grid with G-tech Summit 2025 thumbnail
  → accessible lightbox (`<dialog>`, Esc/close button, full-size image).

### Step 6 — Contact
- `components/Contact.tsx`: email (copy + mailto), GitHub, LinkedIn as large cards; form UI (name/email/message) with
  validation, submitting via `mailto` for now, structured so Step 8 swaps in Supabase.

### Step 7 — SEO, polish, deploy
- `app/opengraph-image.tsx` (or static OG png), `app/sitemap.ts`, `app/robots.ts`, metadata per Next 16 docs, favicon.
- Lighthouse mobile pass (target 90+ A11y/BP/SEO), fix CLS/LCP. Final checks on the live Vercel URL.
- **Gate:** `npm run check:placeholders` passes (no placeholders left in `/public`).

### Step 8 — Supabase contact form (later phase)
- `messages` table, RLS on, insert-only policy for `anon`; anon key in `.env.local` + Vercel env; server action or
  client insert with honeypot + length limits. Never a service-role key in client code.

## Verification (each step)
- `npm run lint` and `npm run build` pass.
- `npm run dev` → screenshots at 360 / 768 / 1280 (Chrome tools), check no horizontal scroll
  (`document.documentElement.scrollWidth <= innerWidth`), tap targets ≥44px, body ≥16px.
- Step 2 extras: vertical swipe over canvas scrolls page (mobile emulation), menu open pauses frameloop,
  reduced-motion emulation shows static image, Performance trace on throttled CPU.
- Step 7: Lighthouse report evidence.
