import { site } from "@/lib/site";
import { ArrowRightIcon, GitHubIcon, LinkedInIcon, MailIcon, SendIcon } from "./icons";
import { HeroStage } from "./lanyard/HeroStage";
import { Section } from "./Section";
import { TypedRole } from "./TypedRole";

const button =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 font-medium transition-[background-color,border-color,box-shadow]";
const socialLink =
  "inline-flex size-11 items-center justify-center rounded-xl border border-line bg-panel/60 text-muted transition-colors hover:border-violet-soft hover:text-fg";

const socials = [
  { href: site.github, label: "GitHub", Icon: GitHubIcon, external: true },
  { href: site.linkedin, label: "LinkedIn", Icon: LinkedInIcon, external: true },
  { href: `mailto:${site.email}`, label: "Email", Icon: MailIcon, external: false },
] as const;

export function Hero() {
  return (
    <Section id="home" labelledBy="hero-heading" pad="pt-10 pb-20 lg:py-0" className="@container">
      <HeroStage>
        <div className="lg:py-24">
          <h1
            id="hero-heading"
            className="text-[clamp(2.5rem,8vw,4.5rem)] leading-[1.05] font-bold"
          >
            {/* Gradient line with a soft glow. drop-shadow (not text-shadow) works on clipped
                text; pb keeps WebKit from clipping the glyph bottoms. */}
            <span className="block w-fit bg-linear-to-r from-violet-bright to-violet-light bg-clip-text pb-[0.08em] text-transparent [-webkit-text-fill-color:transparent] [filter:drop-shadow(0_0_28px_rgb(166_140_255/0.45))]">
              Welcome to
            </span>{" "}
            <span className="block text-fg">My Portfolio</span>
          </h1>
          <p className="mt-4 text-xl font-medium text-violet-soft md:text-2xl">
            <TypedRole />
          </p>
          <p className="mt-6 max-w-[35rem] text-base text-muted md:text-lg">
            I&apos;m Jeric, an Information Systems student who loves turning real business problems
            into working web apps. From planning with clients to designing databases and building
            clean interfaces, I enjoy every step of creating something people actually use, and
            I&apos;m always learning new tools to build it better.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#projects"
              className={`${button} bg-violet text-white shadow-[0_0_28px_-4px_rgb(109_74_255/0.7)] hover:bg-violet-hover hover:shadow-[0_0_36px_-2px_rgb(109_74_255/0.85)]`}
            >
              View Projects
              <ArrowRightIcon className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
            </a>
            <a
              href="#contact"
              className={`${button} border border-line bg-panel/60 text-fg hover:border-violet-soft`}
            >
              Contact me
              <SendIcon className="size-4" />
            </a>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-violet-soft uppercase">
              Find me
            </p>
            <ul className="flex gap-2">
              {socials.map(({ href, label, Icon, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    className={socialLink}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </HeroStage>
    </Section>
  );
}
