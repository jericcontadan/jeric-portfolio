/**
 * Card surface shared by the Experience cards: same look, hover lift and glow as ProjectCard.
 * Hover only: nothing inside these cards takes focus (the focusable certificate link adds its
 * own focus styles).
 */
export const cardClass =
  "rounded-2xl border border-line bg-panel/70 transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-violet/60 hover:shadow-[0_18px_48px_-14px_rgb(109_74_255/0.6)] motion-reduce:hover:translate-y-0";
