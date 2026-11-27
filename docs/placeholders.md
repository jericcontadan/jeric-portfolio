# Placeholders

Every file below is a generated, obviously fake stand-in (big yellow **PLACEHOLDER** stamp;
`cv.pdf` just says "CV coming soon"). Replace each with the real file **at the same path and
name**: no code changes needed.

- Regenerate missing ones: `npm run placeholders` (`-- --force` regenerates placeholders but never touches a real file)
- Check what's left: `npm run check:placeholders` (exits 1 while any remain; it compares
  file hashes recorded in `scripts/placeholder-hashes.json`)
- **Step 7 gate:** `npm run check:placeholders` must pass before the site is called finished.

| File | Size / format | What the real one should be | Replaced? |
|---|---|---|---|
| `public/cv.pdf` | PDF | Your CV | ☐ |

## Replaced with real files

- `card-front.png`, `card-back.png` (1000×1400, 5:7), `lanyard.png` (2874×160),
  `card-static.png` (1000×1400, same image as the card front, used for reduced motion),
  `profile.jpg` (800×800, square).
- `projects/jean-rose.png`, `projects/lechon-de-jay.png` (1280×800, 16:10). The other project placeholders
  were deleted when Projects was cut to these two (Step 4).
- `public/certificates/gdg-gtech-summit-2025.jpg` was real from the start.
