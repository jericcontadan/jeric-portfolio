import { BgWord } from "./BgWord";

type SectionProps = {
  id: string;
  title?: string;
  className?: string;
  /** Vertical padding classes; override instead of fighting the default via className. */
  pad?: string;
  /** id of a heading inside children that names the section (when no `title`). */
  labelledBy?: string;
  /** Giant outlined word drawn behind the section (decorative). */
  word?: string;
  /** Content flies in from deep space when the section enters the screen (default on). */
  fly?: boolean;
  children?: React.ReactNode;
};

/** Page section: anchor id, ~1200px content width, generous vertical rhythm. */
export function Section({
  id,
  title,
  className = "",
  pad = "py-20 md:py-28",
  labelledBy,
  word,
  fly = true,
  children,
}: SectionProps) {
  const headingId = title ? `${id}-heading` : labelledBy;
  return (
    // tabIndex -1: nav links can move focus here (not in the Tab order).
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      // overflow-x clip (not a scroll container): fly-in and dealt cards tilt in 3D past the
      // screen edge mid-flight, which must never cause horizontal scrolling.
      className={`relative isolate outline-none ${fly ? "fly-clip" : ""} ${pad} ${className}`}
    >
      {word && <BgWord text={word} />}
      {/* Deep-space exit (globals.css): this wrapper recedes as the section leaves the top of the
          screen. Its own element, so it never fights the fly-in on [data-fly] below. */}
      <div data-exit={fly ? "" : undefined}>
        {/* perspective: the fly-in's tilt (rotateX) reads as depth. */}
        <div
          className={`mx-auto w-full max-w-site px-5 md:px-8 ${fly ? "[perspective:1200px]" : ""}`}
        >
          <div data-fly={fly ? "" : undefined}>
            {title && (
              <h2 id={headingId} className="sweep mb-10 text-3xl font-semibold md:text-4xl">
                {title}
              </h2>
            )}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
