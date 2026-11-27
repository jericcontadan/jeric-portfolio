"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { Certificate } from "@/lib/experience";
import { cardClass } from "./cardClass";

/**
 * Certificate thumbnail card that opens the full-size image in a lightbox.
 * The thumbnail is a plain link to the image, so without JavaScript it still opens it.
 * With JavaScript it opens a native modal <dialog> (top layer: above the header and the 3D
 * canvas, untouched by the section's fly-in transform). Esc, a tap outside the image or the
 * close button closes it, and focus goes back to the thumbnail (set by hand: Safari doesn't
 * focus a tapped link, so the dialog would otherwise have nothing to return focus to).
 * The thumbnail's focus ring is for keyboard users only. Browsers disagree on whether
 * :focus-visible matches after a scripted focus, so the close marks the link
 * data-return-focus="key" (ring) or "pointer" (no ring) until the next key press or blur,
 * after which plain :focus-visible applies again.
 * The full-size image is only requested on the first open.
 */
/**
 * Keyboard focus on the thumbnail: ring, lift and glow (like ProjectCard), on plain
 * :focus-visible, or while data-return-focus="key" says a keyboard close just returned focus.
 */
const keyboardFocus = [
  "focus-visible:not-data-return-focus:ring-2",
  "focus-visible:not-data-return-focus:-translate-y-1",
  "focus-visible:not-data-return-focus:border-violet/60",
  "focus-visible:not-data-return-focus:shadow-[0_18px_48px_-14px_rgb(109_74_255/0.6)]",
  "data-[return-focus=key]:focus:ring-2",
  "data-[return-focus=key]:focus:-translate-y-1",
  "data-[return-focus=key]:focus:border-violet/60",
  "data-[return-focus=key]:focus:shadow-[0_18px_48px_-14px_rgb(109_74_255/0.6)]",
  "motion-reduce:translate-y-0!", // beats the data-attribute lift too (higher specificity)
].join(" ");

export function CertificateCard({ certificate: c }: { certificate: Certificate }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [opened, setOpened] = useState(false);
  // How the open dialog is being closed: true for a tap/click, false for the keyboard.
  const closedByPointer = useRef(false);
  // Where the last press began: a press that starts on the image and is released on the
  // padding still clicks the dialog itself, and must not close it.
  const pressedOnBackdrop = useRef(false);

  const open = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new tab, etc.) behave like a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const dialog = dialogRef.current;
    if (!dialog?.showModal) return; // very old browser: follow the link
    e.preventDefault();
    setOpened(true);
    const root = document.documentElement;
    root.style.setProperty("--scrollbar-w", `${window.innerWidth - root.clientWidth}px`);
    dialog.showModal();
  };

  const close = (byPointer: boolean) => {
    closedByPointer.current = byPointer;
    dialogRef.current?.close();
  };

  const onClose = () => {
    const link = linkRef.current;
    if (!link) return;
    link.dataset.returnFocus = closedByPointer.current ? "pointer" : "key";
    closedByPointer.current = false;
    link.focus({ preventScroll: true });
  };

  const clearReturnFocus = () => {
    if (linkRef.current) delete linkRef.current.dataset.returnFocus;
  };

  return (
    <>
      <a
        ref={linkRef}
        href={c.image}
        onClick={open}
        onKeyDown={clearReturnFocus}
        onBlur={clearReturnFocus}
        data-certificate={c.slug}
        aria-label={`${c.title}: view full size`}
        className={`${cardClass} group block overflow-hidden outline-none ring-violet-soft ${keyboardFocus}`}
      >
        <div className="relative aspect-[1650/1275] overflow-hidden border-b border-line bg-ink">
          <Image
            src={c.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 460px, (min-width: 768px) 700px, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          />
          <span
            aria-hidden="true"
            className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/80 px-3 py-1 text-base text-fg backdrop-blur-sm"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            View full size
          </span>
        </div>
        <div className="p-6">
          <p className="font-display text-lg leading-snug font-semibold text-balance text-fg">
            {c.title}
          </p>
          <p className="mt-2 text-base text-violet-soft">{c.issuer}</p>
          <p className="mt-1 text-base text-muted">
            {c.date} · {c.place}
          </p>
        </div>
      </a>

      <dialog
        ref={dialogRef}
        aria-label={c.title}
        // A click on the dialog itself (not the image or button) is a tap outside the image.
        onPointerDown={(e) => {
          pressedOnBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && pressedOnBackdrop.current) close(true);
          pressedOnBackdrop.current = false;
        }}
        // Esc (the browser closes the dialog itself; closedByPointer stays false).
        onClose={onClose}
        className="lightbox"
      >
        <button
          type="button"
          // detail 0: activated with Enter or Space, not a tap or click.
          onClick={(e) => close(e.detail > 0)}
          aria-label="Close certificate"
          autoFocus
          className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-line bg-ink/85 text-fg transition-colors hover:border-violet-soft hover:text-violet-soft focus-visible:ring-2 focus-visible:ring-violet-soft focus-visible:outline-none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="size-5"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {opened && (
          <Image
            src={c.image}
            alt={c.imageAlt}
            width={c.width}
            height={c.height}
            sizes="(min-width: 1400px) 1400px, 92vw"
            className="lightbox-img"
          />
        )}
      </dialog>
    </>
  );
}
