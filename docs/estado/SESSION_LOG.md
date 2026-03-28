# SCCE — SESSION LOG
> Bitácora de sesiones de trabajo. Entrada más reciente al tope.
> Claude lee este archivo al inicio de cada sesión para retomar sin pérdida de contexto.

---

## SESIÓN 2026-03-27 — Refactor R-4 completo + DEUDA-005 cerrada ✅

**Fecha/hora cierre:** 2026-03-27 ~10:30 UTC (07:30 Iquique)

### Resumen ejecutivo
Deuda técnica más crítica del proyecto resuelta: App.tsx reducido de 196 558 bytes a 52 574 bytes (**−73%**, de ~3 900 líneas a 999 líneas). Cero errores TypeScript.

### Trabajo realizado

**Componentes extraidos a `components/`:**
| Componente | Archivo | Notas |
|-----------|---------|-------|
| `DashboardView` | `components/DashboardView.tsx` | Lee store + useCases directo |
| `NewCaseView` | `components/NewCaseView.tsx` | usa `useAssignedLocalScope` |
| `CatalogView` | `components/CatalogView.tsx` | mutaciones inline |
| `ReportsView` | `components/ReportsView.tsx` | props callbacks de export/import |
| `CaseDetailView` | `components/CaseDetailView.tsx` | recibe solo `exportCaseTXT` como prop |
| `AuditView` | `components/AuditView.tsx` | recibe auditLog + callbacks |
| `SimulationView` | `components/SimulationView.tsx` | recibe simCases + callbacks |
| `ChecklistView` | `components/ChecklistView.tsx` | sin props |
| `ConfigView` | `components/ConfigView.tsx` | sin props |
| `TrustView` | `components/TrustView.tsx` | sin props |
| `CaseCard` + badges | `components/CaseCard.tsx` | SlaBadge, RecBadge, DivBadge, ClosedOverlay |

**Hooks creados/modificados:**
- `hooks/useAssignedLocalScope.ts` — CREADO: scope canónico para roles PESE/DELEGADO_JE
- `hooks/useExportImport.ts` — MODIFICADO: añadido `exportCaseTXT` como `useCallback`
- `hooks/useAuth.ts` — ya existía
- `hooks/useCases.ts` — ya existía

**Cirugía App.tsx (696 líneas eliminadas):**
| Bloque | Líneas orig. | Contenido |
|--------|------------|----------|
| A | 605–613 | `exportCaseTXT` inline |
| B | 614–712 | `isFixedLocalRole`, scope block, `useCases`, `visibleCases` |
| C | 878–1386 | `CaseDetail` + `CaseDetailContent` inline |
| D | 1387–1463 | `const Reports` inline |

**Correcciones aplicadas por el usuario:**
- `visibleCases` rehecho con `useAssignedLocalScope()` + `getCaseLocalIdSafe` (alineado con hooks canónicos)
- `startNewCase` usa `assignedCommuneEffective`/`assignedLocal` del hook
- `doReset`: eliminada línea `_localSeq = 0` (no existe en App)
- Imports huérfanos limpiados: `InstructionItem`, `fmtTime`, `isSlaVencido`, `IconButton`, `Tooltip`, `getToken`, `isInstructionForUser`, `isClosedStatus`, `useCases`, `isNivelCentral`, `buildSeedLog`, etc.

### Estado final DEUDA-005
| Hito | Bytes | Líneas |
|------|-------|--------|
| Inicio | 196 558 | ~3 900 |
| Post-R-2 store | 182 903 | ~3 700 |
| Post-R-3 hooks | 151 796 | ~3 200 |
| Post-R-4 subcomponents | 102 667 | ~1 694 |
| **Final (cirugía + limpieza)** | **52 574** | **~999** |
| **Reducción total** | **−73%** | **−75%** |

### tsc --noEmit: exit code 0 ✅

### Pendientes
- [ ] `npm run lint` — atajar solo errores (warnings ESLint sobre deps de useEffect son conocidos)
- [ ] DEUDA-002: regionCode TRP vs ISO 15 — normalización pendiente
- [ ] DEUDA-004: JWT secret (solo dev, no urgente)
- [ ] Test visual completo de la UI en todos los flujos

---

## SESIÓN 2026-03-27 — R-2 Store Global (AppContext) ✅

**Continuación — mismo chat**
**Hora cierre:** ~09:30 UTC (06:30 Iquique)

### Objetivo
Crear `store/AppContext.tsx` con todos los useState del componente raíz centralizados,
listo para que App.tsx y los componentes hijos los consuman vía `useAppStore()`.

