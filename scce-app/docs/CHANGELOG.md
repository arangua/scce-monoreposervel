# Changelog interno — SCCE App

Entradas breves para trazabilidad de hitos técnicos (sin sobre-ingeniería).

---

## 2026-02-24 — Filtro ámbito Modo OP (CRIT Bloque 5)

- **fix(op):** Modo OP ahora usa visibleCases (filtrado por ámbito efectivo) al renderizar TerrainShell — corrige exposición de casos fuera de alcance (CRIT Bloque 5).

---

## 2026-02-23 — Hardening submitCase + build verde

- **Hardening submitCase:** validaciones territoriales + coherencia localSnapshot; fail-closed; sin cambios de modelo.
- **Build verde:** ajustes de tipos y limpieza noUnusedLocals (App.tsx, TerrainShell.tsx).

*(Commit sugerido: `feat(hardening): validate territory on submitCase + build green`)*
