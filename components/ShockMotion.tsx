"use client";

import { useEffect } from "react";

/**
 * Turns on the section fly-ins (CSS in globals.css): sets html[data-shock] unless the visitor
 * prefers reduced motion, and marks each [data-fly] block with data-inview while it is on screen.
 * The attribute is removed once a block is fully off screen, so the fly-in replays every time.
 * Without JavaScript, or with reduced motion, the CSS never hides anything.
 *
 * Visibility is measured on each block's parent, which is never transformed: a waiting block is
 * scaled down from its top edge, so its own box would end far above its real bottom and a tall
 * section scrolled into from below would show blank space before flying in.
 */
export function ShockMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const blocks = [...document.querySelectorAll<HTMLElement>("[data-fly]")];
    const blockOf = new Map<Element, HTMLElement>();
    for (const el of blocks) if (el.parentElement) blockOf.set(el.parentElement, el);

    // Blocks already on screen when motion turns on stay put (no hide-then-fly-in flash on a
    // reload mid-page or a /#projects link): mark them before html[data-shock] can hide them.
    const markOnScreen = () => {
      for (const [box, el] of blockOf) {
        const r = box.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) el.dataset.inview = "";
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
          if (el && e.isIntersecting) el.dataset.inview = "";
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    const leave = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = blockOf.get(e.target);
        if (el && !e.isIntersecting) delete el.dataset.inview;
      }
    });
    for (const box of blockOf.keys()) {
      enter.observe(box);
      leave.observe(box);
    }

    return () => {
      motion.removeEventListener("change", onMotion);
      enter.disconnect();
      leave.disconnect();
      delete root.dataset.shock;
    };
  }, []);

  return null;
}
