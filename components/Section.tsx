type SectionProps = {
  id: string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
};

/** Page section: anchor id, ~1200px content width, generous vertical rhythm. */
export function Section({ id, title, className = "", children }: SectionProps) {
  const headingId = title ? `${id}-heading` : undefined;
  return (
    // tabIndex -1: nav links can move focus here (not in the Tab order).
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={`py-20 outline-none md:py-28 ${className}`}
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
