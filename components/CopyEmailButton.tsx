"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fallback copy for browsers without the Clipboard API (or that refuse it): select the text in
 * a temporary textarea and run execCommand("copy"). iOS only selects an on-screen, editable
 * field via setSelectionRange, so the field sits at the top-left (invisible) and stays editable
 * while selecting. Must run inside the tap (no await before it).
 */
function copyWithSelection(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px";
  document.body.appendChild(ta);
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/**
 * "Copy" button for the email card: mailto does nothing on a desktop without a mail app, so the
 * address can be copied in one tap. The visible label confirms ("Copied") for 2 s; a separate
 * live region announces the result once (the button's own name stays "Copy email address").
 */
export function CopyEmailButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [announce, setAnnounce] = useState("");
  const timer = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const done = (ok: boolean) => {
    if (!mounted.current) return;
    setState(ok ? "copied" : "failed");
    setAnnounce(ok ? "Email address copied" : "Couldn't copy. Select the address to copy it.");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setState("idle");
      setAnnounce("");
    }, 2000);
  };

  const onClick = () => {
    // Decide synchronously, inside the tap: the selection fallback needs the user gesture.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(email).then(
        () => done(true),
        () => done(copyWithSelection(email)),
      );
    } else {
      done(copyWithSelection(email));
    }
  };

  const label = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        data-copy-email
        aria-label="Copy email address"
        className="inline-flex min-h-11 min-w-[6.5rem] shrink-0 items-center justify-center gap-2 rounded-full border border-violet/50 bg-violet/10 px-4 text-base font-medium text-violet-soft transition-colors hover:border-violet-soft hover:bg-violet/20"
      >
        {state === "copied" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
            <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
            <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
          </svg>
        )}
        <span data-copy-status>{label}</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </>
  );
}
