/**
 * Page scroll velocity (px per second, + = scrolling down), shared by the sky's warp effect and
 * the lanyard's scroll swing. One passive scroll listener, attached while anything listens.
 * Measured in real elapsed time, smoothed, and dropped to 0 shortly after scrolling stops.
 */

type Listener = (v: number) => void;

// No scroll event for this long = stopped. Scroll events come once per frame, so on slow
// devices (a few fps) the wait stretches to twice the recent gap between events (max 400 ms).
const STOP_MS = 100;
const STOP_MAX_MS = 400;
const SMOOTH_MS = 60; // smoothing time constant

let velocity = 0;
let lastY = 0;
let lastT = 0;
let gap = 0; // smoothed time between scroll events (ms)
let users = 0;
let stopTimer: number | undefined;
const listeners = new Set<Listener>();

// Straight from the scroll event (browsers fire it at most once per frame). Not deferred to
// requestAnimationFrame: on a slow device a frame can arrive after the stop timer has already
// reset the speed, and listeners would only ever see 0.
const notify = () => {
  for (const l of listeners) l(velocity);
};

const onScroll = () => {
  const now = performance.now();
  const y = window.scrollY;
  const dt = now - lastT;
  if (lastT && dt > 0) {
    const raw = ((y - lastY) / dt) * 1000;
    const k = 1 - Math.exp(-dt / SMOOTH_MS);
    velocity += (raw - velocity) * k;
    gap = gap ? gap + (dt - gap) * 0.3 : dt;
  }
  lastY = y;
  lastT = now;
  window.clearTimeout(stopTimer);
  stopTimer = window.setTimeout(() => {
    velocity = 0;
    lastT = 0;
    gap = 0;
    notify();
  }, Math.min(STOP_MAX_MS, Math.max(STOP_MS, gap * 2)));
  notify();
};

function attach() {
  if (users++ > 0) return;
  lastY = window.scrollY;
  lastT = 0;
  window.addEventListener("scroll", onScroll, { passive: true });
}

function detach() {
  if (--users > 0) return;
  window.removeEventListener("scroll", onScroll);
  window.clearTimeout(stopTimer);
  velocity = 0;
}

/** Current velocity, for per-frame reads (e.g. in useFrame). Needs an active user (see below). */
export const getScrollVelocity = () => velocity;

/** Keeps the listener attached without a callback (for code that only polls). */
export function holdScrollVelocity() {
  attach();
  return detach;
}

/** Called on each scroll event (at most once per frame), and once with 0 when it stops. */
export function subscribeScrollVelocity(cb: Listener) {
  attach();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    detach();
  };
}
