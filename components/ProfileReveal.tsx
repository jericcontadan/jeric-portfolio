"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Reveal circle radius in CSS px: 220px across, 160px on phones. Keep in sync with the ring size. */
const RADIUS = 110;
const RADIUS_PHONE = 80;
/** Same breakpoint as Tailwind's `sm:` (width >= 40rem), which sizes the ring: no gap between them. */
const PHONE_MQ = "(width < 40rem)";
/** Position follow time constant (ms). Smoothing uses real elapsed time, not frames. */
const TAU_POS = 90;
/** Radius spring (per second²/per second): pops in in ~250ms with a ~5% overshoot. */
const SPRING_K = 420;
const SPRING_C = 28;
/** Mouse-type events this soon after a touch are the browser's tap emulation: ignore them. */
const TOUCH_MOUSE_GUARD_MS = 800;
/** One-time sweep: wait for the section fly-in to land, then cross the face. With the pop-in and
 *  shrink it ends in about 1 s (lighter and shorter on phones). */
const SWEEP_DELAY_MS = 700;
const SWEEP_MS = 750;
const SWEEP_MS_PHONE = 600;
/** Sweep path, as fractions of the frame (the face sits near x 48%, y 25%). */
const SWEEP_FROM_X = 0.2;
const SWEEP_TO_X = 0.76;
const SWEEP_Y = 0.26;
const SIZES = "(min-width: 1024px) 380px, (min-width: 640px) 340px, 300px";

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Portrait profile photo with a soft violet glow. A sharp-edged circle with a glowing violet ring
 * follows the mouse (or a finger dragged sideways across the photo) and reveals a second,
 * perfectly aligned image underneath.
 * - Both images share size, `sizes` and object-fit, so they resolve to the same pixels.
 * - The first time the photo scrolls into view, the circle sweeps across the face once by itself.
 * - Touch: `touch-action: pan-y pinch-zoom`, so vertical swipes scroll and pinch still zooms;
 *   the circle only appears once a finger moves sideways (taps and scrolls never flicker it).
 * - The reveal image is only fetched on the first interaction (or just before the sweep).
 * - Per frame, only CSS variables change; the ring moves by transform alone. rAF runs only
 *   while something is moving.
 * - prefers-reduced-motion: the reveal layer, ring, sweep, label and listeners are never rendered.
 */
