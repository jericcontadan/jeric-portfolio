"use client";

import { useEffect, useRef } from "react";
import { nav, site } from "@/lib/site";
import { useMenu } from "./MenuContext";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md px-3 text-muted transition-colors hover:text-fg";

/** Where focus goes when the menu closes: the toggle, a section (by #hash), or nowhere. */
type FocusTarget = "toggle" | `#${string}` | null;

export function Header() {
  const { menuOpen, setMenuOpen } = useMenu();
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusAfterClose = useRef<FocusTarget>(null);

  const closeMenu = (target: FocusTarget) => {
    focusAfterClose.current = target;
    setMenuOpen(false);
  };

  /** Any in-page link: if the menu is open, close it and move focus to the chosen section. */
  const onNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (menuOpen) closeMenu(e.currentTarget.getAttribute("href") as `#${string}`);
  };

  // While the menu is open: lock page scroll, close on Esc, keep Tab inside header + menu.
  useEffect(() => {
    if (!menuOpen) return;
    const toggle = toggleRef.current;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    focusAfterClose.current = null;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        focusAfterClose.current = "toggle";
        setMenuOpen(false);
        return;
      }
      if (e.key !== "Tab" || !headerRef.current || !panelRef.current) return;
      const focusables = [
        ...headerRef.current.querySelectorAll<HTMLElement>("a, button"),
        ...panelRef.current.querySelectorAll<HTMLElement>("a"),
      ].filter((el) => el.offsetParent !== null);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      const target = focusAfterClose.current;
      if (target === "toggle") toggle?.focus();
      else if (target) document.getElementById(target.slice(1))?.focus({ preventScroll: true });
    };
  }, [menuOpen, setMenuOpen]);

  // Close the mobile menu if the viewport grows past the breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (!mq.matches) return;
      focusAfterClose.current = null;
      setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setMenuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        // 1px divider as a shadow so the header is exactly h-16 (hero and menu offsets rely on it)
        className="sticky top-0 z-50 bg-ink/80 shadow-[0_1px_0_0_rgb(35_48_90/0.6)] backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 w-full max-w-site items-center gap-2 px-5 md:px-8">
          <a
            href="#home"
            onClick={onNavClick}
            className="mr-auto inline-flex min-h-11 items-center font-display text-lg font-semibold tracking-tight"
          >
            {site.name}
          </a>
  
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {nav
                .filter((item) => item.href !== "#contact")
                .map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className={linkClass}>
                      {item.label}
                    </a>
                  </li>
                ))}
            </ul>
          </nav>
  
          {/* Contact stays one tap away at every width. */}
          <a
            href="#contact"
            onClick={onNavClick}
            className="inline-flex min-h-11 items-center rounded-full bg-violet px-5 font-medium text-white transition-colors hover:bg-violet/85 md:ml-3"
          >
            Contact
          </a>
  
          <button
            ref={toggleRef}
            type="button"
            onClick={() => (menuOpen ? closeMenu("toggle") : setMenuOpen(true))}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-fg md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="size-6">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu: fixed under the header, above everything else (incl. the 3D canvas).
          Rendered outside <header> because backdrop-blur would make the header its containing block. */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!menuOpen}
        className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto overscroll-contain bg-ink px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <nav aria-label="Mobile">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href} className="border-b border-line/60">
                <a
                  href={item.href}
                  onClick={onNavClick}
                  className="flex min-h-14 items-center font-display text-2xl font-medium"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
