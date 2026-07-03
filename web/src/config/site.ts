export const siteConfig = {
  name: "ArchCalc",
  description:
    "A fast, lightweight, and extensible desktop calculator built with Rust, Tauri, and SolidJS.",
  links: {
    github: "https://github.com/murtazapatel89100/ArchCalc",
    docs: "/docs",
    privacy: "/privacy",
    terms: "/terms",
  },
  // GitHub does not expose AUR download counts, so this is a manually
  // maintained estimate that gets added to the GitHub asset download total.
  stats: {
    aurDownloads: 1000,
  },
  nav: [
    {
      name: "Documentation",
      href: "/docs",
    },
  ],
  sidebar: [
    { name: "Introduction", href: "/docs" },
    { name: "Getting Started", href: "/docs/getting-started" },
    { name: "Architecture", href: "/docs/architecture" },
  ],
};
