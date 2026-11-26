export const site = {
  name: "Jeric Contadan",
  role: "Full Stack Developer & UI Designer",
  email: "jericcontadan6@gmail.com",
  github: "https://github.com/jericcontadan",
  linkedin: "https://www.linkedin.com/in/jeric-contadan-aa6484452/",
} as const;

export const nav = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
] as const;

/** About-section highlights (StatCard). */
export const stats = [
  { value: 5, label: "Projects" },
  { value: 1, label: "Certificates" },
  { value: 2, label: "Teams Led" },
] as const;
