/** Experience section content (CLAUDE.md "Education & Leadership", "Certificates"). Rendered by components/Experience.tsx. */
export type Education = {
  degree: string;
  school: string;
  details: string;
};

export type Role = {
  slug: string;
  role: string;
  project: string;
  summary: string;
};

export type Certificate = {
  slug: string;
  title: string;
  issuer: string;
  date: string;
  place: string;
  /** Full-size image in /public (1650×1275). */
  image: string;
  width: number;
  height: number;
  imageAlt: string;
};

export const education: Education = {
  degree: "BS Information Systems",
  school: "Technological University of the Philippines – Manila",
  details: "Section BSIS-3C · Expected 2028",
};

/** In display order. */
export const roles: Role[] = [
  {
    slug: "jean-rose",
    role: "Lead Full Stack Developer",
    project: "Jean Rose POS & Inventory Platform",
    summary:
      "Built the entire system: front end, back end, database, email API integration and cloud deployment.",
  },
  {
    slug: "lechon-de-jay",
    role: "Project Leader",
    project: "Lechon De Jay system and website",
    summary: "Led the project from client interviews to launch.",
  },
  {
    slug: "pinoycart",
    role: "Team Lead & Documentation Lead",
    project: "PinoyCart Security Risk Assessment",
    summary: "Led a security audit of an e-commerce platform.",
  },
];

export const certificates: Certificate[] = [
  {
    slug: "gdg-gtech-summit-2025",
    title: "Certificate of Participation: G-tech Summit 2025",
    issuer: "Google Developer Groups on Campus – TUP Manila",
    date: "February 28, 2025",
    place: "IRTC Conference Hall, TUP Manila",
    image: "/certificates/gdg-gtech-summit-2025.jpg",
    width: 1650,
    height: 1275,
    imageAlt:
      "Certificate of Participation awarded to Jeric Contadan for G-tech Summit 2025 by Google Developer Groups on Campus – TUP Manila",
  },
];