### Trabajo realizado

**store/AppContext.tsx — CREADO ✅**
- Provider con 35+ useState agrupados: Auth, Casos, Catálogo, UI, Formularios, Simulación
- Interfaz `AppStore` completa con tipado explícito de cada setter
- Hook `useAppStore()` con guard (lanza si se usa fuera del Provider)

**store/useAppStore.ts — CREADO ✅**
- Barrel re-export estable: `useAppStore`, `AppProvider`, todos los tipos
- Los componentes importan desde aquí, no desde AppContext directamente

**domain/catalog.ts — EXPANDIDO ✅**
- Agregados: `CONFIG_REGIONS`, `buildCatalogSeed`, `newLocalId`, `getActiveLocals`, `catalogSelfCheck`
- Estas funciones vivían inline en App.tsx — ahora son importables

**domain/seed.ts — CREADO ✅**
- `makeSeedCases(catalog)` — 3 casos ficticios Tarapacá
- `makeSeedAudit()` — 7 eventos de auditoría seed
- Extraídas desde App.tsx sin cambio de lógica

**domain/types.ts — EXPANDIDO ✅**
- Agrega `ElectionConfig` (movida desde ConfigView.tsx para evitar dependencia circular)

**components/ConfigView.tsx — ACTUALIZADO ✅**
- Importa `ElectionConfig` desde `domain/types`
- Re-exporta para compatibilidad con imports existentes

**scce-app/src/main.tsx — ACTUALIZADO ✅**
- Envuelve `<App>` con `<AppProvider>`
- El store está activo en runtime

### Verificación pendiente
- [x] Ejecutar `npx tsc --noEmit` → 0 errores (confirmado por usuario)
- [ ] Verificar UI en http://localhost:5173 sigue funcionando

### R-2 Bloque 2 completado (misma sesión)
**App.tsx: 196 558 → 182 903 bytes (-13 655 bytes, ~750 líneas)**
- Todos los `useState` restantes migrados al store (cases, auditLog, selectedCase, view, uiMode, crisisMode, filterState, notification, simCases, simReport, simSurvey, loginForm, showPassword, loginErr, ctxErr, authBusy, newCase, evalForm, bypassForm, step, helpOpen, actionsOpen, busyAction)
- `useRef` (importJsonInputRef, importFileRef) migrados al store
- Tipos locales duplicados eliminados: `SimReport`, `BypassCause`, `BypassFormState`, `Notification`
- `CONFIG` + `DEFAULT_REGION` colapsados (ahora `CONFIG_REGIONS` de `domain/catalog.ts`)
- Funciones `buildCatalogSeed`, `getActiveLocals`, `catalogSelfCheck`, `makeSeedCases`, `makeSeedAudit` eliminadas de App.tsx (ya en `domain/catalog.ts` y `domain/seed.ts`)
- Imports reorganizados: todos al tope del archivo, sin imports en medio del código

### Pendiente para próxima sesión
- [x] `npx tsc --noEmit` → 0 errores tras bloque 2 (confirmado por usuario)
- [ ] Test visual UI en http://localhost:5173
- [x] R-3: `hooks/useAuth.ts` — COMPLETADO por usuario

### R-3 + Unificación store completados (misma sesión)
**App.tsx: 182 903 → 179 722 bytes (-3 181 bytes)**
- Dos `useAppStore()` fusionados en uno solo con sección comentada por grupo (Auth / Datos / UI / Formulario / Login / Sim / Refs)
- `effectiveMembership`, `isCentral`, `regionOptions` reubicados inmediatamente después del destructuring — orden canónico hooks → derivados → lógica
- Comentario de bloque eliminado (`// ── useAppStore() ya provee...`)
- `tsc --noEmit`: pendiente verificar tras este cambio

### R-3 useExportImport completado (misma sesión)
**App.tsx: 158 347 → 151 796 bytes (-6 551 bytes)**
- `hooks/useExportImport.ts` creado: `onExportState`, `onImportStateFile`, `downloadJson` (privado)
- Imports limpiados: `buildExportBundle`, `validateImportBundle`, `hasSigningKey`, `initSigningKey`, `signIntegrityHashHex`, `publicKeyFingerprintShort` eliminados de App.tsx
- Solo quedan `getTrustedEntries`, `addTrustedKey`, `removeTrustedKey` de signingVault (usados por TrustView inline)
- `tsc --noEmit`: pendiente verificar

