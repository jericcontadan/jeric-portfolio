"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useMenu } from "../MenuContext";

// Client-only, separate chunk: three.js + Rapier (WASM) never load with the page itself.
const Lanyard = dynamic(() => import("./Lanyard"), { ssr: false });

/** Keeps the static card if WebGL, the chunk, or a texture fails. */
class LanyardBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    // Free the test context right away; the lanyard creates its own.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * Fixed-size hero stage. Shows the static card immediately (and permanently under
 * prefers-reduced-motion), then loads the 3D lanyard when the stage is in view and the
 * browser is idle. The stage size never changes, so the swap causes no layout shift.
 */
export function HeroStage({ children }: { children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement>(null!);
  const stageRef = useRef<HTMLDivElement>(null);
  const { menuOpen } = useMenu();
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const toggleFlip = () => setFlipped((f) => !f);
  // Only feeds the client-only 3D, so reading it during the first client render is safe.
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let idleId: number | undefined;
    let timerId: number | undefined;
    let scheduled = false;
    let visible = false;

    const cancel = () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
      idleId = timerId = undefined;
    };

    const schedule = () => {
      if (scheduled || reduced.matches || !webglAvailable()) return;
      scheduled = true;
      const go = () => {
        if (!reduced.matches) setLoad(true);
      };
      if (typeof window.requestIdleCallback === "function")
        idleId = window.requestIdleCallback(go, { timeout: 1500 });
      else timerId = window.setTimeout(go, 300);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setInView(visible);
      if (visible) schedule();
    });
    io.observe(stage);

    // Turning reduced motion on unloads the 3D (and cancels a pending load);
    // turning it off loads it again if the stage is on screen.
    const onMotion = () => {
      setReducedMotion(reduced.matches);
      if (reduced.matches) {
        cancel();
        setLoad(false);
        setReady(false);
        scheduled = false;
      } else if (visible) {
        schedule();
      }
    };
    reduced.addEventListener("change", onMotion);

    const onVisibility = () =>
      setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      reduced.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
      cancel();
    };
  }, []);

  const active = inView && pageVisible && !menuOpen;
  const showCanvas = load && !failed;
  const showStatic = !ready || failed;

  return (
    // Hero grid. It is also the pointer-event source for the canvas, so the canvas can
    // overlap the text on desktop without blocking its links and buttons.
    <div
      ref={gridRef}
      className="grid items-center gap-8 [-webkit-tap-highlight-color:transparent] lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.2fr_1fr] lg:gap-10"
    >
      {children}
      <div className="lg:self-stretch">
        <div
          ref={stageRef}
          // Vertical swipes scroll the page; horizontal drags swing the card.
          className="relative h-[min(calc(100svh-4rem),46rem)] min-h-[32rem] w-full touch-pan-y touch-pinch-zoom select-none max-lg:[container-type:size] [-webkit-touch-callout:none] lg:h-full lg:min-h-[600px]"
          // Debug/test hook: static | loading | running | paused
          data-lanyard={
            !showCanvas
              ? "static"
              : !ready
                ? "loading"
                : active
                  ? "running"
                  : "paused"
          }
        >
          <StaticCard hidden={!showStatic} flipped={flipped} />
          {showCanvas && (
            // Mobile/tablet: the stage widened to the screen edges (past the container padding)
            // so a swinging card is not clipped. Desktop: widened left across the text
            // column (1.2fr) and the gap (2.5rem), and right to the page edge (past the
            // container's 2rem padding and side margin), so a swinging card is never clipped.
            // 100cqw = the hero section's width (Hero sets @container), which excludes the
            // scrollbar, unlike 100vw.
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -right-5 -left-5 md:-right-8 md:-left-8 lg:right-[min(-2rem,calc((75rem-100cqw)/2-2rem))] lg:left-[calc(-120%-2.5rem)]"
            >
              <LanyardBoundary onError={() => setFailed(true)}>
                <Lanyard
                  active={active}
                  onReady={() => setReady(true)}
                  eventSource={gridRef}
                  stage={stageRef}
                  flipped={flipped}
                  onFlip={toggleFlip}
                  idlePeek={!reducedMotion}
                />
              </LanyardBoundary>
            </div>
          )}

          {/* Screen readers: what the visible side of the card says (announced on flip). */}
          <p id="hero-card-desc" className="sr-only" aria-live="polite">
            {flipped ? CARD_BACK_TEXT : CARD_FRONT_TEXT}
          </p>
          {/* Keyboard / screen-reader way to flip (pointer users can also double-click or double-tap). */}
          <button
            type="button"
            onClick={toggleFlip}
            aria-pressed={flipped}
            aria-controls="hero-card-desc"
            className="absolute bottom-5 left-1/2 z-10 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-ink/70 px-4 text-base text-muted backdrop-blur-sm transition-colors hover:border-violet-soft hover:text-fg lg:bottom-8"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
              className="size-4"
            >
              <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.66 5.66L4 15.5M4 20v-4.5h4.5" />
            </svg>
            Flip card
          </button>
        </div>
      </div>
    </div>
  );
}

