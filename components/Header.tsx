"use client";

import { useEffect, useRef } from "react";
import { nav, site } from "@/lib/site";
import { useMenu } from "./MenuContext";
import { useActiveSection } from "./useActiveSection";

const linkClass =
  "inline-flex min-h-11 items-center rounded-full px-4 text-muted transition-colors hover:text-fg";

const sectionIds = nav.map((item) => item.href.slice(1));

/** Where focus goes when the menu closes: the toggle, a section (by #hash), or nowhere. */
type FocusTarget = "toggle" | `#${string}` | null;

export function Header() {
  const { menuOpen, setMenuOpen } = useMenu();
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusAfterClose = useRef<FocusTarget>(null);
  const active = useActiveSection(sectionIds);

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
        // Transparent, exactly h-16 (hero and menu offsets rely on it); the glass pill floats inside.
        className="pointer-events-none sticky top-0 z-50 flex h-16 items-center px-3 md:px-8"
      >
        <div className="pointer-events-auto mx-auto flex w-full items-center gap-1 rounded-full border border-line/70 bg-panel/85 p-1 pl-4 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.7),inset_0_1px_0_0_rgb(255_255_255/0.05)] backdrop-blur-md md:w-fit md:pl-5">
          <a
            href="#home"
            onClick={onNavClick}
            className="mr-auto inline-flex min-h-11 items-center font-display text-base font-semibold tracking-tight md:mr-3"
          >
            {site.name}
          </a>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center">
              {nav
                .filter((item) => item.href !== "#contact")
                .map((item) => {
                  const current = active === item.href.slice(1);
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        aria-current={current ? "location" : undefined}
                        className={`${linkClass} ${current ? "bg-violet/20 text-fg" : ""}`}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                })}
            </ul>
          </nav>

          {/* Contact stays one tap away at every width. */}
          <a
            href="#contact"
            onClick={onNavClick}
            aria-current={active === "contact" ? "location" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full bg-violet px-5 font-medium text-white transition-[background-color,box-shadow] hover:bg-violet/85 md:ml-2 ${
              active === "contact" ? "shadow-[0_0_0_3px_rgb(166_140_255/0.35)]" : ""
            }`}
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
            className="inline-flex size-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-white/5 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="size-6">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu: fixed under the header, above everything else (incl. the 3D canvas).
          Rendered outside <header> because backdrop-blur would make the pill its containing block.
          Tapping the dimmed backdrop closes it. */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!menuOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeMenu("toggle");
        }}
        className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto overscroll-contain bg-ink/75 px-3 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden"
      >
        <nav
          aria-label="Mobile"
          className="rounded-[1.75rem] border border-line/70 bg-panel p-2 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]"
        >
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const current = active === item.href.slice(1);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={onNavClick}
                    aria-current={current ? "location" : undefined}
                    className={`flex min-h-14 items-center rounded-full px-5 font-display text-xl font-medium transition-colors ${
                      current ? "bg-violet/20 text-fg" : "text-muted hover:bg-white/5 hover:text-fg"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
