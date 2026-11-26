import { site } from "@/lib/site";
import { ArrowUpIcon, GitHubIcon, LinkedInIcon, MailIcon } from "./icons";

const iconLink =
  "inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-panel hover:text-fg";

export function Footer() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex w-full max-w-site flex-col items-center gap-4 px-5 py-8 sm:flex-row md:px-8">
        <p className="text-muted sm:mr-auto">© 2026 {site.name}</p>
        <ul className="flex items-center gap-1">
          <li>
            <a href={site.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={iconLink}>
              <GitHubIcon />
            </a>
          </li>
          <li>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={iconLink}>
              <LinkedInIcon />
            </a>
          </li>
          <li>
            <a href={`mailto:${site.email}`} aria-label="Email" className={iconLink}>
              <MailIcon />
            </a>
          </li>
        </ul>
        <a
          href="#home"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-muted transition-colors hover:text-fg"
        >
          <ArrowUpIcon />
          Back to top
        </a>
      </div>
    </footer>
  );
}
