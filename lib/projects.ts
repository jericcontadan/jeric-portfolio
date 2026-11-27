/** Projects section content (CLAUDE.md "Projects"). Rendered by components/Projects.tsx. */
export type Project = {
  slug: string;
  title: string;
  /** One-line pitch. */
  pitch: string;
  /** Jeric's role, with the team note for team projects. */
  role: string;
  tags: string[];
  /** 1280×800 (16:10) screenshot in /public. */
  image: string;
  imageAlt: string;
  github: string;
};

export const projects: Project[] = [
  {
    slug: "jean-rose",
    title: "Jean Rose POS & Inventory Platform",
    pitch:
      "Point of sale and inventory for a beauty-products retailer, with real-time stock tracking and automatic low-stock email alerts.",
    role: "Full Stack Developer, team project of 5",
    tags: [
      "Laravel",
      "PHP",
      "Blade",
      "Bootstrap 5",
      "MySQL",
      "Brevo Email API",
      "Microsoft Azure",
      "Figma",
      "Jira (Scrum)",
    ],
    image: "/projects/jean-rose.png",
    imageAlt:
      "Jean Rose cashier screen: product grid with stock badges beside an order summary with a near-expiry discount",
    github: "https://github.com/jericcontadan/Jean-Rose-POS-and-Inventory-Management-System_SAD",
  },
  {
    slug: "lechon-de-jay",
    title: "Lechon De Jay: Digital Transformation",
    pitch:
      "Took a local lechon business from client interviews to a tablet-first website with its menu, contact details and payment info.",
    role: "Project Leader",
    tags: ["HTML", "CSS", "JavaScript", "GitHub"],
    image: "/projects/lechon-de-jay.png",
    imageAlt:
      "Lechon De Jay home page: whole roast lechon banner, opening hours, and menu categories",
    github: "https://github.com/jericcontadan/Lechon-De-Jay-Website",
  },
];
