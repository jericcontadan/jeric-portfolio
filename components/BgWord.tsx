/**
 * Giant outlined word behind a section (decorative). It drifts sideways as the section scrolls
 * through the screen (a CSS scroll-driven animation, so no JavaScript runs per frame); browsers
 * without scroll timelines, and reduced motion, show it still. Styles: .bg-word in globals.css.
 */
export function BgWord({ text }: { text: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-clip">
      <span className="bg-word">{text}</span>
    </div>
  );
}
