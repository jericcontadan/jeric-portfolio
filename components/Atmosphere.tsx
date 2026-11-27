"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeScrollVelocity } from "@/lib/scrollVelocity";
import { nav } from "@/lib/site";
import { useMenu } from "./MenuContext";
import { createSky, type SkySize, type SkyState, type SkyStats } from "./sky/engine";
import { useActiveSection } from "./useActiveSection";

type Sky = {
  resize(size: SkySize): void;
  setState(state: SkyState): void;
  warp(pxPerSec: number): void;
  burst(n: number): void;
  destroy(): void;
};

const sectionIds = nav.map((item) => item.href.slice(1));
const WARP_STEP = 50; // px/s: smaller changes in scroll speed aren't sent to the worker

const DPR_CAP = 1.5; // star dots and thin meteors don't need more, and it saves fill rate

/**
 * Starts the renderer in a Web Worker on a transferred OffscreenCanvas, so it costs the main
 * thread nothing per frame. Returns null where OffscreenCanvas is missing (Safari before
 * 16.4): those browsers get still stars baked into the background image instead. Measured
 * there: a main-thread animation loop, or even a still full-screen canvas, halved the
 * lanyard's fps, because WebKit repainted it under the moving 3D canvas every frame.
 */
function startWorkerSky(
  canvas: HTMLCanvasElement,
  size: SkySize,
  state: SkyState,
  onStats: (s: SkyStats) => void,
  onError: () => void,
): Sky | null {
  if (typeof canvas.transferControlToOffscreen !== "function" || typeof Worker !== "function")
    return null;
  let worker: Worker | undefined;
  try {
    worker = new Worker(new URL("./sky/sky.worker.ts", import.meta.url), { type: "module" });
    const offscreen = canvas.transferControlToOffscreen();
    // The script failed to load or crashed (no module workers, CSP, network): fall back.
    worker.onerror = (e) => {
      e.preventDefault();
      onError();
    };
    worker.onmessage = (e: MessageEvent<{ type: string; stats: SkyStats }>) => {
      if (e.data.type === "stats") onStats(e.data.stats);
    };
    worker.postMessage({ type: "init", canvas: offscreen, size, state }, [offscreen]);
    const w = worker;
    return {
      resize: (next) => w.postMessage({ type: "resize", size: next }),
      setState: (next) => w.postMessage({ type: "state", state: next }),
      warp: (v) => w.postMessage({ type: "warp", v }),
      burst: (n) => w.postMessage({ type: "burst", n }),
      destroy: () => w.terminate(),
    };
  } catch {
    worker?.terminate();
    return null; // the worker failed before the canvas was transferred
  }
}

/** Still stars drawn once into a detached canvas (for the background image fallback). */
function drawStillStars(size: SkySize) {
  const canvas = document.createElement("canvas");
  const sky = createSky(canvas, { maxFps: 1 });
  sky.setState("static");
  sky.resize(size); // seeds and draws the still frame
  return canvas;
}

// Soft glow blobs: centre (fraction of the sky), radii (rem) and colour. Fades to 0 at 70%.
const GLOWS: [number, number, number, number, string][] = [
  [0.85, -0.1, 60, 40, "109 74 255 / 0.18"], // violet, top right (behind the lanyard)
  [0.1, 0.15, 45, 35, "166 140 255 / 0.07"], // light violet, top left
  [-0.1, 0.55, 50, 40, "35 48 90 / 0.5"], // navy, left
  [0.9, 1.1, 55, 35, "109 74 255 / 0.1"], // violet, bottom right
];
const GLOW_SCALE = 0.25; // drawn at 1/4 size: a soft glow loses nothing

