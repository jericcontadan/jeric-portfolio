import { Hero } from "@/components/Hero";
import { Section } from "@/components/Section";
import { StatsRow } from "@/components/StatCard";

// Step 0 skeleton: each section is filled in by its own build step.
export default function Home() {
  return (
    <>
      <Hero />
      <Section id="about" title="About">
        <StatsRow />
        <a
          href="/cv.pdf"
          download="Jeric-Contadan-CV.pdf"
          className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full border border-line px-7 font-medium text-fg transition-colors hover:border-violet-soft"
        >
          Download CV
        </a>
        <p className="mt-10 text-muted">Step 3.</p>
      </Section>
      <Section id="projects" title="Projects">
        <p className="text-muted">Step 4.</p>
      </Section>
      <Section id="experience" title="Experience">
        <p className="text-muted">Step 5.</p>
      </Section>
      <Section id="contact" title="Contact">
        <p className="text-muted">Step 6.</p>
      </Section>
    </>
  );
}
