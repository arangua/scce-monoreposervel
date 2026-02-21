# Baselines SCCE

## baseline-fase5-endurecimiento-audit-hash-v1

- **Tag:** `baseline-fase5-endurecimiento-audit-hash-v1`
- **Qué incluye:** Dominio limpio v1 + micro-endurecimiento audit (appendEvent coerción, verifyChain fail-closed 5.1-2/5.1-3) + chainHash coerción a string (Fase 5.2).
- **Evidencia:** lint/build OK + 4 warnings históricos (react-hooks/exhaustive-deps).
- **Próxima fase (6.0/6.1):** 6.1 — Hardening mínimo de import/export JSON (fail-closed + límites). Punto típico donde entran estructuras inesperadas; el guardrail de Fase 5 se pone a prueba.
