"use client";

import { useEffect } from "react";

/**
 * Turns on the section fly-ins (CSS in globals.css): sets html[data-shock] unless the visitor
 * prefers reduced motion, and marks each [data-fly] block with data-inview once it is on screen.
 * The fly-in replays every time a block enters from below: the attribute is removed when it
 * leaves through the bottom, or reset when it comes back from below after leaving through the top
 * (e.g. a jump past it). A block scrolled back into from the top keeps it: there the deep-space
 * exit (globals.css) reverses instead, with no second effect on top.
 * Without JavaScript, or with reduced motion, the CSS never hides anything.
 *
 * Visibility is measured on each block's parent, not the block: a waiting block is scaled down
 * from its top edge, so its own box would end far above its real bottom and a tall section
 * scrolled into from below would show blank space before flying in. The parent sits inside the
 * [data-exit] wrapper, whose transform pivots on its bottom edge, so the bottom edge these
 * observers rely on stays put while a section recedes.
 */
export function ShockMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const blocks = [...document.querySelectorAll<HTMLElement>("[data-fly]")];
    const blockOf = new Map<Element, HTMLElement>();
    for (const el of blocks) if (el.parentElement) blockOf.set(el.parentElement, el);
    // Blocks that last left (or started) above the screen.
    const above = new Set<HTMLElement>();

    // Blocks already on screen when motion turns on stay put (no hide-then-fly-in flash on a
    // reload mid-page or a /#projects link): mark them before html[data-shock] can hide them.
    // Blocks above the screen count as shown too: scrolling up into them, the exit reverses.
    const markOnScreen = () => {
      for (const [box, el] of blockOf) {
        const r = box.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) el.dataset.inview = "";
        else if (r.bottom <= 0) {
          el.dataset.inview = "";
          above.add(el);
        }
      }
    };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      if (motion.matches) delete root.dataset.shock;
      else {
        markOnScreen();
        root.dataset.shock = "";
      }
    };
    onMotion();
    motion.addEventListener("change", onMotion);

    // Enter: at least a sliver above the bottom 10% of the screen. Leave: fully off screen.
    const enter = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = blockOf.get(e.target);
          if (!el || !e.isIntersecting) continue;
          // Last seen above, now arriving from below (it was jumped past): fly in again.
          const fromTop = e.boundingClientRect.top <= 0;
          if (above.has(el) && !fromTop && "inview" in el.dataset) {
            delete el.dataset.inview;
            void el.offsetWidth; // apply the waiting state, so the fly-in transition runs
          }
          // Never shown, and scrolled into from the top (a jump carried it from below the screen
          // to above without it being seen): appear in place, no fly-in on top of the reversing
          // exit. data-instant skips the transition for this one change.
          if (fromTop && !("inview" in el.dataset)) {
            el.dataset.instant = "";
            requestAnimationFrame(() => requestAnimationFrame(() => delete el.dataset.instant));
          }
          above.delete(el);
          el.dataset.inview = "";
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Leaving through the bottom resets the block (it flies in again from below). Leaving through
    // the top keeps it, and remembers it is above.
    const leave = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = blockOf.get(e.target);
        if (!el || e.isIntersecting) continue;
        if (e.boundingClientRect.top > 0) {
          delete el.dataset.inview;
          above.delete(el);
        } else above.add(el);
      }
    });
    for (const box of blockOf.keys()) {
      enter.observe(box);
      leave.observe(box);
    }

    // Deep-space exit fallback, for browsers without scroll-driven animations (globals.css does
    // the rest natively): write the exit progress --exit (0..1) at threshold crossings, never per
    // frame: 0 while the block's top is on screen (or, for a block taller than the screen, until
    // its bottom rises past the screen's bottom), 1 once fully above the top.
    // Observed and measured through the block's positioned ancestor (its <section>), which is
    // never transformed: the block's own box shrinks as it recedes, and after a jump past it a
    // block left fully receded could otherwise look off screen while it is on screen, and never
    // be reset. The block's real bottom comes from layout (offsetTop/offsetHeight).
    let exitObserver: IntersectionObserver | undefined;
    if (!CSS.supports("animation-timeline: view()")) {
      root.dataset.exitFallback = "";
      const exitBlocks = new Map<Element, HTMLElement[]>();
      for (const el of document.querySelectorAll<HTMLElement>("[data-exit]")) {
        const anchor = el.offsetParent;
        if (!anchor) continue;
        exitBlocks.set(anchor, [...(exitBlocks.get(anchor) ?? []), el]);
      }
      exitObserver = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const vh = e.rootBounds?.height ?? window.innerHeight;
            for (const el of exitBlocks.get(e.target) ?? []) {
              const bottom = e.boundingClientRect.top + el.offsetTop + el.offsetHeight;
              const span = Math.min(vh, el.offsetHeight) || 1;
              const p = bottom >= vh ? 0 : Math.min(1, Math.max(0, 1 - bottom / span));
              if (p > 0) {
                el.style.setProperty("--exit", p.toFixed(3));
                el.dataset.exiting = "";
              } else if ("exiting" in el.dataset) {
                el.style.removeProperty("--exit");
                delete el.dataset.exiting;
              }
            }
          }
        },
        // Fine steps (0.5%): a section several screens tall spans only a small ratio range as it
        // leaves, so coarse thresholds would move it in visible jumps.
        { threshold: Array.from({ length: 201 }, (_, i) => i / 200) },
      );
      for (const anchor of exitBlocks.keys()) exitObserver.observe(anchor);
    }

    return () => {
      motion.removeEventListener("change", onMotion);
      enter.disconnect();
      leave.disconnect();
      exitObserver?.disconnect();
      delete root.dataset.shock;
      delete root.dataset.exitFallback;
    };
  }, []);

  return null;
}
