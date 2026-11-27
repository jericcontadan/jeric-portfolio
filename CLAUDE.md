@AGENTS.md
# Jeric Contadan: 3D Lanyard Portfolio

Claude Code reads this file at the start of every session. It is the project brief:
follow it for every change.

## Goal
A personal portfolio for **Jeric Contadan, Full Stack Developer & UI Designer**.
- It looks clean and premium, with a 3D swinging ID card (a lanyard) in the hero.
- It runs smoothly on mid-range Android phones.
- It is deployed on Vercel, with automatic deploys from GitHub.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- 3D hero: React Bits "Lanyard" component (React Three Fiber, drei, @react-three/rapier, meshline)
- Animation: CSS transitions and scroll-driven animations, plus the night sky drawn in a Web Worker
  (`components/sky/`). No animation library is needed. See "Motion (space theme)" below.
- Contact form (later phase): Supabase table, row-level security ON, visitors can insert only
- Hosting: Vercel

## Design rules
- Dark navy background with a soft gradient, **one** accent color (violet), and white/neutral text.
- At most 2 fonts, loaded with `next/font`. Content max width about 1200px. Generous spacing.
- Clean and professional layout. Motion follows the approved space theme (see below).
- **Original design.** Do not copy text, images or exact layouts from any other portfolio.
  Only the *idea* of a lanyard ID card in the hero is shared with other sites.
- Use the frontend-design skill for aesthetic decisions.

## Motion (space theme, approved)
Bold, space-themed motion tied to scrolling is intended. It is not a "subtle reveals only" site.
- **Warp:** fast scrolling stretches the stars into hyperspace streaks; they snap back to dots
  when scrolling stops.
- **Meteor bursts:** each newly active section launches a burst of meteors (5–8, phones 3–4).
- **Deep-space fly-ins:** section content starts small, tilted back and see-through (blurred on
  desktop pointer devices only), then zooms into place. It replays every time a section enters.
- **Background words:** giant outlined section names (ABOUT, PROJECTS, …) at low opacity behind
  each section, drifting sideways with scroll.
- **Cards dealt in 3D:** project cards fly in from 3D space, spinning, and land one after another.
- **Light sweep:** a violet beam crosses each section heading as it appears.
- **Lanyard swing:** fast scrolls kick the hero card into a swing (capped, with a cooldown).

Rules for all motion:
- Text must always stay readable. Content is never hidden without JavaScript.
- Every effect finishes in under ~1 s.
- Lighter versions on phones.
- `prefers-reduced-motion`: none of it (no warp, bursts, fly-ins or swing); content just appears.
- The lanyard frame rate must not drop: no per-frame main-thread work for effects; the sky stays
  in its worker; prefer transforms and opacity. Check with a before/after fps comparison.

## All devices (required)
- The site must work well on **every** device class: Android phones (Chrome), iPhones (Safari),
  iPads and Android tablets in portrait **and** landscape, and desktop.
- Test every change at 360×780 (Android), 390×844 (iPhone), 768×1024 and 1024×768 (tablet portrait
  and landscape), and 1280+ (desktop), in both WebKit (Safari) and Chromium. `npm run test:devices`
  runs this with Playwright and saves screenshots.
- Use `svh`/`dvh` for screen-height layouts, never bare `100vh`, so Safari's toolbars never cover content.
- Touch (tap, double-tap, drag, vertical page scroll) must behave the same on iOS and Android.
- Animations and timers use real elapsed time, never "per frame", because phones often render below 60 fps.

## Responsive rules (mobile first)
- Build for a 360px-wide screen first, then 768px, then 1280px+. Test all three.
- Hero on desktop: text on the left, lanyard on the right.
- Hero on mobile:
  - The heading ("Welcome to / My Portfolio") and intro come first; a smaller lanyard sits below them.
  - Normal vertical page scrolling must still work. The 3D canvas must not trap swipes.
- The mobile menu must render **above** the 3D canvas, and the 3D pauses while the menu is open.
- Tap targets are at least 44px. Body text is at least 16px.
- `prefers-reduced-motion`: show `/card-static.png` instead of the physics scene.
- Load the 3D lazily (dynamic import, client only) **after** the hero text renders.
- No horizontal scrolling at any width.

## Lanyard card content
- **Strap (`lanyard.png`)**: repeating text "JERIC CONTADAN • BSIS-3C • TUP MANILA •"
  in white on the accent color. It must stay readable while the strap twists.
- **Card front (`card-front.png`)**:
  - Photo at the top
  - **JERIC CONTADAN**
  - Full Stack Developer
  - BS Information Systems · Section **BSIS-3C**
  - **Technological University of the Philippines – Manila**
  - Optional: a small QR code to https://github.com/jericcontadan
- The school name is written as text. Don't use the official TUP seal or logo unless permission is given.

## Navigation and sections
Nav order: Home · About · Projects · Experience · Contact

1. **Hero**
   - Heading, two lines: "Welcome to" (violet → light-violet gradient, soft glow) / "My Portfolio" (white), ~72px desktop
   - Typing subtitle (light violet, blinking cursor): "Full Stack Developer", "UI Designer", "BSIS Student · TUP Manila"
   - Paragraph (muted, max ~560px): "I'm Jeric, an Information Systems student who loves turning real business problems into working web apps. …"
   - Buttons: **View Projects →** (primary, glowing) and **Contact me** (outlined, secondary)
   - "FIND ME" row: rounded-square icon links for GitHub, LinkedIn and Email
   - The full name stays in the page title/metadata and is the card's alt text (it's not in the h1)
   - Right side: the lanyard card
