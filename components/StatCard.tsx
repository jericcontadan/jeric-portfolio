"use client";

import { useEffect, useRef, useState } from "react";
import { stats } from "@/lib/site";

const COUNT_MS = 1200;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts up once when it scrolls into view, framed by a slowly rotating
 * violet glow border (only animated while on screen).
 * - The server renders the final value; the client resets it to 0 only if the card is still
 *   off screen, so no one sees the reset. Screen readers always get the final value.
 * - prefers-reduced-motion: final value, still border.
 */
export function StatCard({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(value);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let counted = reduced;
    const r = el.getBoundingClientRect();
    if (!counted && (r.bottom < 0 || r.top > window.innerHeight)) setShown(0);
    else counted = true;

    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (!entry.isIntersecting || counted) return;
        counted = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - t0) / COUNT_MS);
          setShown(Math.round(easeOutCubic(t) * value));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 rounded-2xl border border-transparent px-5 py-4 sm:block sm:text-center shadow-[0_0_32px_-12px_rgb(109_74_255/0.55)] [background:linear-gradient(var(--color-panel),var(--color-panel))_padding-box,conic-gradient(from_var(--glow-angle),rgb(109_74_255/0.15),var(--color-violet)_12%,var(--color-violet-soft)_20%,rgb(109_74_255/0.15)_38%,rgb(109_74_255/0.15))_border-box] sm:px-6 sm:py-7 ${
        inView ? "animate-[glow-spin_6s_linear_infinite] motion-reduce:animate-none" : ""
      }`}
    >
      <p className="min-w-[2ch] font-display text-4xl font-semibold tracking-tight text-fg tabular-nums sm:text-5xl">
        <span aria-hidden="true">{shown}</span>
        <span className="sr-only">{value}</span>
      </p>
      <p className="text-base text-muted sm:mt-1">{label}</p>
    </div>
  );
}

/** The three About stats: stacked wide cards on phones, a row of three from 640px. */
export function StatsRow() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-5 md:max-w-2xl">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
