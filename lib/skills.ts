import { brandPaths } from "./brandIcons";

/**
 * A skill's logo: a Simple Icons brand path (24×24, filled), or one of our own line icons
 * for brands Simple Icons doesn't carry (Azure, Playwright) and for non-brand skills.
 */
export type SkillIcon = { path: string } | { line: "cloud" | "api" | "database" | "layout" | "check" };

export type Skill = { name: string; icon: SkillIcon };
export type SkillGroup = { title: string; skills: Skill[] };

const si = (name: keyof typeof brandPaths): SkillIcon => ({ path: brandPaths[name] });

/** Tech stack groups (CLAUDE.md "Skills"). Rendered by components/TechStack.tsx (server only). */
export const skillGroups: SkillGroup[] = [
  {
    title: "Front end",
    skills: [
      { name: "Next.js", icon: si("nextdotjs") },
      { name: "React", icon: si("react") },
      { name: "TypeScript", icon: si("typescript") },
      { name: "Tailwind CSS", icon: si("tailwindcss") },
      { name: "Three.js / React Three Fiber", icon: si("threedotjs") },
      { name: "GSAP", icon: si("gsap") },
    ],
  },
  {
    title: "Back end & data",
    skills: [
      { name: "Supabase (PostgreSQL)", icon: si("supabase") },
      { name: "REST APIs", icon: { line: "api" } },
      { name: "Relational database design", icon: { line: "database" } },
    ],
  },
  {
    title: "Cloud",
    skills: [
      { name: "Vercel", icon: si("vercel") },
      { name: "Microsoft Azure", icon: { line: "cloud" } },
    ],
  },
  {
    title: "AI development",
    skills: [
      { name: "Claude Code", icon: si("claude") },
      { name: "MCP integrations", icon: si("modelcontextprotocol") },
    ],
  },
  {
    title: "Design",
    skills: [
      { name: "Figma", icon: si("figma") },
      { name: "UI/UX", icon: { line: "layout" } },
    ],
  },
  {
    title: "Workflow",
    skills: [
      { name: "Git & GitHub", icon: si("github") },
      { name: "Jira (Scrum)", icon: si("jira") },
      { name: "Playwright", icon: { line: "check" } },
    ],
  },
];
