export interface ExportTemplate {
  id: string;
  name: string;
  /** Header band behind the business name. */
  bandBg: string;
  bandText: string;
  /** Headings, table header row, total row. */
  accent: string;
  accentText: string;
  /** Alternate table rows. */
  stripe: string;
  border: string;
  text: string;
  muted: string;
}

export const templates: ExportTemplate[] = [
  {
    id: "classic",
    name: "Classic Navy",
    bandBg: "#1E3A8A",
    bandText: "#FFFFFF",
    accent: "#1E40AF",
    accentText: "#FFFFFF",
    stripe: "#EFF4FF",
    border: "#C7D2FE",
    text: "#111827",
    muted: "#6B7280",
  },
  {
    id: "minimal",
    name: "Minimal Mono",
    bandBg: "#FFFFFF",
    bandText: "#111111",
    accent: "#111111",
    accentText: "#FFFFFF",
    stripe: "#F5F5F5",
    border: "#D4D4D4",
    text: "#171717",
    muted: "#737373",
  },
  {
    id: "emerald",
    name: "Emerald",
    bandBg: "#065F46",
    bandText: "#ECFDF5",
    accent: "#059669",
    accentText: "#FFFFFF",
    stripe: "#ECFDF5",
    border: "#A7F3D0",
    text: "#064E3B",
    muted: "#6B7280",
  },
  {
    id: "sunset",
    name: "Sunset",
    bandBg: "#C2410C",
    bandText: "#FFF7ED",
    accent: "#E11D48",
    accentText: "#FFFFFF",
    stripe: "#FFF1F2",
    border: "#FECDD3",
    text: "#3F1D1D",
    muted: "#9A6B6B",
  },
  {
    id: "midnight",
    name: "Midnight",
    bandBg: "#0F172A",
    bandText: "#E0F2FE",
    accent: "#0EA5E9",
    accentText: "#FFFFFF",
    stripe: "#F0F9FF",
    border: "#BAE6FD",
    text: "#0F172A",
    muted: "#64748B",
  },
];

export const getTemplate = (id: string) =>
  templates.find((t) => t.id === id) ?? templates[0];
