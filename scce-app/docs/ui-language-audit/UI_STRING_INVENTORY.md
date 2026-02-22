# Inventario de textos visibles — Auditoría de lenguaje UI (SCCE)

**Objetivo:** Refactor de lenguaje para demo institucional. Solo textos visibles; sin cambio de lógica ni modelos.

## Clasificación

- 🟢 Conforme (institucional, claro)
- 🟡 Reformulable (mejorable)
- 🔴 Inadecuado (jerga técnica, reemplazo obligatorio)

---

## Tabla de inventario (textos afectados por TAREA 3 y política de errores)

| Pantalla / Componente | Texto actual | Contexto | Clasificación | Reemplazo propuesto |
|------------------------|--------------|----------|----------------|---------------------|
| Dashboard / Badge caso | `⚠️ BYPASS` | Badge en tarjeta de caso | 🔴 | `⚠️ Modo urgente` |
| Dashboard / Métricas | `BYPASS SIN VALIDAR` | Badge contador | 🔴 | `Requiere atención prioritaria` |
| Dashboard / Toast | `⚠️ BYPASS FLAGGED` | Notificación al crear caso | 🔴 | `Requiere atención prioritaria` |
| Paso 2 Nuevo caso | `Excepción operativa sin justificación técnica objetiva → Quedará FLAGGED` | Aviso bloque | 🔴 | `Excepción operativa sin fundamento objetivo → Requiere atención prioritaria` |
| Paso 2 Nuevo caso | `Quedará FLAGGED` (variantes) | Texto aviso | 🔴 | `Requiere atención prioritaria` |
| Detalle caso | `⚠️ BYPASS FLAGGED — Requiere validación ex-post` | Bloque validación | 🟡 | `Modo urgente — Requiere validación posterior` |
| Detalle caso | `VALIDAR el bypass` / `REVOCAR el bypass` | Opciones select | 🔴 | `Validar excepción` / `Revocar excepción` |
| Detalle caso | Badge timeline | `⚡ BYPASS` / `FLAGGED` | 🔴 | `⚡ Modo urgente` / `Requiere atención` |
| Export CSV | Cabecera columnas `Bypass`, `Flagged` | Encabezado CSV | 🔴 | `Modo urgente`, `Requiere atención` |
| Export CSV | Celda `FLAGGED` | Valor celda | 🔴 | `Requiere atención prioritaria` |
| Reporte TXT | `BYPASS: SÍ — ...` | Línea en reporte | 🔴 | `Modo urgente: SÍ — ...` |
| Toast / errores | `Sin permiso` | notify error | 🟡 | `No cuenta con autorización para esta acción.` |
| Toast / errores | `Bypass flagged sin validación` | notify error | 🔴 | `Excepción operativa requiere validación.` |
| Toast / validación | Mensajes técnicos de import/validación | notify | 🟡 | Usar `UI_TEXT.errors.validation` o mensaje institucional |
| Modo urgente (checkbox) | — | Tooltip / ayuda | 🟡 | Texto TAREA 5 (tooltip institucional) |

---

## Textos ya conformes (verificar consistencia)

- "Modo urgente (Excepción operativa)" en formulario nuevo caso
- "Confirmar Modo urgente atípico"
- "Seleccione la causal de la excepción", "El Modo urgente requiere motivo o respaldo"
- Ayuda contextual (helpContent.ts) — títulos y pasos ya en lenguaje institucional

---

## Errores — política (TAREA 4)

Nunca mostrar stacktrace ni error técnico crudo. Centralizado en `UI_TEXT.errors`:

- `generic`: "Se produjo un inconveniente interno. Intente nuevamente."
- `validation`: "Revise los datos ingresados."
- `unauthorized`: "No cuenta con autorización para esta acción."
- `network`: "No se pudo establecer conexión. Intente nuevamente."

Aplicar en toasts/modales/fallbacks que hoy muestren texto técnico.
