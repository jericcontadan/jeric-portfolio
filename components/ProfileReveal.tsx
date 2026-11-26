"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Reveal circle radius in CSS px (~140px across). */
const RADIUS = 70;
/** Follow / grow time constants (ms). Smoothing uses real elapsed time, not frames. */
const TAU_POS = 70;
const TAU_R = 110;
/** Mouse-type events this soon after a touch are the browser's tap emulation: ignore them. */
const TOUCH_MOUSE_GUARD_MS = 800;
const SIZES = "(min-width: 1024px) 440px, (min-width: 640px) 420px, 88vw";

/**
 * Profile photo with a soft violet glow. A soft-edged circle follows the mouse (or a finger
 * dragged sideways across the photo) and reveals a second, perfectly aligned image underneath.
 * - Both images share size, `sizes` and object-fit, so they resolve to the same pixels.
 * - Touch: `touch-action: pan-y pinch-zoom`, so vertical swipes scroll and pinch still zooms;
 *   the circle only appears once a finger moves sideways (taps and scrolls never flicker it).
 * - The reveal image is only fetched on the first pointer interaction.
 * - prefers-reduced-motion: the reveal layer and its listeners are never rendered.
 */
export function ProfileReveal() {
  const wrap = useRef<HTMLDivElement>(null);
  // null until measured on mount, so the server never renders the reveal layer.
  const [motionOk, setMotionOk] = useState<boolean | null>(null);
  // Mount (and so download) the reveal image only once someone points at the photo.
  const [armed, setArmed] = useState(false);

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

    const target = { x: 0, y: 0, r: 0 };
    const cur = { x: 0, y: 0, r: 0 };
    let raf = 0;
    let last = 0;

    const write = () => {
      el.style.setProperty("--x", `${cur.x.toFixed(1)}px`);
      el.style.setProperty("--y", `${cur.y.toFixed(1)}px`);
      el.style.setProperty("--r", `${Math.max(0, cur.r).toFixed(1)}px`);
    };

    const tick = (now: number) => {
      // rAF's timestamp is the frame start, which can precede the `last` set in a pointer
      // handler: clamp at 0 (a negative dt would push r below 0 and void the mask). The upper
      // cap only guards long stalls (exp smoothing is stable for any dt).
      const dt = Math.max(0, Math.min(250, now - last));
      last = now;
      const kp = 1 - Math.exp(-dt / TAU_POS);
      const kr = 1 - Math.exp(-dt / TAU_R);
      cur.x += (target.x - cur.x) * kp;
      cur.y += (target.y - cur.y) * kp;
      cur.r += (target.r - cur.r) * kr;
      const settled =
        Math.abs(target.x - cur.x) < 0.3 &&
        Math.abs(target.y - cur.y) < 0.3 &&
        Math.abs(target.r - cur.r) < 0.3;
      if (settled) Object.assign(cur, target);
      write();
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const kick = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    // Last pointer position in viewport coords, so a wheel scroll can re-aim the circle.
    const client = { x: 0, y: 0 };
    const aim = () => {
      const b = el.getBoundingClientRect();
      target.x = client.x - b.left;
      target.y = client.y - b.top;
      return client.x >= b.left && client.x <= b.right && client.y >= b.top && client.y <= b.bottom;
    };
    const show = (e: PointerEvent) => {
      setArmed(true);
      client.x = e.clientX;
      client.y = e.clientY;
      aim();
      // Appearing from nothing: start at the pointer instead of sweeping in from the old spot.
      if (cur.r < 1) {
        cur.x = target.x;
        cur.y = target.y;
      }
      target.r = RADIUS;
      el.dataset.reveal = "on";
      kick();
    };
    const hide = () => {
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
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onEnd);
      el.removeEventListener("pointerleave", onEnd);
      window.removeEventListener("scroll", onScroll);
      el.dataset.reveal = "off";
      el.style.setProperty("--r", "0px");
    };
  }, [motionOk]);

  const mask =
    "radial-gradient(circle var(--r) at var(--x) var(--y), #000 55%, transparent 100%)";

  return (
    <figure className="mx-auto w-full max-w-[420px] lg:max-w-[440px]">
      <div
        ref={wrap}
        data-profile-reveal
        data-reveal="off"
        className="relative aspect-square touch-pan-y touch-pinch-zoom select-none [-webkit-touch-callout:none] [--r:0px] [--x:50%] [--y:50%]"
      >
        {/* Glow: a soft violet pool behind the shoulders, plus a faint floor line. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-[14%] top-[22%] bottom-[2%] rounded-full bg-violet/40 blur-3xl"
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
              className="object-contain"
            />
          </div>
        )}
      </div>
      {/* Server-rendered (no layout shift after hydration); CSS hides it under reduced motion.
          aria-hidden: it describes a pointer-only visual effect. */}
      <figcaption aria-hidden="true" className="mt-4 text-center text-base text-muted motion-reduce:hidden">
        <span className="[@media(hover:none)]:hidden">Move your cursor over the photo</span>
        <span className="hidden [@media(hover:none)]:inline">Drag a finger sideways across the photo</span>
      </figcaption>
    </figure>
  );
}