### Progreso acumulado
| Fase | Inicio | Ahora |
|------|--------|-------|
| App.tsx bytes | 196 558 | 151 796 |
| Reduccion total | — | -44 762 bytes (-23%) |
| hooks creados | 0 | 3 (useAuth, useCases, useExportImport) |

### R-4 parcial completado (misma sesión)
- `components/CaseCard.tsx` CREADO: CaseCard, SlaBadge, RecBadge, DivBadge (todos leen del store directamente)
- `components/DashboardView.tsx` CREADO: ~300 lineas, lee store + useCases directamente, sin props
- `App.tsx`: import DashboardView, uso `<DashboardView/>` cableado, definicion inline `Dashboard` renombrada a `_dashboardRemoved` (cuerpo pendiente de eliminar post-tsc)
- `tsc --noEmit`: 0 errores (confirmado)
- Cuerpo muerto `_dashboardRemoved` eliminado de App.tsx
- **App.tsx: 151 796 → 141 634 bytes (-10 162 bytes)** tras limpieza

### Pendiente para proxima sesion
- [ ] `npx tsc --noEmit` verificar 0 errores (posibles: canDo signature, normalizeStatus en DashboardView)
- [ ] Si 0 errores: eliminar cuerpo `_dashboardRemoved` de App.tsx (libera ~300 lineas)
- [ ] R-4 continua: `NewCaseView.tsx`, `CatalogView.tsx`, `Reports.tsx`
- [ ] R-4 final: `CaseDetailView.tsx` (el mas complejo)

### Próximo paso — R-2 continuación
Con el store creado y main.tsx actualizado, el siguiente paso es migrar App.tsx
para CONSUMIR el store: reemplazar los useState inline por destructuring de `useAppStore()`.
Esto se hace sección a sección (Auth → UI → Casos) con tsc --noEmit después de cada bloque.

### Archivos creados/modificados en esta sesión
- `store/AppContext.tsx` — CREADO
- `store/useAppStore.ts` — CREADO
- `domain/catalog.ts` — expandido (buildCatalogSeed + CONFIG_REGIONS)
- `domain/seed.ts` — CREADO
- `domain/types.ts` — agrega ElectionConfig
- `components/ConfigView.tsx` — actualizado imports
- `scce-app/src/main.tsx` — AppProvider añadido

---

## SESIÓN 2026-03-27 — BUG-002 + BUG-003 + DEUDA-003 + E2E UI ✅

**Continuación — mismo chat**
**Hora cierre:** ~06:10 UTC (03:10 Iquique)

### Trabajo realizado

**BUG-003 — Login salta selector de contexto ✅ RESUELTO**
- Causa: auto-selección siempre tomaba `ADM` o `list[0]`, nunca mostraba Gate B
- Fix en `App.tsx` línea ~938: solo auto-seleccionar si `list.length === 1`
- Verificado: selector aparece inmediatamente después del login con 2+ memberships

**E2E UI completo ✅**
- Formulario `+ Incidente` operativo (4 pasos: Identificación → Evaluación → Detalles → Confirmar)
- Caso creado: `Test UI E2E — caso desde formulario` · Liceo Arturo Pérez Canto · Iquique · BAJA
- Dashboard muestra 2 casos · Total: 2 · Abiertos: 2 · Completitud: 13%
- Aislamiento SIMULACION/OPERACION verificado en sesión anterior

### Archivos modificados
- `scce-app/src/App.tsx` — BUG-003 fix (línea ~938)

### Pendientes para próxima sesión
- [ ] DEUDA-002: regionCode TRP vs 15 — agrupar con DEUDA-005
- [ ] DEUDA-005: Refactor App.tsx — R-2 Store global (siguiente)

### R-1 completada en esta sesión ✅
- Creados: `domain/importValidation.ts`, `domain/policyEngine.ts`, `domain/caseUtils.ts`
- App.tsx: 3931 → 3692 líneas (239 eliminadas)
- tsc --noEmit: 0 errores
- Imports limpios: solo se importa lo que se usa

### R-4c completada en esta sesión ✅
- Extraído: `components/ConfigView.tsx` (~71 líneas)
- Vista verificada visualmente en UI
- tsc --noEmit: 0 errores

### R-4b completada en esta sesión ✅
- Extraído: `components/TrustView.tsx` (172 líneas)
- App.tsx: 3573 → 3401 líneas
- Vista verificada visualmente en UI
- tsc --noEmit: 0 errores