2. **About**: photo, bio, **Download CV** (`/cv.pdf`), then a stack grid with tech logos, grouped (see Skills)
3. **Projects**: one card per project with a screenshot, title, one-line pitch, tech tags, links and the role
4. **Experience**: Education & Leadership timeline, plus certificates if any
5. **Contact**: email, GitHub, LinkedIn, and a contact form (Supabase, later phase)
6. **Footer**: © 2026 Jeric Contadan, social icons, back to top

## Content

### About
I'm a BS Information Systems student at the Technological University of the Philippines – Manila
who turns real business problems into working web systems. I've led teams through the whole build:
interviewing clients, designing databases, prototyping in Figma, and shipping web apps to the cloud.
I build fast with modern AI tools, but I care about the fundamentals: clean data, usable interfaces,
and secure systems.

### Projects
**Jean Rose POS & Inventory Platform** (role: Lead Full Stack Developer)
A full stack point-of-sale and inventory system for a retail beauty-products business. It covers
sales processing, real-time stock tracking, automated low-stock email alerts through an email API,
and secure password recovery. It runs on a 12-table relational database, is hosted in the cloud,
and was delivered in Scrum sprints.
Tech: Laravel, PHP, Blade, Bootstrap 5, MySQL, Brevo Email API, Microsoft Azure, Figma, Jira (Scrum).
Image: `/projects/jean-rose.png`
Link: https://github.com/jericcontadan/Jean-Rose-POS-and-Inventory-Management-System_SAD

**Lechon De Jay: Digital Transformation** (Project Leader)
Led the project from client interviews to launch: requirements, project charter, business process
mapping, and a tablet-first company website (menu, contact details, cash and e-wallet payment info).
Tech: HTML, CSS, JavaScript, GitHub.
Image: `/projects/lechon-de-jay.png`
Link: https://github.com/jericcontadan/Lechon-De-Jay-Website

Only these two projects are shown. PinoyCart appears in Experience as a leadership line.

### Skills (stack grid groups)
- Front end: Next.js, React, TypeScript, Tailwind CSS, Three.js / React Three Fiber, GSAP
- Back end & data: Supabase (PostgreSQL), REST APIs, relational database design
- Cloud: Vercel, Microsoft Azure
- AI development: Claude Code, MCP integrations
- Design: Figma, UI/UX
- Workflow: Git & GitHub, Jira (Scrum), Playwright

### Education & Leadership
Education: BS Information Systems, Technological University of the Philippines – Manila,
Section BSIS-3C, expected 2028.

Leadership & Roles, in this order:
- Lead Full Stack Developer, Jean Rose POS & Inventory Platform: built the entire system: front end,
  back end, database, email API integration and cloud deployment.
- Project Leader, Lechon De Jay system and website: led the project from client interviews to launch.
- Team Lead & Documentation Lead, PinoyCart Security Risk Assessment: led a security audit of an
  e-commerce platform.

### Certificates
- **Certificate of Participation: G-tech Summit 2025**
  - Google Developer Groups on Campus – TUP Manila
  - February 28, 2025, IRTC Conference Hall, TUP Manila
  - Image: `/certificates/gdg-gtech-summit-2025.jpg`
  - Show it as a thumbnail card that opens full size on click, and closes with Esc, a tap
    outside, or a close button.

### Contact
- Email: jericcontadan6@gmail.com
- GitHub: https://github.com/jericcontadan
- LinkedIn: https://www.linkedin.com/in/jeric-contadan-aa6484452/

## Assets (all in /public)
| File | What it is |
|---|---|
| `card-front.png` | Card face texture (portrait, about 1000×1400 px): photo, name, BSIS-3C, TUP Manila |
| `lanyard.png` | Strap texture (long horizontal strip): "JERIC CONTADAN • BSIS-3C • TUP MANILA •" repeating |
| `card-static.png` | Still image of the card, for reduced motion |
| `profile.jpg` | Original square photo (not shown on the page) |
| `profile-cutout.png` | About photo: transparent-background cutout, 1024×1024 |
| `profile-reveal.png` | About hover/drag reveal layer, pixel-aligned with the cutout, 1024×1024 |
| `cv.pdf` | Downloadable CV |
| `projects/jean-rose.png`, `projects/lechon-de-jay.png` | Project screenshots, 1280×800 (16:10) |
| `certificates/gdg-gtech-summit-2025.jpg` | G-tech Summit 2025 certificate (provided) |
| `favicon.ico` | Site icon |

If the card texture looks stretched or cropped, adjust the texture scale/offset in code.
Don't distort the photo.

## Quality bar and workflow
- Build one section per session. Run `/code-review` before committing, then `/commit`.
- Before saying anything is done, run it, check the 360 / 768 / 1280 widths, and show the evidence.
- Aim for Lighthouse 90+ on Accessibility, Best Practices and SEO, and get mobile Performance as high as possible.
- Add SEO: title, description, Open Graph image (for LinkedIn/Messenger previews), sitemap.
- Never commit secrets. Keep Supabase keys in `.env.local` and in Vercel environment variables.
  Never put a service-role key in client code.
