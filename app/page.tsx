import { About } from "@/components/About";
import { Experience } from "@/components/Experience";
import { Hero } from "@/components/Hero";
import { Projects } from "@/components/Projects";
import { Section } from "@/components/Section";

// Each section is filled in by its own build step.
export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Projects />
      <Experience />
      <Section id="contact" title="Contact" word="CONTACT">
        <p className="text-muted">Step 6.</p>
      </Section>
    </>
  );
}
