import { certificates, education, roles } from "@/lib/experience";
import { cardClass } from "./cardClass";
import { CertificateCard } from "./CertificateCard";
import { Section } from "./Section";

const subheading = "font-display text-xl font-semibold text-fg";

/**
 * Experience: education and a leadership timeline (left from 1024px), certificates (right).
 * Every card is dealt in from 3D space ([data-deal], one after another), like the project cards.
 */
export function Experience() {
  return (
    <Section id="experience" labelledBy="experience-heading" word="EXPERIENCE">
      {/* Same heading pattern as About and Projects. Inline style: the unlayered global h2
          rule would beat layered utility classes. */}
      <h2
        id="experience-heading"
        className="text-base font-medium text-violet-soft"
        style={{ fontFamily: "var(--font-sans)", letterSpacing: "normal", lineHeight: 1.6 }}
      >
        Experience
      </h2>
      <p className="sweep mt-2 font-display text-4xl leading-[1.1] font-semibold tracking-[-0.02em] text-balance md:text-5xl">
        Education &amp; leadership
      </p>
      <p className="mt-4 max-w-[40rem] text-base text-muted md:text-lg">
        Where I study, and the teams I&apos;ve led from first interview to final hand-off.
      </p>

      {/* Five cards: a 0.05 s deal step lands the last one ~1.1 s in (Projects: 2 × 0.15 s). */}
      <div className="mt-12 grid gap-12 [--deal-step:0.05s] [perspective:1200px] lg:grid-cols-[7fr_5fr] lg:gap-10">
        <div>
          <h3 className={subheading}>Education</h3>
          <div data-deal="" style={{ "--i": 0 } as React.CSSProperties} className="mt-5">
            <article data-education="" className={`${cardClass} flex gap-4 p-6 md:p-7`}>
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-xl border border-violet/40 bg-violet/15 text-violet-soft"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-6"
                >
                  <path d="M2 9.5 12 5l10 4.5-10 4.5L2 9.5Z" />
                  <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5M22 9.5V15" />
                </svg>
              </span>
              <div>
                <h4 className="font-display text-xl leading-tight font-semibold text-balance text-fg md:text-2xl">
                  {education.degree}
                </h4>
                <p className="mt-1.5 text-base text-fg/85">{education.school}</p>
                <p className="mt-1 text-base text-violet-soft">{education.details}</p>
              </div>
            </article>
          </div>

          <h3 className={`${subheading} mt-12`}>Leadership &amp; roles</h3>
          {/* Timeline: a faint violet rail with a glowing dot beside each card. */}
          <ol className="relative mt-5 space-y-5 border-l border-violet/30 pl-6 md:pl-8">
            {roles.map((r, i) => (
              <li
                key={r.slug}
                data-deal=""
                style={{ "--i": i + 1 } as React.CSSProperties}
                className="relative"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-7 -left-[calc(1.5rem+5px)] size-2.5 rounded-full bg-violet-soft shadow-[0_0_0_4px_rgb(109_74_255/0.25),0_0_14px_rgb(166_140_255/0.9)] md:-left-[calc(2rem+5px)]"
                />
                <article data-role={r.slug} className={`${cardClass} p-6 md:p-7`}>
                  <p className="text-base text-violet-soft">{r.role}</p>
                  <h4 className="mt-1.5 font-display text-xl leading-tight font-semibold text-balance text-fg">
                    {r.project}
                  </h4>
                  <p className="mt-2 text-base text-muted">{r.summary}</p>
                </article>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className={subheading}>Certificates</h3>
          <div className="mt-5 grid gap-5">
            {certificates.map((c, i) => (
              <div
                key={c.slug}
                data-deal=""
                style={{ "--i": roles.length + 1 + i } as React.CSSProperties}
              >
                <CertificateCard certificate={c} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
