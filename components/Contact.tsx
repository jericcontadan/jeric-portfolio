import { site } from "@/lib/site";
import { cardClass } from "./cardClass";
import { ContactForm } from "./ContactForm";
import { CopyEmailButton } from "./CopyEmailButton";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./icons";
import { Section } from "./Section";

/**
 * The email card leads: violet border and a soft resting glow. It is not itself clickable (the
 * mailto link and Copy button inside are), so unlike cardClass it has no hover lift.
 */
const leadCard =
  "rounded-2xl border border-violet/40 bg-panel/70 shadow-[0_0_40px_-18px_rgb(109_74_255/0.8)]";

const iconTile =
  "grid size-12 shrink-0 place-items-center rounded-xl border border-violet/40 bg-violet/15 text-violet-soft";

/** Small "opens in a new tab" arrow: nudges up-right on hover (pointer devices, motion allowed). */
function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="ml-auto size-5 shrink-0 text-muted transition-[translate,color] duration-300 group-hover:text-violet-soft motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

// Short display values, not full URLs, so they fit on one line in the narrow side-by-side cards.
// LinkedIn shows the name: the profile slug (in site.linkedin) is not a handle people can type.
const profiles = [
  { label: "GitHub", value: "@jericcontadan", href: site.github, Icon: GitHubIcon },
  { label: "LinkedIn", value: site.name, href: site.linkedin, Icon: LinkedInIcon },
] as const;

// The address prefers to wrap before the "@" (<wbr>); break-words is only a last resort for a
// column too narrow for either part (e.g. very large text), so it never scrolls sideways.
const [emailUser, emailDomain] = site.email.split("@");

/**
 * Contact: a friendly invitation (left from 1024px) beside the ways to reach out (right). Email
 * is the lead card (large address, mailto link plus a Copy button); GitHub and LinkedIn sit side
 * by side beneath it (stacked at 1024–1279px, where the column is too narrow for two), then the
 * message form (ContactForm, saved to Supabase). Cards are dealt in from 3D space like the rest
 * of the site.
 */
export function Contact() {
  return (
    <Section id="contact" labelledBy="contact-heading" word="CONTACT">
      <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <div>
          {/* Same heading pattern as the other sections. Inline style: the unlayered global h2
              rule would beat layered utility classes. */}
          <h2
            id="contact-heading"
            className="text-base font-medium text-violet-soft"
            style={{ fontFamily: "var(--font-sans)", letterSpacing: "normal", lineHeight: 1.6 }}
          >
            Contact
          </h2>
          <p className="sweep mt-2 font-display text-4xl leading-[1.1] font-semibold tracking-[-0.02em] text-balance md:text-5xl">
            Let&apos;s build something together
          </p>
          <p className="mt-5 max-w-[36rem] text-base text-muted md:text-lg">
            Have a project in mind, an internship opening, or just a question about my work? My
            inbox is always open, and I&apos;d love to hear from you.
          </p>
        </div>

        {/* Shorter deal step: four cards (links + form) still land in about 1 s. */}
        <div className="[--deal-step:0.05s] [perspective:1200px]">
          <ul data-contact-links className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {/* Lead card: the email address is the one big thing in this section. */}
            <li data-deal="" style={{ "--i": 0 } as React.CSSProperties} className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <div
                className={`${leadCard} flex flex-col gap-5 p-6 sm:flex-row sm:items-center md:p-7`}
              >
                <a
                  href={`mailto:${site.email}`}
                  data-contact="email"
                  className="group flex min-h-11 min-w-0 flex-1 items-center gap-4 rounded-xl"
                >
                  <span aria-hidden="true" className={iconTile}>
                    <MailIcon className="size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base text-violet-soft">Email me</span>
                    <span className="block font-display text-xl leading-snug font-semibold break-words text-fg transition-colors group-hover:text-violet-light md:text-2xl lg:text-xl xl:text-2xl">
                      {emailUser}
                      <wbr />@{emailDomain}
                    </span>
                  </span>
                </a>
                <CopyEmailButton email={site.email} />
              </div>
            </li>

            {profiles.map(({ label, value, href, Icon }, i) => (
              <li key={label} data-deal="" style={{ "--i": i + 1 } as React.CSSProperties}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-contact={label.toLowerCase()}
                  aria-label={`${label}: ${value} (opens in a new tab)`}
                  title={href}
                  className={`${cardClass} group flex h-full min-h-11 items-center gap-4 p-6`}
                >
                  <span aria-hidden="true" className={iconTile}>
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold text-fg">{label}</span>
                    <span className="block text-base break-words text-muted">{value}</span>
                  </span>
                  <ExternalArrow />
                </a>
              </li>
            ))}
          </ul>
          {/* The form, dealt in after the three link cards. */}
          <div data-deal="" style={{ "--i": 3 } as React.CSSProperties} className="mt-5">
            <ContactForm />
          </div>
        </div>
      </div>
    </Section>
  );
}
