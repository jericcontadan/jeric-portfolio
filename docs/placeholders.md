# Placeholders

Every file below is a generated, obviously fake stand-in (big yellow **PLACEHOLDER** stamp;
`cv.pdf` just says "CV coming soon"). Replace each with the real file **at the same path and
name**: no code changes needed.

- Regenerate missing ones: `npm run placeholders` (never overwrites a real file; `-- --force` overwrites everything)
- Check what's left: `npm run check:placeholders` (exits 1 while any remain; it compares
  file hashes recorded in `scripts/placeholder-hashes.json`)
- **Step 7 gate:** `npm run check:placeholders` must pass before the site is called finished.

| File | Size / format | What the real one should be | Replaced? |
|---|---|---|---|
| `public/card-front.png` | 1000×1400 PNG (5:7) | Card face: photo, JERIC CONTADAN, Full Stack Developer, BS Information Systems · Section BSIS-3C, TUP Manila, optional GitHub QR | ☐ |
| `public/card-back.png` | 1000×1400 PNG (5:7) | Card back (design of your choice, no TUP seal/logo) | ☐ |
| `public/lanyard.png` | 2048×256 PNG | Strap strip: "JERIC CONTADAN • BSIS-3C • TUP MANILA •" white on violet `#6D4AFF` | ☐ |
| `public/card-static.png` | 1000×1700 PNG, transparent | Still render of the card + strap (reduced-motion fallback) | ☐ |
| `public/profile.jpg` | 800×1000 JPG (4:5) | Photo for About | ☐ |
| `public/cv.pdf` | PDF | Your CV | ☐ |
| `public/projects/jean-rose-pos.png` | 1600×1000 PNG (16:10) | Jean Rose POS & Inventory screenshot | ☐ |
| `public/projects/lechon-de-jay.png` | 1600×1000 PNG | Lechon De Jay website screenshot | ☐ |
| `public/projects/gunita-kopi-pos.png` | 1600×1000 PNG | Gunita Kopi POS screenshot | ☐ |
| `public/projects/pinoycart-security.png` | 1600×1000 PNG | PinoyCart assessment visual (e.g. risk matrix) | ☐ |
| `public/projects/portfolio.png` | 1600×1000 PNG | Screenshot of this site | ☐ |

`public/certificates/gdg-gtech-summit-2025.jpg` is real (provided) and is not a placeholder.
