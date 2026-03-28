/**
 * SCCE — Sistema de tokens de color v2
 *
 * Los colores se leen desde variables CSS definidas en index.css.
 * Esto permite que el modo oscuro funcione automáticamente en todos
 * los componentes sin cambios adicionales.
 *
 * Uso: themeColor("primary") → "var(--primary)"
 */

export const THEME = {
  // Fondos
  bgApp:         "var(--bg-app)",
  bgSurface:     "var(--bg-surface)",
  bgSurface2:    "var(--bg-surface-2)",
  bgSidebar:     "var(--bg-sidebar)",

  // Texto
  textPrimary:   "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  muted:         "var(--text-muted)",
  mutedAlt:      "var(--text-secondary)",
  mutedDark:     "var(--text-secondary)",
  mutedDarker:   "var(--text-primary)",

  // Bordes
  border:        "var(--border)",
  strongBorder:  "var(--border-strong)",

  // Marca
  primary:       "var(--primary)",
  primaryLight:  "var(--primary-light)",

  // Estados semánticos
  success:       "var(--success)",
  successLight:  "var(--success-light)",
  warning:       "var(--warning)",
  warningAlt:    "var(--warning)",
  warningLight:  "var(--warning-light)",
  danger:        "var(--danger)",
  dangerLight:   "var(--danger-light)",
  info:          "var(--info)",
  infoBg:        "var(--info-light)",
  infoBorder:    "var(--primary)",
  infoText:      "var(--primary)",
  infoIcon:      "var(--primary)",

  // Colores fijos
  white:         "#ffffff",
  gray:          "var(--text-muted)",

  // Bloques semánticos
  orangeBlock:   "var(--warning-light)",
  redBlock:      "var(--danger-light)",
  violetBlock:   "#f5f3ff",
  violetBorder:  "#7c3aed44",
  greenLight:    "var(--success-light)",
  greenText:     "var(--success)",
  stepInactive:  "var(--bg-surface-2)",
  evalEmpty:     "var(--border)",
  blueDark:      "var(--primary)",

  // Púrpura
  purple:        "#6366f1",
  purpleLight:   "#a78bfa",

  // Legacy — mantenidos para compatibilidad
  legacySlate:        "var(--border)",
  legacyGrayBg:       "var(--bg-surface-2)",
  legacyGrayBorder:   "var(--border-strong)",
  legacyRedText:      "var(--danger)",
  legacyAmberText:    "var(--warning)",
  legacyRedDark:      "var(--danger)",
  legacyRedDarkText:  "var(--danger)",
  legacyAmberBadge:   "var(--warning)",
  legacyGreenDark:    "var(--success)",
  legacyDark1:        "var(--bg-sidebar)",
  legacyDark2:        "var(--bg-sidebar)",
  legacyDark3:        "var(--bg-sidebar)",
  legacyDark4:        "var(--bg-sidebar)",
  legacyBlueBlock:    "var(--primary-light)",
  legacyOrangeBlock:  "var(--warning-light)",
  legacyRedBlock:     "var(--danger-light)",

  // Controles
  controlHeight: "32px",
  controlRadius: "var(--radius-sm)",
} as const;

export type ThemeColorKey = keyof typeof THEME;

export function themeColor(key: ThemeColorKey): string {
  return THEME[key];
}
