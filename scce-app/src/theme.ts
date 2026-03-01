/**
 * THEME – tokens de color para SCCE.
 * Uso: themeColor("key") en estilos. Sin hex hardcodeados en UI.
 */
export const THEME = {
  // Tema claro actual
  bgApp: "#f5f7fa",
  bgSurface: "#ffffff",
  border: "#e5e7eb",
  strongBorder: "#d1d5db",
  mutedBg: "#f3f4f6",

  // Controles
  controlHeight: "32px",
  controlRadius: "6px",
  textPrimary: "#111827",
  textSecondary: "#4b5563",
  muted: "#64748b",
  mutedAlt: "#94a3b8",
  mutedDark: "#475569",
  mutedDarker: "#374151",

  primary: "#3b82f6",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f97316",
  warningAlt: "#eab308",
  purple: "#6366f1",
  purpleLight: "#a78bfa",
  gray: "#6b7280",
  white: "#fff",

  // Bloques semánticos
  infoBg: "#eff6ff",
  infoBorder: "#93c5fd",
  infoText: "#1d4ed8",
  infoIcon: "#60a5fa",
  orangeBlock: "#fffbeb",
  redBlock: "#fef2f2",
  violetBlock: "#f5f3ff",
  violetBorder: "#7c3aed44",
  greenLight: "#dcfce7",
  greenText: "#16a34a",
  stepInactive: "#f3f4f6",
  evalEmpty: "#e5e7eb",
  blueDark: "#1e40af",

  // Legacy (mapeo temporal para migración sin rediseño)
  legacyDark1: "#111827",
  legacyDark2: "#1a1d2e",
  legacyDark3: "#1e2535",
  legacyDark4: "#1e293b",
  legacyBlueBlock: "#0f2035",
  legacyOrangeBlock: "#1c1408",
  legacyRedBlock: "#2d0a0a",

  // Más tokens usados en App
  legacySlate: "#e2e8f0",
  legacyGrayBg: "#f9fafb",
  legacyGrayBorder: "#2d3748",
  legacyRedText: "#f87171",
  legacyAmberText: "#fbd38d",
  legacyRedDark: "#7f1d1d",
  legacyRedDarkText: "#b91c1c",
  legacyAmberBadge: "#fcd34d",
  legacyGreenDark: "#065f46",
} as const;

export type ThemeColorKey = keyof typeof THEME;

export function themeColor(key: ThemeColorKey): string {
  return THEME[key];
}
