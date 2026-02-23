# SCCE_APP — Minuta de Cierre (Hardening Operativo submitCase)

**Proyecto:** SCCE_APP (React SPA)  
**Fase:** Endurecimiento funcional submitCase() — Hardening Operativo  
**Fecha:** 2026-02-23  
**Responsable ejecución técnica:** ___________________________  
**Revisor / Aprobación:** ___________________________

---

## 1) Alcance ejecutado

Se endureció submitCase() incorporando validaciones de coherencia territorial y lógica, manteniendo:

- Sin cambios de arquitectura
- Sin cambios de modelo de datos
- Sin nueva persistencia
- Sin romper auditoría append-only
- Sin romper export/import
- Catálogo Maestro de Locales (Modelo B) preservado

---

## 2) Validaciones implementadas (fail-closed)

Si cualquier validación falla, no se registra el caso.

| Control | Regla |
|--------|--------|
| Comuna obligatoria | No se permite comuna vacía |
| Comuna válida en región | Comuna debe existir en localCatalog para la región seleccionada |
| Local obligatorio | No se permite local vacío |
| Local existe y está activo | Debe existir como local activo en catálogo |
| Local pertenece a comuna seleccionada | Coherencia región/comuna/local exigida |
| Hora de detección | No puede ser futura (tolerancia ±5 s) |
| Ámbito efectivo del usuario | No puede forzar comuna/local fuera de su ámbito (PESE/Delegado u otros con ámbito acotado) |
| localSnapshot coherente | Se genera desde el catálogo maestro activo |

---

## 3) Ajustes técnicos para build en verde (sin refactor)

Se ajustaron tipos y variables no usadas para que `tsc -b && vite build` finalice con exit code 0.

Se mantiene el comportamiento funcional del sistema.

---

## 4) Evidencia de Build

- **Comando:** `tsc -b && vite build`
- **Resultado:** ✅ Exit code 0
- **Observación:** Linter sin errores de TypeScript. (Avisos de estilo permitidos según configuración previa.)

---

## 5) Evidencia de Pruebas Manuales (≈5 minutos)

| Prueba | Resultado esperado | Resultado real | Evidencia / Observación |
|--------|--------------------|----------------|--------------------------|
| Caso normal OK | Registra con región/comuna/local y hora válida | ☐ OK / ☐ NOK | __________________ |
| Comuna vacía | Bloquea + mensaje | ☐ OK / ☐ NOK | __________________ |
| Local vacío | Bloquea + mensaje | ☐ OK / ☐ NOK | __________________ |
| Local fuera de comuna | Bloquea + mensaje | ☐ OK / ☐ NOK | __________________ |
| Hora futura | Bloquea + mensaje | ☐ OK / ☐ NOK | __________________ |
| Usuario ámbito fijo intenta comuna/local fuera | Bloquea + mensaje | ☐ OK / ☐ NOK | __________________ |

---

## 6) Trazabilidad (Commit + Changelog)

- **Changelog:** `scce-app/docs/CHANGELOG.md`
- **Entrada fecha:** 2026-02-23
- **Incluye:** hardening submitCase + build verde + referencia a commit

**Commit único sugerido (cuando se ejecute):**
```text
feat(hardening): validate territory on submitCase + build green
```

**Hash commit:** `549e156c9d4918690b71eefc9f854be899f96e1f`

---

## 7) Declaración de cierre

Se confirma que el endurecimiento de submitCase() cumple el objetivo operativo y de control (fail-closed), preservando los principios SCCE (Modelo B, auditabilidad append-only, sin cambios de arquitectura/modelo/persistencia).

**Firma Responsable ejecución:** __________________ **Fecha:** ____/____/______  
**Firma Revisor/Aprobación:** _____________________ **Fecha:** ____/____/______