/** Draws the glow once into a small offscreen canvas (CSS stretches it over the sky). */
function drawGlow(w: number, h: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  canvas.width = Math.max(1, Math.round(w * GLOW_SCALE));
  canvas.height = Math.max(1, Math.round(h * GLOW_SCALE));
  ctx.setTransform(GLOW_SCALE, 0, 0, GLOW_SCALE, 0, 0);
  for (const [fx, fy, rx, ry, color] of GLOWS) {
    ctx.save();
    ctx.translate(fx * w, fy * h);
    ctx.scale(rx * rem, ry * rem); // unit circle -> ellipse
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgb(${color})`);
    g.addColorStop(0.7, `rgb(${color.replace(/[\d.]+$/, "0")})`);
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  return canvas;
}

/**
 * Full-page night sky behind every section: three layers of stars drifting slowly upward
 * (parallax, wrapping from top to bottom) with a few twinkling, plus a meteor shower.
 * - Drawn into one canvas by components/sky/engine.ts, inside a Web Worker (OffscreenCanvas),
 *   so the main thread, which runs the 3D lanyard, does no per-frame work for the sky.
 *   Measured: the same sky built from CSS/Web Animations still cost the lanyard ~20% fps
 *   (GPU, CPU throttled 4x), and a main-thread canvas cost ~20% on software rendering.
 * - The soft violet glow is a bitmap drawn once, used as the sky's background image.
 *   Live CSS radial gradients cost the lanyard ~40% fps in WebKit (it repaints whatever lies
 *   under the moving 3D canvas); a plain background image costs nothing per frame.
 * - Warp: scroll speed stretches the stars into hyperspace streaks (snapping back to dots when
 *   scrolling stops); each newly active section launches a meteor burst (5–8, phones 3–4).
 * - Fewer stars and meteors on phones. Paused while the tab is hidden or the mobile menu is
 *   open. prefers-reduced-motion: still stars, no drift, twinkle or meteors.
 * - Without OffscreenCanvas (Safari before 16.4), or if the worker fails to load: still stars
 *   baked into the background.
 * - Test hooks: data-atmosphere (state), data-sky-mode (worker | still) and data-sky
 *   (frames, meteors launched, peak meteors in flight, peak warp 0–100; updated once a second).
 */
export function Atmosphere() {
  const { menuOpen } = useMenu();
  const skyRef = useRef<HTMLDivElement>(null);
  const skyEngine = useRef<Sky | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  // null until measured on mount, so a reduced-motion user is never sent "running" first.
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(motion.matches);
    onMotion();
    motion.addEventListener("change", onMotion);

    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    // Glow (and, without a worker, still stars): one bitmap used as the sky's background image,
    // redrawn (debounced) only when the sky's size changes.
    const sky = skyRef.current;
    // The canvas is made here (not in JSX) because a canvas can be transferred to a worker
    // only once; a fresh one per mount keeps React's dev double-mount working.
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 size-full";
    const measure = (): SkySize => ({
      w: sky?.clientWidth ?? 0,
      h: sky?.clientHeight ?? 0,
      dpr: Math.min(window.devicePixelRatio || 1, DPR_CAP),
    });
    const initialState = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "static"
      : "paused"; // the state effect below starts it
    let size = "";
    let timer: number | undefined;
    let alive = true;
    let engine = startWorkerSky(
      canvas,
      measure(),
      initialState,
      (s) => {
        if (sky) sky.dataset.sky = `${s.frames},${s.launched},${s.peak},${s.warpPeak}`;
      },
      () => {
        // Worker failed after the canvas was transferred: drop it and repaint as still stars.
        if (!alive || !engine) return;
        engine.destroy();
        engine = null;
        skyEngine.current = null;
        canvas.remove();
        if (sky) sky.dataset.skyMode = "still";
        size = "";
        paint();
      },
    );
    skyEngine.current = engine;
    if (engine) sky?.append(canvas);
    if (sky) sky.dataset.skyMode = engine ? "worker" : "still";

    const urls = { glow: "" };
    const setImage = (key: keyof typeof urls, blob: Blob | null) => {
      if (!blob || !alive || !sky) return;
      if (urls[key]) URL.revokeObjectURL(urls[key]);
      urls[key] = URL.createObjectURL(blob);
      sky.style.backgroundImage = `url(${urls[key]})`;
    };
    const paint = () => {
      if (!sky) return;
      const next = measure();
      const key = `${next.w}x${next.h}@${next.dpr}`;
      if (key === size) return;
      size = key;
      const glow = drawGlow(next.w, next.h);
      if (engine) {
        engine.resize(next);
        glow?.toBlob((b) => setImage("glow", b));
      } else {
        // No worker: one image with the glow under still stars (each extra full-screen
        // image under the lanyard costs WebKit a repaint per frame).
        const still = drawStillStars(next);
        const ctx = still.getContext("2d");
        if (ctx && glow) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = "destination-over";
          ctx.drawImage(glow, 0, 0, still.width, still.height);
        }
        still.toBlob((b) => setImage("glow", b));
      }
    };
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 200);
    };
    paint();
    window.addEventListener("resize", onResize);
    return () => {
      skyEngine.current?.destroy();
      skyEngine.current = null;
      canvas.remove();
      alive = false;
      Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u));
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const state =
    reduced === null ? "paused" : reduced ? "static" : pageVisible && !menuOpen ? "running" : "paused";

  // Declared after the mount effect, so on mount it runs after the engine exists.
  useEffect(() => {
    skyEngine.current?.setState(state);
  }, [state]);

  // Warp: forward the scroll speed while the sky runs (the engine smooths it).
  useEffect(() => {
    if (state !== "running") return;
    let sent = 0;
    const off = subscribeScrollVelocity((v) => {
      if (Math.abs(Math.abs(v) - Math.abs(sent)) < WARP_STEP && v !== 0) return;
      sent = v;
      skyEngine.current?.warp(v);
    });
    return () => {
      off();
      skyEngine.current?.warp(0);
    };
  }, [state]);

  // Meteor burst each time a new section becomes active (not for the first one on load).
  // Only after the visitor has interacted: loading at /#projects or with a restored scroll
  // position also changes the active section, without anyone scrolling.
  const active = useActiveSection(sectionIds);
  const lastActive = useRef(active);
  const interacted = useRef(false);
  useEffect(() => {
    const on = () => {
      interacted.current = true;
      off();
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const off = () => events.forEach((e) => window.removeEventListener(e, on));
    events.forEach((e) => window.addEventListener(e, on, { passive: true }));
    return off;
  }, []);
  useEffect(() => {
    if (active === lastActive.current) return;
    lastActive.current = active;
    if (state !== "running" || !interacted.current) return;
    const phone = window.innerWidth < 768;
    const n = phone ? 3 + Math.round(Math.random()) : 5 + Math.floor(Math.random() * 4);
    skyEngine.current?.burst(n);
  }, [active, state]);

  return (
    <div
      ref={skyRef}
      aria-hidden="true"
      data-atmosphere={state}
      // lvh: the largest viewport, so Safari's toolbars showing/hiding never resize the sky.
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden bg-size-[100%_100%] bg-no-repeat"
    >
      {/* The worker's star canvas is added by the effect above. */}
    </div>
  );
}
