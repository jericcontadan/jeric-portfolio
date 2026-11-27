import Image from "next/image";
import type { Project } from "@/lib/projects";
import { GitHubIcon } from "./icons";

/**
 * One project: screenshot, role, title, pitch, tech tags, GitHub link.
 * Hover (pointer devices only: Tailwind's `hover:` needs `(hover: hover)`) and keyboard focus
 * inside it (`:focus-visible`, so a tapped or clicked link doesn't leave the card stuck lifted)
 * lift the card and add a violet glow.
 * The whole screenshot always shows (object-contain in a 16:10 frame, no hover zoom).
 * Reduced motion keeps the glow, without the lift.
 */
export function ProjectCard({ project: p }: { project: Project }) {
  return (
    <article
      data-project={p.slug}
      aria-labelledby={`project-${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel/70 transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:border-violet/60 hover:shadow-[0_18px_48px_-14px_rgb(109_74_255/0.6)] has-[:focus-visible]:-translate-y-1.5 has-[:focus-visible]:border-violet/60 has-[:focus-visible]:shadow-[0_18px_48px_-14px_rgb(109_74_255/0.6)] motion-reduce:hover:translate-y-0 motion-reduce:has-[:focus-visible]:translate-y-0"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-ink">
        <Image
          src={p.image}
          alt={p.imageAlt}
          fill
          sizes="(min-width: 1280px) 560px, (min-width: 768px) 50vw, 100vw"
          className="object-contain"
        />
      </div>

      <div className="flex flex-1 flex-col p-6 md:p-7">
        <p className="text-base text-balance text-violet-soft">{p.role}</p>
        <h3
          id={`project-${p.slug}`}
          className="mt-2 font-display text-2xl leading-tight font-semibold text-balance text-fg"
        >
          {p.title}
        </h3>
        <p className="mt-3 text-base text-muted">{p.pitch}</p>

        <ul aria-label="Built with" className="mt-5 flex flex-wrap gap-2">
          {p.tags.map((t) => (
            <li
              key={t}
              className="rounded-lg border border-line bg-ink/60 px-2.5 py-0.5 text-base text-fg/80"
            >
              {t}
            </li>
          ))}
        </ul>

        {/* mt-auto pins the link to the bottom so side-by-side cards line up. */}
        <div className="mt-auto pt-6">
          <a
            href={p.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${p.title} code on GitHub (opens in a new tab)`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 font-medium text-fg transition-colors hover:border-violet-soft hover:text-violet-soft"
          >
            <GitHubIcon className="size-5" />
            View code on GitHub
          </a>
        </div>
      </div>
    </article>
  );
}
