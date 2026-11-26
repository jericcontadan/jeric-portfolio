import { skillGroups, type SkillIcon } from "@/lib/skills";

/** Line-icon paths (24×24, stroked) for skills without a Simple Icons logo. */
const linePaths: Record<Extract<SkillIcon, { line: string }>["line"], string> = {
  cloud: "M7 18h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.5 4.5 0 0 0 7 18Z",
  api: "M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16",
  database:
    "M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3Zm0 0v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3",
  layout: "M4 4h16v16H4zM4 9h16M9 9v11",
  check: "M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Zm-3.5 9 2.5 2.5 5-5",
};

function Logo({ icon }: { icon: SkillIcon }) {
  const cls = "size-5 shrink-0";
  if ("path" in icon)
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cls}>
        <path d={icon.path} />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cls}
    >
      <path d={linePaths[icon.line]} />
    </svg>
  );
}

/**
 * Tech stack: one row per group (name on the left from md, above on phones), each skill a
 * small card with a monochrome logo, so the violet accent stays the page's only color.
 */
export function TechStack() {
  return (
    <dl className="divide-y divide-line/70 border-y border-line/70">
      {skillGroups.map((g) => (
        <div key={g.title} className="grid gap-3 py-5 md:grid-cols-[12rem_1fr] md:gap-8 md:py-6">
          <dt className="pt-2 font-display text-lg font-medium text-fg">{g.title}</dt>
          <dd>
            <ul className="flex flex-wrap gap-2">
              {g.skills.map((s) => (
                <li
                  key={s.name}
                  className="inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-panel/70 px-3.5 py-2 text-base text-muted"
                >
                  <span className="text-fg/85">
                    <Logo icon={s.icon} />
                  </span>
                  {s.name}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
