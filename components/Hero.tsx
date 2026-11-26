import { site } from "@/lib/site";
import { GitHubIcon, LinkedInIcon } from "./icons";
import { HeroStage } from "./lanyard/HeroStage";
import { Section } from "./Section";

const iconLink =
  "inline-flex size-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-violet-soft hover:text-fg";

export function Hero() {
  return (
    <Section id="home" labelledBy="hero-heading" pad="pt-10 pb-20 lg:py-0" className="@container">
      <HeroStage>
        <div className="lg:py-24">
          <p className="text-sm font-medium tracking-[0.14em] text-violet-soft">
            FULL STACK DEVELOPER · MANILA
          </p>
          <h1
            id="hero-heading"
            className="mt-4 text-[clamp(2.5rem,7vw,4.5rem)] font-semibold"
          >
            Hi, I&apos;m Jeric Contadan
          </h1>
          <p className="mt-6 max-w-[34ch] text-lg text-muted md:text-xl">
            I build modern web apps and business systems, from first client meeting to deployment.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#projects"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-violet px-7 font-medium text-white transition-colors hover:bg-violet/85"
            >
              View Projects
            </a>
            <a
              href="/cv.pdf"
              download="Jeric-Contadan-CV.pdf"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-7 font-medium text-fg transition-colors hover:border-violet-soft"
            >
              Download CV
            </a>
            <div className="flex gap-2 pt-2 sm:ml-2 sm:pt-0">
              <a href={site.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={iconLink}>
                <GitHubIcon />
              </a>
              <a href={site.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={iconLink}>
                <LinkedInIcon />
              </a>
            </div>
          </div>
        </div>

      </HeroStage>
    </Section>
  );
}
