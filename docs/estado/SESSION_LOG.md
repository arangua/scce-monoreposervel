# SCCE — SESSION LOG
> Bitácora de sesiones de trabajo. Entrada más reciente al tope.
> Claude lee este archivo al inicio de cada sesión para retomar sin pérdida de contexto.

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