export function ProfileReveal() {
  const wrap = useRef<HTMLDivElement>(null);
  // null until measured on mount, so the server never renders the reveal layer.
  const [motionOk, setMotionOk] = useState<boolean | null>(null);
  // Mount (and so download) the reveal image only once it is needed.
  const [armed, setArmed] = useState(false);
  // The visitor has used the reveal themselves: fade the "Hover / Drag to reveal" label.
  const [interacted, setInteracted] = useState(false);
  // Reveal image load state, so the sweep never runs over a still-empty layer (or waits forever
  // on one that failed to load).
  const revealLoaded = useRef<{ done: boolean; failed: boolean; cb: (() => void) | null }>({
    done: false,
    failed: false,
    cb: null,
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el || !motionOk) return;

    const loaded = revealLoaded.current;
    const phoneMq = window.matchMedia(PHONE_MQ);
    const radius = () => (phoneMq.matches ? RADIUS_PHONE : RADIUS);
    const target = { x: 0, y: 0, r: 0 };
    const cur = { x: 0, y: 0, r: 0 };
    let vr = 0; // radius spring velocity (px/s)
    let raf = 0;
    let last = 0;

    // One-time sweep: null when not running.
    let sweep: { t0: number; dur: number; w: number; h: number } | null = null;
    let swept = false;
    let sweepTimer = 0;
    let userDone = false;
    let visible = false; // at least half the photo is on screen

    const write = () => {
      el.style.setProperty("--x", `${cur.x.toFixed(1)}px`);
      el.style.setProperty("--y", `${cur.y.toFixed(1)}px`);
      el.style.setProperty("--r", `${Math.max(0, cur.r).toFixed(1)}px`);
      el.style.setProperty("--s", (Math.max(0, cur.r) / radius()).toFixed(3));
    };

    // data-swept: "auto" when the sweep ran to the end, "user" when an interaction pre-empted it,
    // "error" when the reveal image failed to load.
    const finishSweep = (how: "auto" | "user" | "error") => {
      if (swept) return;
      swept = true;
      sweep = null;
      clearTimeout(sweepTimer);
      io.disconnect();
      el.dataset.swept = how;
    };

    const tick = (now: number) => {
      // rAF's timestamp is the frame start, which can precede the `last` set in a pointer
      // handler: clamp at 0. The upper cap only guards long stalls.
      const dt = Math.max(0, Math.min(250, now - last));
      last = now;

      if (sweep) {
        const p = Math.min(1, (now - sweep.t0) / sweep.dur);
        target.x = sweep.w * (SWEEP_FROM_X + (SWEEP_TO_X - SWEEP_FROM_X) * easeInOut(p));
        target.y = sweep.h * SWEEP_Y;
        if (p >= 1) {
          finishSweep("auto");
          target.r = 0;
          el.dataset.reveal = "off";
        }
      }

      const kp = 1 - Math.exp(-dt / TAU_POS);
      cur.x += (target.x - cur.x) * kp;
      cur.y += (target.y - cur.y) * kp;
      // Spring, sub-stepped so it stays stable at low frame rates.
      for (let left = dt / 1000; left > 0; left -= 0.016) {
        const h = Math.min(0.016, left);
        vr += (SPRING_K * (target.r - cur.r) - SPRING_C * vr) * h;
        cur.r += vr * h;
      }
      if (cur.r < 0) {
        cur.r = 0;
        if (vr < 0) vr = 0;
      }
      const settled =
        !sweep &&
        Math.abs(target.x - cur.x) < 0.3 &&
        Math.abs(target.y - cur.y) < 0.3 &&
        Math.abs(target.r - cur.r) < 0.3 &&
        Math.abs(vr) < 5;
      if (settled) {
        Object.assign(cur, target);
        vr = 0;
      }
      write();
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const kick = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const startSweep = () => {
      sweepTimer = 0;
      // Scrolled away during the delay: wait for the next time the photo is on screen.
      if (swept || userDone || !visible) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dur = phoneMq.matches ? SWEEP_MS_PHONE : SWEEP_MS;
      sweep = { t0: performance.now(), dur, w, h };
      cur.x = target.x = w * SWEEP_FROM_X;
      cur.y = target.y = h * SWEEP_Y;
      target.r = radius();
      el.dataset.reveal = "sweep";
      kick();
    };

    // Sweep once, the first time at least half the photo stays on screen. A fast scroll straight
    // past About cancels the pending sweep, so it is not spent off screen.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (!visible) {
          clearTimeout(sweepTimer);
          sweepTimer = 0;
          loaded.cb = null;
          return;
        }
        if (swept || userDone || sweepTimer) return;
        setArmed(true);
        const go = () => {
          if (loaded.failed) finishSweep("error");
          else if (visible) sweepTimer = window.setTimeout(startSweep, SWEEP_DELAY_MS);
        };
        if (loaded.done || loaded.failed) go();
        else loaded.cb = go;
      },
      { threshold: 0.5 },
    );
    io.observe(el);

    // Crossing the phone breakpoint mid-reveal: resize the open circle to match the ring.
    const onPhoneChange = () => {
      if (target.r > 0) {
        target.r = radius();
        kick();
      }
    };
    phoneMq.addEventListener("change", onPhoneChange);

    // Last pointer position in viewport coords, so a wheel scroll can re-aim the circle.
    const client = { x: 0, y: 0 };
    const aim = () => {
      const b = el.getBoundingClientRect();
      target.x = client.x - b.left;
      target.y = client.y - b.top;
      return client.x >= b.left && client.x <= b.right && client.y >= b.top && client.y <= b.bottom;
    };
    const show = (e: PointerEvent) => {
      // A real interaction takes over from the sweep, and retires the label.
      if (!userDone) {
        userDone = true;
        setInteracted(true);
      }
      finishSweep("user");
      setArmed(true);
      client.x = e.clientX;
      client.y = e.clientY;
      aim();
      // Appearing from nothing: start at the pointer instead of sweeping in from the old spot.
      if (cur.r < 1) {
        cur.x = target.x;
        cur.y = target.y;
      }
      target.r = radius();
      el.dataset.reveal = "on";
      kick();
    };
    const hide = () => {
      if (sweep) return; // a stray leave/up during the sweep doesn't cut it short
      target.r = 0;
      el.dataset.reveal = "off";
      kick();
    };

    // Touch: follow one finger (its pointerId); the circle waits until it moves sideways.
    let finger: { id: number; x: number; y: number } | null = null;
    let lastTouch = -Infinity;
    // Touch-only devices (no hover-capable pointer) also send compatibility "mouse" pointer
    // events, e.g. WebKit replays a mousemove at the last touch point when the page scrolls
    // under it. Ignore those; an iPad with a trackpad reports any-hover and keeps the hover.
    const hoverMq = window.matchMedia("(any-hover: hover)");
    const emulated = (e: PointerEvent) =>
      e.pointerType !== "touch" &&
      (!hoverMq.matches || performance.now() - lastTouch < TOUCH_MOUSE_GUARD_MS);

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        lastTouch = performance.now();
        setArmed(true); // start fetching the reveal image before the drag begins
        if (!finger) finger = { id: e.pointerId, x: e.clientX, y: e.clientY };
      } else if (!emulated(e)) show(e);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") {
        if (!emulated(e)) show(e);
        return;
      }
      lastTouch = performance.now();
      if (!finger || e.pointerId !== finger.id) return;
      if (el.dataset.reveal !== "on") {
        const dx = Math.abs(e.clientX - finger.x);
        const dy = Math.abs(e.clientY - finger.y);
        if (dx < 6 || dx < dy) return;
      }
      show(e);
    };
    const onEnd = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        lastTouch = performance.now();
        if (!finger || e.pointerId !== finger.id) return;
        finger = null;
      }
      hide();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") onEnd(e);
    };
    // Wheel scroll moves the photo under a still cursor: keep the circle under the cursor,
    // or hide it once the cursor is off the photo (Safari sends no pointerleave on scroll).
    const onScroll = () => {
      if (el.dataset.reveal !== "on" || finger) return;
      if (aim()) kick();
      else hide();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onEnd);
    el.addEventListener("pointerleave", onEnd);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(sweepTimer);
      io.disconnect();
      loaded.cb = null;
      phoneMq.removeEventListener("change", onPhoneChange);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onEnd);
      el.removeEventListener("pointerleave", onEnd);
      window.removeEventListener("scroll", onScroll);
      el.dataset.reveal = "off";
      el.style.setProperty("--r", "0px");
      el.style.setProperty("--s", "0");
    };
  }, [motionOk]);

  const onRevealSettled = (ok: boolean) => {
    const s = revealLoaded.current;
    if (ok) s.done = true;
    else s.failed = true;
    const cb = s.cb;
    s.cb = null;
    cb?.();
  };

  // Solid core; only the outer 15% of the radius fades, just inside the ring.
  const mask =
    "radial-gradient(circle var(--r) at var(--x) var(--y), #000 85%, transparent 100%)";

  return (
    <figure className="mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[380px]">
      <div
        ref={wrap}
        data-profile-reveal
        data-reveal="off"
        className="relative aspect-[853/1280] touch-pan-y touch-pinch-zoom select-none [-webkit-touch-callout:none] [--r:0px] [--s:0] [--x:50%] [--y:50%]"
      >
        {/* Glow: a soft violet pool behind the body, plus a faint floor line. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-[12%] top-[18%] bottom-[4%] rounded-full bg-violet/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-[6%] bottom-0 h-px bg-linear-to-r from-transparent via-violet-soft/60 to-transparent"
        />
        <Image
          src="/profile-cutout.png"
          alt="Portrait of Jeric Contadan"
          fill
          sizes={SIZES}
          draggable={false}
          className="pointer-events-none object-contain"
        />
        {motionOk && armed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ maskImage: mask, WebkitMaskImage: mask }}
          >
            <Image
              src="/profile-reveal.png"
              alt=""
              fill
              sizes={SIZES}
              loading="eager"
              draggable={false}
              onLoad={() => onRevealSettled(true)}
              onError={() => onRevealSettled(false)}
              className="object-contain"
            />
          </div>
        )}
        {motionOk && (
          // Ring: fixed size (2 × radius), moved and scaled by transform only.
          <div
            aria-hidden="true"
            data-reveal-ring
            className="pointer-events-none absolute top-0 left-0 size-[160px] rounded-full border-[3px] border-violet-soft shadow-[0_0_18px_2px_rgb(139_108_255/0.55),inset_0_0_12px_rgb(139_108_255/0.35)] will-change-transform sm:size-[220px]"
            style={{
              transform:
                "translate(calc(var(--x) - 50%), calc(var(--y) - 50%)) scale(var(--s))",
            }}
          />
        )}
      </div>
      {/* Server-rendered (no layout shift after hydration); CSS hides it under reduced motion.
          aria-hidden: it describes a pointer-only visual effect. Fades after the first use. */}
      <figcaption
        aria-hidden="true"
        data-reveal-label
        className={`mt-5 flex justify-center transition-opacity duration-500 motion-reduce:hidden ${interacted ? "opacity-0" : "opacity-100"}`}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-violet/40 bg-violet/10 px-4 py-1.5 text-base text-violet-soft">
          <span className="size-2 rounded-full bg-violet-soft shadow-[0_0_8px_rgb(166_140_255/0.9)]" />
          <span className="[@media(hover:none)]:hidden">Hover to reveal</span>
          <span className="hidden [@media(hover:none)]:inline">Drag to reveal</span>
        </span>
      </figcaption>
    </figure>
  );
}
