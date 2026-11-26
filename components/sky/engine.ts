/**
 * Night-sky renderer: three drifting star layers (parallax, wrapping top → bottom) with a
 * few twinkling stars, plus a meteor shower. It draws into one 2D canvas, normally an
 * OffscreenCanvas inside a Web Worker (sky.worker.ts), so none of this runs on the main
 * thread the 3D lanyard uses. Everything moves by real elapsed time, never per frame.
 */

export type SkyState = "running" | "paused" | "static";
export type SkySize = { w: number; h: number; dpr: number };
export type SkyStats = { frames: number; launched: number; peak: number };

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  color: string; // "r g b" without alpha
  twinkle: boolean;
  glow: boolean; // near stars: drawn from a pre-rendered glow sprite
  phase: number;
  speed: number; // twinkle, radians per second
};
type Layer = { rise: number; stars: Star[] }; // rise: seconds to cross the sky once
type Meteor = {
  x: number;
  y: number;
  ux: number; // unit direction of travel
  uy: number;
  dist: number;
  len: number;
  width: number; // tail width at the head; it tapers to a point
  head: number; // head diameter
  born: number;
  dur: number;
};

// White and pale blue; a few near stars are light violet (G 181: never taken for card pixels).
const TINTS = ["255 255 255", "226 232 255", "205 218 255"];
const NEAR_VIOLET = "196 181 255";
const NEAR_VIOLET_SHARE = 0.2;
// far = small, dim, slow; near = big, white, glowing, fast. Pairs are [phone, wider].
// rise = seconds to cross the sky once; r = radius (px); a = opacity.
const LAYERS = [
  { rise: 40, count: [36, 105], r: [0.75, 0.75], a: [0.5, 0.5], twinkle: [0, 0], glow: false },
  { rise: 25, count: [21, 60], r: [1, 1.25], a: [0.8, 0.8], twinkle: [2, 4], glow: false },
  { rise: 15, count: [10, 27], r: [1.5, 2], a: [1, 1], twinkle: [4, 6], glow: true },
] as const;
const GLOW_REACH = 3.5; // a near star's soft glow extends to 3.5× its radius

