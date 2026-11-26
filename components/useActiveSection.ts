"use client";

import { useEffect, useState } from "react";

/**
 * id of the section crossing the middle of the viewport (a thin band at 45–50% height).
 * At the very bottom of the page the last section wins, even if it is too short to reach
 * the middle band.
 */
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el) => el !== null);
    if (!els.length) return;
    const inBand = new Set<string>();

    const pick = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) return setActive(ids[ids.length - 1]);
      const hit = ids.find((id) => inBand.has(id));
      if (hit) setActive(hit);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id);
          else inBand.delete(e.target.id);
        }
        pick();
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));

    // The bottom check needs scroll events (passive, rAF-throttled).
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        pick();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [ids]);

  return active;
}
