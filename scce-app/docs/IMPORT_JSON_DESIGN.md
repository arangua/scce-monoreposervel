# Diseño: Import JSON (Fase 6.2)

Documento de diseño sin implementación. Cuando se implemente, seguir este flujo y guardrails para evitar sorpresas.

---

## 6.2-A — Flujo UI propuesto

- **Botón en UI:** "Importar JSON"
- **Selector:** `<input type="file" accept="application/json,.json">`
- **Lectura:** `FileReader.readAsText(file)`
- **Validación (orden estricto):** tamaño → parse → forma → tipos → límites → confirmación → aplicar  
  Toda falla: **fail-closed** (no cambia estado) + mensaje claro.

---

## 6.2-B — Límites (alineados a export)

| Control | Regla recomendada | Motivo |
|--------|-------------------|--------|
| Tamaño archivo | ≤ 5 MB | Coherente con export; evita cuelgues |
| Tiempo de parse | implícito | JSON.parse síncrono; el tamaño limita riesgo |
| Cantidad de casos | ej. ≤ 5.000 | Evita UI lenta (ajustable) |
| Largo strings | ej. eventId/type/actor ≤ 200, summary ≤ 5.000 | Evita payload malicioso o accidental |
| AuditLog total | ej. ≤ 50.000 eventos | Mantiene performance y export |

*(Umbrales de cantidad/largos son borrador; se fijan cuando se vean tamaños reales.)*

---

## 6.2-C — Validaciones mínimas de forma (schema práctico)

- **Raíz:** objeto `{ metadata, cases }`.
- **metadata:** objeto no-null, no-array; campos opcionales, si existen: strings razonables. No ejecutar lógica “inteligente”; solo almacenar/mostrar.
- **cases:** array. Cada case debe tener identificador estable (id/caseId según modelo). Campos string/number/boolean esperados. Fechas: si vienen, string (ideal ISO); no re-formatear, solo validar tipo.
- **Auditoría (si viene):** si el import incluye `auditLog` (hoy el export es `{ metadata, cases }`, sin audit): array de eventos; cada evento con `hash`/`prevHash` string. Opcional: correr `verifyChain` antes de aceptar. Si falla: bloquear import o importar casos sin audit — **decisión pendiente** para fase posterior; en 6.2 solo queda definido.

---

## 6.2-D — Política de aplicación (recomendada)

- **Import “reemplaza todo”** (metadata + cases) con **confirmación doble**:
  1. Confirmación 1: "Vas a reemplazar el estado actual."
  2. Confirmación 2 (si hay datos actuales): "Escribe IMPORTAR para continuar" (o similar).
- Minimiza lógica de merge y reduce riesgos.

---

## 6.2-E — Mensajes de error mínimos

- "Archivo inválido: excede 5 MB."
- "JSON inválido: no se pudo interpretar."
- "Estructura inválida: se esperaba { metadata, cases }."
- "Datos inválidos: cases no es array / metadata no es objeto."
- "Import cancelado: no se realizaron cambios."

---

**Bitácora Fase 6.2:** Definido diseño de import JSON (sin implementación): flujo UI, guardrails (tamaño 5 MB), validaciones mínimas de forma y tipos, límites de volumen, y política "reemplaza todo" con confirmación.

**Siguiente paso:** Implementar import según este diseño (un micro-movimiento por fase).