/** A soft round glow with a solid core, drawn once and stamped for every near star. */
function makeGlowSprite(color: string) {
  const px = 64; // sprite resolution; drawn far smaller, so it stays crisp at any DPR
  const c =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(px, px)
      : Object.assign(document.createElement("canvas"), { width: px, height: px });
  const g = c.getContext("2d") as Canvas2D | null;
  if (!g) return null;
  const mid = px / 2;
  const core = mid / GLOW_REACH;
  const grad = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
  grad.addColorStop(0, `rgb(${color} / 1)`);
  grad.addColorStop(core / mid, `rgb(${color} / 1)`); // solid core = the star itself
  grad.addColorStop((core / mid) * 1.6, `rgb(${color} / 0.35)`);
  grad.addColorStop(1, `rgb(${color} / 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  return c;
}
// Meteors: a new one every gap (sometimes a quick burst), each crossing in 1.2–2 s.
// max only guards against pile-ups; at these rates it is rarely reached.
const METEORS = {
  wide: { max: 4, gap: [600, 1500], burst: 0.3, tail: [180, 300] },
  phone: { max: 3, gap: [1000, 2200], burst: 0.15, tail: [140, 220] },
} as const;
const VIOLET = "166 140 255"; // violet-soft: G 140, so tests never take it for card pixels

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function createSky(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  opts: { maxFps: number; onStats?: (s: SkyStats) => void },
) {
  const ctx = canvas.getContext("2d") as Canvas2D | null;
  let size: SkySize = { w: 0, h: 0, dpr: 1 };
  let layers: Layer[] = [];
  let meteors: Meteor[] = [];
  let state: SkyState = "paused";
  let nextMeteor = 0;
  let last = 0;
  let handle = 0;
  const stats: SkyStats = { frames: 0, launched: 0, peak: 0 };
  let statsAt = 0;
  const minFrame = 1000 / opts.maxFps;

  // requestAnimationFrame exists in workers in Chrome, Firefox and Safari 16.4+.
  const g = globalThis as unknown as {
    requestAnimationFrame?: (cb: (t: number) => void) => number;
    cancelAnimationFrame?: (id: number) => void;
  };
  const schedule = (cb: (t: number) => void) =>
    g.requestAnimationFrame
      ? g.requestAnimationFrame(cb)
      : (setTimeout(() => cb(performance.now()), 16) as unknown as number);
  const unschedule = (id: number) =>
    g.cancelAnimationFrame ? g.cancelAnimationFrame(id) : clearTimeout(id);

  const phone = () => size.w < 768;
  const sprites = new Map<string, ReturnType<typeof makeGlowSprite>>();
  const spriteFor = (color: string) => {
    if (!sprites.has(color)) sprites.set(color, makeGlowSprite(color));
    return sprites.get(color);
  };

  const seed = () => {
    const k = phone() ? 0 : 1;
    layers = LAYERS.map((l) => ({
      rise: l.rise,
      stars: Array.from({ length: l.count[k] }, (_, i) => ({
        x: Math.random() * size.w,
        y: Math.random() * size.h,
        r: rand(l.r[0], l.r[1]),
        a: rand(l.a[0], l.a[1]),
        color: l.glow
          ? Math.random() < NEAR_VIOLET_SHARE
            ? NEAR_VIOLET
            : "255 255 255"
          : TINTS[(Math.random() * TINTS.length) | 0],
        twinkle: i < l.twinkle[k],
        glow: l.glow,
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.5, 1.4),
      })),
    }));
  };

  const launch = (now: number) => {
    const cfg = phone() ? METEORS.phone : METEORS.wide;
    // Sometimes a burst: the next one follows almost at once, so 2–3 fly together.
    nextMeteor =
      now + (Math.random() < cfg.burst ? rand(120, 350) : rand(cfg.gap[0], cfg.gap[1]));
    if (meteors.length >= cfg.max) return;
    const { w, h } = size;
    // Start on the top edge (60%) or the right edge, heading down and to the left.
    const fromTop = Math.random() < 0.6;
    const angle = (rand(145, 165) * Math.PI) / 180; // screen coordinates (y down)
    meteors.push({
      x: fromTop ? rand(w * 0.25, w * 1.1) : w + 20,
      y: fromTop ? -20 : rand(-0.1 * h, h * 0.6),
      ux: Math.cos(angle),
      uy: Math.sin(angle),
      dist: rand(0.9, 1.4) * Math.hypot(w, h),
      len: rand(cfg.tail[0], cfg.tail[1]),
      width: rand(2, 3),
      head: rand(3, 4),
      born: now,
      dur: rand(1200, 2000),
    });
    stats.launched++;
    stats.peak = Math.max(stats.peak, meteors.length);
  };

  const drawStars = (dt: number, t: number, still: boolean) => {
    if (!ctx) return;
    const { w, h } = size;
    for (const layer of layers) {
      const rise = still ? 0 : (h / layer.rise) * dt;
      for (const s of layer.stars) {
        s.y -= rise;
        if (s.y < -8) {
          // Left the top (glow included): come back in at the bottom, somewhere new.
          s.y += h + 16;
          s.x = Math.random() * w;
        }
        const tw = s.twinkle && !still ? 0.55 + 0.45 * Math.sin(s.phase + t * s.speed) : 1;
        const sprite = s.glow ? spriteFor(s.color) : null;
        if (sprite) {
          const reach = s.r * GLOW_REACH;
          ctx.globalAlpha = s.a * tw;
          ctx.drawImage(sprite, s.x - reach, s.y - reach, reach * 2, reach * 2);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = `rgb(${s.color} / ${s.a * tw})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  const drawMeteors = (now: number) => {
    if (!ctx) return;
    meteors = meteors.filter((m) => now - m.born < m.dur);
    for (const m of meteors) {
      const p = (now - m.born) / m.dur;
      // Fade in over the first 10%, out over the last 30%.
      const fade = Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.3);
      const hx = m.x + m.ux * m.dist * p;
      const hy = m.y + m.uy * m.dist * p;
      const tx = hx - m.ux * m.len;
      const ty = hy - m.uy * m.len;
      // Tail: a thin wedge, full width at the head tapering to a point, white → violet → clear.
      const half = m.width / 2;
      const px = -m.uy * half; // perpendicular offset
      const py = m.ux * half;
      const grad = ctx.createLinearGradient(hx, hy, tx, ty);
      grad.addColorStop(0, `rgb(255 255 255 / ${fade})`);
      grad.addColorStop(0.15, `rgb(255 255 255 / ${0.85 * fade})`);
      grad.addColorStop(0.45, `rgb(${VIOLET} / ${0.6 * fade})`);
      grad.addColorStop(1, `rgb(${VIOLET} / 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(hx + px, hy + py);
      ctx.lineTo(tx, ty);
      ctx.lineTo(hx - px, hy - py);
      ctx.closePath();
      ctx.fill();
      // Head: a soft glow, then a bright core 3–4 px across.
      const r = m.head / 2;
      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 4);
      glow.addColorStop(0, `rgb(255 255 255 / ${0.6 * fade})`);
      glow.addColorStop(0.35, `rgb(${VIOLET} / ${0.35 * fade})`);
      glow.addColorStop(1, `rgb(${VIOLET} / 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(hx, hy, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(255 255 255 / ${fade})`;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const clear = () => {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  };

  const frame = (now: number) => {
    handle = schedule(frame);
    if (now - last < minFrame - 1) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; // clamp after stalls
    last = now;
    if (now >= nextMeteor) launch(now);
    clear();
    drawStars(dt, now / 1000, false);
    drawMeteors(now);
    stats.frames++;
    if (opts.onStats && now - statsAt > 1000) {
      statsAt = now;
      opts.onStats({ ...stats });
      stats.peak = meteors.length;
    }
  };

  const stop = () => {
    if (handle) unschedule(handle);
    handle = 0;
  };

  const apply = () => {
    stop();
    if (!size.w) return;
    if (state === "running") {
      last = 0;
      meteors = [];
      nextMeteor = performance.now() + rand(300, 900);
      handle = schedule(frame);
    } else if (state === "static") {
      meteors = [];
      clear();
      drawStars(0, 0, true);
    }
    // paused: keep the last frame on screen.
  };

  /** After a resize (which wipes the canvas): redraw without restarting the shower. */
  const redraw = () => {
    if (!size.w) return;
    if (state === "running") {
      if (!handle) {
        last = 0;
        handle = schedule(frame); // the next frame repaints; meteors in flight carry on
      }
    } else {
      // static, or paused (its last frame is gone): one still frame of the stars.
      clear();
      drawStars(0, state === "static" ? 0 : performance.now() / 1000, true);
    }
  };

  return {
    resize(next: SkySize) {
      const widthChanged = next.w !== size.w;
      const prevH = size.h;
      size = next;
      canvas.width = Math.round(next.w * next.dpr);
      canvas.height = Math.round(next.h * next.dpr);
      // Reseed only when the width changes (Safari toolbars change only the height).
      if (widthChanged || !layers.length) seed();
      else if (prevH)
        for (const l of layers) for (const s of l.stars) s.y = (s.y / prevH) * next.h;
      redraw();
    },
    setState(next: SkyState) {
      state = next;
      apply();
    },
  };
}
