"use client";

import { useEffect, useState } from "react";

const ROLES = ["Full Stack Developer", "UI Designer", "BSIS Student · TUP Manila"] as const;
const TYPE_MS = 70;
const DELETE_MS = 40;
const HOLD_MS = 1800;
const GAP_MS = 350;

/**
 * Types and deletes each role in turn, with a blinking caret. The server and first paint
 * show the first role in full, so nothing flashes before hydration.
 * - Width is reserved for the longest role, so the text after it never moves.
 * - Screen readers get one static sentence; the animated text is hidden from them.
 * - Pauses while the tab is hidden; static first role under prefers-reduced-motion.
 * All timing is setTimeout (real elapsed time), not per frame.
 */
export function TypedRole() {
  const [role, setRole] = useState(0);
  const [chars, setChars] = useState<number>(ROLES[0].length);
  const [phase, setPhase] = useState<"hold" | "delete" | "type">("hold");
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const on = !reduced.matches && document.visibilityState === "visible";
      setAnimate(on);
      if (reduced.matches) {
        setRole(0);
        setChars(ROLES[0].length);
        setPhase("hold");
      }
    };
    update();
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (!animate) return;
    const text = ROLES[role];
    let id: number;
    if (phase === "hold") {
      id = window.setTimeout(() => setPhase("delete"), HOLD_MS);
    } else if (phase === "delete") {
      id =
        chars > 0
          ? window.setTimeout(() => setChars(chars - 1), DELETE_MS)
          : window.setTimeout(() => {
              setRole((role + 1) % ROLES.length);
              setPhase("type");
            }, GAP_MS);
    } else {
      id =
        chars < text.length
          ? window.setTimeout(() => setChars(chars + 1), TYPE_MS)
          : window.setTimeout(() => setPhase("hold"), 0);
    }
    return () => window.clearTimeout(id);
  }, [animate, role, chars, phase]);

  const longest = ROLES.reduce((a, b) => (b.length > a.length ? b : a));

  return (
    <>
      <span className="sr-only">{ROLES.join(", ")}</span>
      <span aria-hidden="true" className="inline-grid align-bottom">
        {/* Invisible sizer: keeps the width of the longest role. */}
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {longest}
          <span className="ml-0.5 inline-block w-[2px]" />
        </span>
        <span className="col-start-1 row-start-1 whitespace-nowrap">
          {ROLES[role].slice(0, chars)}
          <span
            className={`ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em] bg-violet-soft ${
              animate && phase === "hold" ? "animate-[caret-blink_1s_steps(1)_infinite]" : ""
            } ${animate ? "" : "opacity-0"}`}
          />
        </span>
      </span>
    </>
  );
}
