import { projects } from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";
import { Section } from "./Section";

/** Projects: stacked cards on phones, two side by side from 768px. */
export function Projects() {
  return (
    <Section id="projects" labelledBy="projects-heading">
      {/* Same heading pattern as About: the h2 matches the nav, the display line leads. */}
      {/* Inline style: the unlayered global h2 rule would beat layered utility classes. */}
      <h2
        id="projects-heading"
        className="text-base font-medium text-violet-soft"
        style={{ fontFamily: "var(--font-sans)", letterSpacing: "normal", lineHeight: 1.6 }}
      >
        Projects
      </h2>
      <p className="mt-2 font-display text-4xl leading-[1.1] font-semibold tracking-[-0.02em] text-balance md:text-5xl">
        Built for real clients
      </p>
      <p className="mt-4 max-w-[40rem] text-base text-muted md:text-lg">
        Systems made with and for real businesses: from interviews and requirements to a
        working app.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </Section>
  );
}
