// Generates obviously-fake placeholder assets in /public and records their
// hashes in scripts/placeholder-hashes.json so `npm run check:placeholders`
// can prove (in Step 7) that every placeholder has been replaced.
//
// Usage: npm run placeholders            (only creates files that are missing)
//        npm run placeholders -- --force (overwrites existing files)
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const force = process.argv.includes("--force");

const NAVY = "#0A1024";
const PANEL = "#111A35";
const VIOLET = "#6D4AFF";
const WHITE = "#EEF0F7";
const MUTED = "#A3ABC4";
const FONT = "Arial, Helvetica, sans-serif";

/** Big diagonal PLACEHOLDER stamp, centred on a w×h canvas. */
const stamp = (w, h, size) => `
  <g transform="translate(${w / 2} ${h / 2}) rotate(-28)">
    <rect x="${-size * 4.4}" y="${-size * 0.75}" width="${size * 8.8}" height="${size * 1.5}"
      fill="#FFD400" opacity="0.92"/>
    <text x="0" y="${size * 0.36}" text-anchor="middle" font-family="${FONT}"
      font-weight="900" font-size="${size}" fill="#111">PLACEHOLDER</text>
  </g>`;

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const cardFront = (w = 1000, h = 1400) =>
  svg(
    w,
    h,
    `
  <rect width="${w}" height="${h}" rx="48" fill="${NAVY}"/>
  <rect width="${w}" height="120" rx="48" fill="${VIOLET}"/>
  <rect y="72" width="${w}" height="48" fill="${VIOLET}"/>
  <rect x="${w / 2 - 70}" y="40" width="140" height="28" rx="14" fill="${NAVY}"/>
  <rect x="250" y="200" width="500" height="560" rx="24" fill="${PANEL}" stroke="${MUTED}" stroke-width="4" stroke-dasharray="18 14"/>
  <text x="500" y="495" text-anchor="middle" font-family="${FONT}" font-size="44" fill="${MUTED}">PHOTO</text>
  <text x="500" y="880" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="72" fill="${WHITE}">JERIC CONTADAN</text>
  <text x="500" y="960" text-anchor="middle" font-family="${FONT}" font-size="44" fill="#A68CFF">Full Stack Developer</text>
  <text x="500" y="1060" text-anchor="middle" font-family="${FONT}" font-size="34" fill="${MUTED}">BS Information Systems · Section BSIS-3C</text>
  <text x="500" y="1130" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="32" fill="${WHITE}">Technological University of the</text>
  <text x="500" y="1175" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="32" fill="${WHITE}">Philippines – Manila</text>
  ${stamp(w, h, 120)}`,
  );

const cardBack = (w = 1000, h = 1400) =>
  svg(
    w,
    h,
    `
  <rect width="${w}" height="${h}" rx="48" fill="${NAVY}"/>
  <rect x="${w / 2 - 70}" y="40" width="140" height="28" rx="14" fill="${PANEL}"/>
  <circle cx="500" cy="640" r="170" fill="none" stroke="${VIOLET}" stroke-width="10"/>
  <text x="500" y="690" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="150" fill="${WHITE}">JC</text>
  <text x="500" y="1000" text-anchor="middle" font-family="${FONT}" font-size="40" fill="${MUTED}">Card back</text>
  ${stamp(w, h, 120)}`,
  );

const lanyard = (w = 2048, h = 256) => {
  const phrase = "PLACEHOLDER • JERIC CONTADAN • BSIS-3C • TUP MANILA •";
  return svg(
    w,
    h,
    `
  <rect width="${w}" height="${h}" fill="${VIOLET}"/>
  <rect y="0" width="${w}" height="18" fill="#FFD400"/>
  <rect y="${h - 18}" width="${w}" height="18" fill="#FFD400"/>
  <text x="${w / 2}" y="${h / 2 + 30}" text-anchor="middle" font-family="${FONT}" font-weight="800"
    font-size="84" textLength="${w - 40}" lengthAdjust="spacingAndGlyphs" fill="#FFFFFF">${phrase}</text>`,
  );
};

const cardStatic = (w = 1000, h = 1700) => {
  const front = Buffer.from(cardFront()).toString("base64");
  return svg(
    w,
    h,
    `
  <rect x="${w / 2 - 60}" y="0" width="120" height="360" fill="${VIOLET}"/>
  <rect x="${w / 2 - 50}" y="320" width="100" height="70" rx="12" fill="#C9CCD6"/>
  <image href="data:image/svg+xml;base64,${front}" x="${(w - 800) / 2}" y="370" width="800" height="1120"/>
  ${stamp(w, h, 110)}`,
  );
};

const photo = (label, w, h) =>
  svg(
    w,
    h,
    `
  <rect width="${w}" height="${h}" fill="${PANEL}"/>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="none" stroke="${MUTED}" stroke-width="4" stroke-dasharray="18 14"/>
  <text x="${w / 2}" y="${h * 0.22}" text-anchor="middle" font-family="${FONT}" font-size="${Math.round(w / 24)}" fill="${MUTED}">${label}</text>
  ${stamp(w, h, Math.round(w / 10))}`,
  );

/** Minimal valid one-page PDF that says "CV coming soon". */
function cvPdf() {
  const text = "BT /F1 36 Tf 160 440 Td (CV coming soon) Tj ET";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const png = (s) => sharp(Buffer.from(s)).png().toBuffer();
const jpg = (s) => sharp(Buffer.from(s)).jpeg({ quality: 82 }).toBuffer();

const projects = [
  ["jean-rose-pos", "Jean Rose POS &amp; Inventory"],
  ["lechon-de-jay", "Lechon De Jay website"],
  ["gunita-kopi-pos", "Gunita Kopi POS"],
  ["pinoycart-security", "PinoyCart security assessment"],
  ["portfolio", "This portfolio"],
];

const assets = {
  "card-front.png": () => png(cardFront()),
  "card-back.png": () => png(cardBack()),
  "lanyard.png": () => png(lanyard()),
  "card-static.png": () => png(cardStatic()),
  "profile.jpg": () => jpg(photo("Profile photo", 800, 1000)),
  "cv.pdf": async () => cvPdf(),
  ...Object.fromEntries(
    projects.map(([slug, label]) => [
      `projects/${slug}.png`,
      () => png(photo(`Screenshot: ${label}`, 1600, 1000)),
    ]),
  ),
};

const hashFile = join(root, "scripts", "placeholder-hashes.json");
const hashes = existsSync(hashFile) ? JSON.parse(readFileSync(hashFile, "utf8")) : {};

for (const [rel, make] of Object.entries(assets)) {
  const dest = join(pub, rel);
  if (existsSync(dest) && !force && !hashes[rel]) {
    console.log(`skip  ${rel} (real file present)`);
    continue;
  }
  if (existsSync(dest) && !force) {
    console.log(`keep  ${rel}`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  const buf = await make();
  writeFileSync(dest, buf);
  hashes[rel] = createHash("sha256").update(buf).digest("hex");
  console.log(`write ${rel}`);
}

writeFileSync(hashFile, JSON.stringify(hashes, null, 2) + "\n");
