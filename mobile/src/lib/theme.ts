// Brand tokens transcribed from web/src/app/globals.css (:root). Kept as a plain, mobile-local
// file per project convention — web and mobile do not share an npm package, so these values are
// copied, not imported, and must be updated by hand if the web palette changes.
export const colors = {
  brandTeal: "#0f4c5c",
  brandTealDark: "#0b3a46",
  brandCoral: "#f2703c",
  brandCoralDark: "#d85a2a",
  brandBg: "#faf5ee",

  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  border: "#e2e8f0",
  card: "#ffffff",

  destructive: "#dc2626",
  destructiveBg: "#fef2f2",
  success: "#16a34a",
  successBg: "#f0fdf4",
  warning: "#d97706",
  warningBg: "#fffbeb",
  warningBorder: "#fcd34d",
} as const;

export const radius = { sm: 8, md: 10, lg: 14, xl: 18, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const fontSize = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 18, xxl: 22 } as const;
