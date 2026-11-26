"use client";

import { createContext, useContext, useMemo, useState } from "react";

type MenuState = { menuOpen: boolean; setMenuOpen: (open: boolean) => void };

const MenuContext = createContext<MenuState | null>(null);

/** Shares mobile-menu state so the 3D lanyard (Step 2) can pause while it's open. */
export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const value = useMemo(() => ({ menuOpen, setMenuOpen }), [menuOpen]);
  return <MenuContext value={value}>{children}</MenuContext>;
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used inside <MenuProvider>");
  return ctx;
}
