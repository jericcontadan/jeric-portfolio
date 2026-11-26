type SectionProps = {
  id: string;
  title?: string;
  className?: string;
  /** Vertical padding classes; override instead of fighting the default via className. */
  pad?: string;
  /** id of a heading inside children that names the section (when no `title`). */
  labelledBy?: string;
  children?: React.ReactNode;
};

/** Page section: anchor id, ~1200px content width, generous vertical rhythm. */
export function Section({
  id,
  title,
  className = "",
  pad = "py-20 md:py-28",
  labelledBy,
  children,
}: SectionProps) {
  const headingId = title ? `${id}-heading` : labelledBy;
  return (
    // tabIndex -1: nav links can move focus here (not in the Tab order).
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={`outline-none ${pad} ${className}`}
    >
      <div className="mx-auto w-full max-w-site px-5 md:px-8">
        {title && (
          <h2 id={headingId} className="mb-10 text-3xl font-semibold md:text-4xl">
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}
