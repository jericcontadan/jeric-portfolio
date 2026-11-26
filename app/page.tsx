import { Hero } from "@/components/Hero";
import { Section } from "@/components/Section";

// Step 0 skeleton: each section is filled in by its own build step.
export default function Home() {
  return (
    <>
      <Hero />
      <Section id="about" title="About">
        <p className="text-muted">Step 3.</p>
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