### R-4a completada en esta sesión ✅
- Extraídos: `components/ChecklistView.tsx`, `components/AuditView.tsx`, `components/SimulationView.tsx`
- App.tsx: 3692 → 3573 líneas (119 eliminadas)
- Fix path: `./Badge` → `../ui/Badge` (componentes en subcarpeta)
- Las 3 vistas verificadas visualmente en UI
- tsc --noEmit: 0 errores

---

## SESIÓN 2026-03-27 — BUG-002 + DEUDA-003 cerrados ✅

**Continuación de la misma sesión — mismo chat**
**Hora:** ~08:40 UTC (05:40 Iquique)

### Trabajo realizado

**BUG-002 — Cast inseguro en `context.guard.ts` ✅ RESUELTO**
- Eliminados los dos casts manuales (`as { id: boolean; ... }` y `as typeof m & {...}`)
- Reemplazado por tipado Prisma nativo:
  ```typescript
  const MEMBERSHIP_SELECT = { ... } satisfies Prisma.MembershipSelect
  type MembershipRow = Prisma.MembershipGetPayload<{ select: typeof MEMBERSHIP_SELECT }>
  ```
- `regionScopeMode` ahora es `"ALL" | "LIST"` con certeza de tipos — sin `?? fallback`

**DEUDA-003 — ExceptionFilter global ✅ RESUELTO**
- Creado `api/src/common/all-exceptions.filter.ts`
- Registrado en `api/src/main.ts` con `app.useGlobalFilters()`
- Errores Prisma loggean stack completo + retornan JSON estructurado con `path` y `timestamp`
- Errores HTTP (403, 404, etc.) retornan mensaje legible — no `500` genérico

### Verificación runtime
```
GET /cases (DR · SIMULACION/SIM_1) → [caso ficticio] ✅
GET /cases (membership inexistente) → 403 JSON estructurado con path+timestamp ✅
tsc --noEmit → 0 errores ✅
```

### Archivos modificados en esta sesión
- `api/src/auth/context.guard.ts` — BUG-002
- `api/src/common/all-exceptions.filter.ts` — creado — DEUDA-003
- `api/src/main.ts` — registro del filter — DEUDA-003

### Pendientes para próxima sesión
- [ ] **BUG-003:** Ctrl+F5 cambia contexto activo en frontend (`scce-app/`)
- [ ] **DEUDA-001:** Columna huérfana `Case.operationalState` — migración de limpieza
- [ ] **DEUDA-002:** regionCode semántico (TRP) vs ISO (15) — normalización
- [ ] **DEUDA-004:** JWT secret hardcodeado (solo dev, no urgente)
- [ ] **DEUDA-005:** Refactor God Component App.tsx (~3100 líneas)
- [ ] Prueba flujo completo desde UI (no solo curl)

---

## SESIÓN 2026-03-27 — E2E SIMULACION/SIM_1 · BUG-001 RESUELTO ✅

**Fecha/hora:** 2026-03-27 (tarde, Iquique UTC-3)

### Causa raíz de BUG-001 (P2022)
10 carpetas de migración sin `migration.sql` → BD congelada en Feb, schema avanzó a Mar.
Columnas faltantes: `title`, `description`, `createdByUserId`, `criticalityLevel`,
`detail`, `evaluation`, `completeness`, `actions`, `decisions`, `instructions`, `assignedTo`.
Enums faltantes: `CaseStatus`, `EventType`.

### Fix aplicado
1. SQL idempotente en 10 carpetas vacías
2. `migrate resolve --applied` + `migrate deploy`
3. `ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT` directo
4. `prisma generate` (requirió matar procesos node — EPERM Windows)

### E2E verificado
```
POST /cases (DR · SIM_1 · TRP) → 201 · id: cmn8n1kcf0000b596th02ky5t ✅
GET /cases (DR · SIM_1)        → [caso ficticio] ✅
GET /cases (OPERACION/GLOBAL)  → [] — aislamiento ✅
```

### Hallazgo adicional
- Columna huérfana `Case.operationalState jsonb` en BD — no está en schema.prisma

---

## PLANTILLA PARA PRÓXIMAS SESIONES

```markdown
## SESIÓN YYYY-MM-DD — [Título]

**Fecha/hora inicio:**
**Contexto activo:** SIMULACION/SIM_1 · Tarapacá · DR

### Objetivo de la sesión

### Estado al iniciar
- Docker: ✅/❌
- Backend NestJS: ✅/❌ puerto 3000
- Frontend Vite: ✅/❌ puerto 5173

### Trabajo realizado
- [ ]

### Pendiente al cerrar sesión
- [ ]

### Decisiones tomadas

### Bugs resueltos en esta sesión
```
