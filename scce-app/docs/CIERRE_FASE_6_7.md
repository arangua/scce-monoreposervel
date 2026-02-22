# SCCE_APP — Cierre Fase 6 + Fase 7.0 (Import/Export Hardening)

**Fecha:** 2026-02-22  
**Rama:** fase4-endurecimiento-ligero  
**Baseline:** baseline-fase6-export-hardening-v1  

---

## Alcance ejecutado

- **Fase 6.1:** Export JSON hardening (forma + límite 5 MB).
- **Fase 6.3-1 a 6.3-5:** Import JSON guardrails (cantidad, ID estable+único, strings, arrays internos, CaseEvent, ISO soft, evidence ≤ 50).
- **Fase 6.4:** Guardrail tamaño total post-parse (5 MB stringify).
- **Fase 7.0:** metadata.schemaVersion = 1 en export + exigencia en import (fail-closed).

---

## Límites vigentes (resumen)

| Concepto | Límite |
|----------|--------|
| Archivo import/export | ≤ 5 MB |
| Post-parse cases stringify | ≤ 5 MB |
| Casos | ≤ 5.000 |
| actions / decisions / evaluationHistory | ≤ 200 |
| timeline | ≤ 500 |
| evidence | ≤ 50 |
| Strings | MAX_SHORT 200, MAX_MED 500, MAX_LONG 2000, MAX_ID 80, MAX_DATE_STR 35 |

---

## Validaciones clave

- CaseItem.id obligatorio, estable (regex) y único.
- Fechas ISO soft (timeline.at y campos *At).
- CaseEvent shape mínimo: type / at / actor + note opcional.
- Fail-closed con mensajes explícitos (importFail).

---

## Evidencia técnica

- `.\run-scce.ps1 lint`: 0 errores, 4 warnings históricos (react-hooks/exhaustive-deps).
- `.\run-scce.ps1 build`: OK.

---

## Pendiente de certificación (Fase 7.1)

- [ ] Prueba ciclo completo: export → borrar → import → verificar invariantes.
- Evidencia mínima: N antes, N = 0, N después, nombre archivo, ¿alerta? (sí/no + mensaje si aplica).

---

## Ajuste opcional (Enterprise)

En import se mezclan `alert(...); return` y `importFail(...)`. Para consistencia: usar solo `importFail` dentro del `try` y un solo `catch` con `alert(err.message)`.