const CARD_FRONT_TEXT =
  "ID card, front: Jeric Contadan, Full Stack Developer. BS Information Systems, Section BSIS-3C, Technological University of the Philippines – Manila. jericcontadan.vercel.app";
const CARD_BACK_TEXT =
  "ID card, back: Let's build something. Open to OJT, internships and freelance projects. Email jericcontadan6@gmail.com. GitHub github.com/jericcontadan. LinkedIn in/jeric-contadan-aa6484452. Website jericcontadan.vercel.app";

const CARD_SIZES = "(min-width: 1024px) 35vh, (min-width: 640px) 360px, 80vw";

/**
 * Still version of the lanyard, and the layout source of truth: the 3D scene measures
 * [data-static-card] and zooms/offsets its camera so the resting 3D card lands exactly here.
 * - Below lg: the card is ~78% of the width on phones (max 22.5rem on tablets, and never
 *   so tall that it crowds the strap), with its bottom 5.5rem above the stage bottom.
 * - lg+: top 29%, height 49% of the stage.
 * The strap (lanyard.png) and clip hang from the card up to the top of the stage.
 * Flips with a CSS turn, or instantly under prefers-reduced-motion. The faces swap by
 * opacity at the half-way point instead of relying on backface-visibility, which WebKit
 * ignores here. Decorative for assistive tech: #hero-card-desc describes the visible side.
 */
function StaticCard({
  hidden,
  flipped,
}: {
  hidden: boolean;
  flipped: boolean;
}) {
  const face =
    "rounded-md object-cover [transition:opacity_0s_linear_250ms] motion-reduce:[transition:none]";
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 motion-reduce:transition-none ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        data-static-card
        className="absolute bottom-[5.5rem] left-1/2 aspect-[5/7] w-[min(78vw,22.5rem,calc((100cqh-11.5rem)/1.4))] -translate-x-1/2 [container-type:inline-size] lg:top-[29%] lg:bottom-auto lg:h-[49%] lg:w-auto"
      >
        {/* Strap: lanyard.png turned vertical, from the clip up past the top of the stage.
            Widths match the 3D scene: strap 0.3 and clip 0.32 of a 1.6-wide card. */}
        <div className="absolute bottom-[calc(100%+7cqw)] left-1/2 h-[200vh] w-[18.75cqw] -translate-x-1/2 overflow-hidden">
          <div className="absolute top-0 left-full h-[18.75cqw] w-[200vh] origin-top-left rotate-90 bg-[url(/lanyard.png)] bg-size-[auto_100%] bg-repeat-x" />
        </div>
        <div className="absolute bottom-[calc(100%+0.6cqw)] left-1/2 h-[7.5cqw] w-[20cqw] -translate-x-1/2 rounded-sm bg-[#c9ccd6]" />
        <div className="absolute inset-0 [perspective:1200px]">
          <div
            className={`relative h-full w-full shadow-[0_20px_40px_-12px_rgb(0_0_0/0.6)] transition-transform duration-500 motion-reduce:transition-none ${
              flipped ? "[transform:rotateY(180deg)]" : ""
            }`}
          >
            <Image
              src="/card-static.png"
              alt=""
              fill
              sizes={CARD_SIZES}
              loading="eager"
              className={`${face} ${flipped ? "opacity-0" : "opacity-100"}`}
            />
            <Image
              src="/card-back.png"
              alt=""
              fill
              sizes={CARD_SIZES}
              // Pre-mirrored so it reads correctly once the wrapper has turned 180°.
              className={`${face} [transform:scaleX(-1)] ${flipped ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
