# Changelog — Auditoría de lenguaje UI v1 (string-only)

**Fecha:** 2025-02-22  
**Alcance:** Solo textos visibles. Sin cambio de lógica, flujos ni modelos/estados internos.

---

## Archivos creados

- `docs/ui-language-audit/UI_STRING_INVENTORY.md` — Inventario de textos visibles y reemplazos.
- `docs/ui-language-audit/CHANGELOG_UI_LANGUAGE_v1.md` — Este archivo.
- `src/config/uiTextStandard.ts` — Diccionario central `UI_TEXT` (states, labels, tooltips, errors, buttons, misc).

---

## Archivos modificados

### `src/App.tsx`

- **Import:** `UI_TEXT` desde `./config/uiTextStandard`.
- **Notificaciones (notify):**
  - "Sin permiso" → `UI_TEXT.errors.unauthorized`.
  - "Recepcionar el caso primero." → `UI_TEXT.errors.recepcionarPrimero`.
  - "Bypass flagged sin validación." → `UI_TEXT.errors.excepcionRequiereValidacion`.
  - "Se requiere al menos 1 acción/decisión", "El caso debe estar en 'Resuelto'", "Ingresa el motivo de cierre" → claves en `UI_TEXT.errors`.
  - "Solo el Director Regional puede validar bypass" → `UI_TEXT.errors.soloDirectorValida`.
  - "Se requiere fundamento" → `UI_TEXT.errors.fundamentoRequerido`.
  - "Bypass validado/revocado" → "Excepción validada/revocada".
  - "BYPASS FLAGGED" en toast de caso creado → `UI_TEXT.states.flagged`.
  - "Minuta copiada" → `UI_TEXT.buttons.minutaCopiada`.
  - "Nombre obligatorio", "Seleccione una comuna" → `UI_TEXT.errors`.
- **Auditoría (appendEvent):** texto visible del evento BYPASS_FLAGGED → `UI_TEXT.errors.excepcionRequiereValidacion` (solo el summary visible; tipo de evento sin cambio).
- **CSV export:** Cabeceras "Bypass"/"Flagged" → `UI_TEXT.labels.bypassColumn` / `UI_TEXT.labels.flaggedColumn`; celda "FLAGGED" → `UI_TEXT.states.flaggedShort`.
- **Badges y métricas:**
  - Badge en tarjeta de caso "⚠️ BYPASS" → "⚠️ " + `UI_TEXT.states.modoUrgente`.
  - Contador "BYPASS SIN VALIDAR" → `UI_TEXT.states.flagged`.
  - En detalle de caso: "⚡ BYPASS" / "FLAGGED" → `UI_TEXT.states.modoUrgente` / `UI_TEXT.states.flaggedShort`.
- **Paso 2 Nuevo caso:** Aviso "Excepción operativa sin justificación técnica objetiva → Quedará FLAGGED" → `UI_TEXT.misc.excepcionSinFundamentoObjetivo`; checkbox de confirmación → `UI_TEXT.misc.confirmarExcepcionOperativa`.
- **Modo urgente (checkbox):** Añadido `title={UI_TEXT.tooltips.modoUrgente}` y `aria-describedby` para tooltip institucional (TAREA 5).
- **Detalle caso — bloque validación excepción:**
  - "BYPASS FLAGGED — Requiere validación ex-post" → `UI_TEXT.states.modoUrgente` + " — " + `UI_TEXT.misc.validacionExpost`.
  - Opciones "VALIDAR el bypass" / "REVOCAR el bypass" → `UI_TEXT.labels.validarExcepcion` / `UI_TEXT.labels.revocarExcepcion`.
  - Placeholder "Fundamento obligatorio..." → `UI_TEXT.labels.fundamentoObligatorio`.
  - Botones "✓ Validar" / "✕ Revocar" → `UI_TEXT.labels.validar` / `UI_TEXT.labels.revocar`.
- **Estado inicial (Paso 3):** "Modo urgente activo" → `UI_TEXT.states.modoUrgenteActive`.
- **Reporte TXT descargable:** "BYPASS:" → `UI_TEXT.misc.reporteBypassLabel` + ":".

---

## Lo que no se cambió (por diseño)

- Nombres internos: `bypass`, `validateBypass`, `bypassForm`, `bypassFlagged`, etc.
- Tipos de evento de auditoría: `BYPASS_USED`, `BYPASS_FLAGGED`, `BYPASS_VALIDATED`, `BYPASS_REVOKED`.
- Valores de opciones del select de validación: `VALIDATED`, `REVOKED`.
- Estructura visual (solo textos; sin rediseño).

---

## Pruebas mínimas (TAREA 6)

- `npm run lint` — (ejecutar y reportar).
- `npm run build` — (ejecutar y reportar).

Si fallan por entorno/fuentes, indicar claramente en el reporte.
