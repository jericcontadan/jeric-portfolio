import { site } from "@/lib/site";
import { ProfileReveal } from "./ProfileReveal";
import { Section } from "./Section";
import { StatsRow } from "./StatCard";
import { TechStack } from "./TechStack";

/**
 * About: photo (with the hover/drag reveal) beside the bio from 1024px, stacked photo-first
 * below that; Download CV and the stats sit with the bio; the tech stack spans full width.
 */
export function About() {
  return (
    <Section id="about" labelledBy="about-heading" word="ABOUT">
      <div className="grid items-center gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <ProfileReveal />

        <div>
          {/* The h2 names the section "About me" (matches the nav); the name is the visual lead. */}
          {/* Inline style: the unlayered global h2 rule would beat layered utility classes. */}
          <h2
            id="about-heading"
            className="text-base font-medium text-violet-soft"
            style={{ fontFamily: "var(--font-sans)", letterSpacing: "normal", lineHeight: 1.6 }}
          >
            About me
          </h2>
          <p className="sweep mt-2 font-display text-4xl leading-[1.1] font-semibold tracking-[-0.02em] text-balance md:text-5xl">
            {site.name}
          </p>
          <p className="mt-3 text-lg text-fg/80">{site.role}</p>
          <p className="mt-6 max-w-[40rem] text-base text-muted md:text-lg">
            I&apos;m a BS Information Systems student at the Technological University of the
            Philippines – Manila who turns real business problems into working web systems.
            I&apos;ve led teams through the whole build: interviewing clients, designing databases,
            prototyping in Figma, and shipping web apps to the cloud. I build fast with modern AI
            tools, but I care about the fundamentals: clean data, usable interfaces, and secure
            systems.
          </p>
          <a
            href="/cv.pdf"
            download="Jeric-Contadan-CV.pdf"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet px-7 font-medium text-white shadow-[0_0_28px_-4px_rgb(109_74_255/0.7)] transition-[background-color,box-shadow] hover:bg-violet-hover hover:shadow-[0_0_36px_-2px_rgb(109_74_255/0.85)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4"
            >
              <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" />
            </svg>
            Download CV
          </a>
          <div className="mt-10">
            <StatsRow />
          </div>
        </div>
      </div>

      <h3 className="mt-20 mb-6 text-2xl font-semibold md:mt-24 md:text-3xl">Tech stack</h3>
      <TechStack />
    </Section>
  );
}
