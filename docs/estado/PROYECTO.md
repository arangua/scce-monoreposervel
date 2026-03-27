# SCCE — MEMORIA PERMANENTE DEL PROYECTO
> Este archivo es la fuente de verdad para Claude al iniciar cualquier sesión.
> Actualizar al cerrar cada sesión de trabajo.
> Ruta: `docs/estado/PROYECTO.md`

---

## 1. IDENTIDAD DEL PROYECTO

| Campo | Valor |
|-------|-------|
| **Nombre completo** | Sistema de Comunicación de Contingencias Electorales |
| **Acrónimo** | SCCE |
| **Propietario** | SERVEL — Dirección Regional Tarapacá |
| **Director / Líder técnico** | Luis Arangua Werner (Director Regional) |
| **Repositorio activo** | `C:\Users\arang\OneDrive\Escritorio\0001 SCCE_REVISION` |
| **Respaldo limpio** | `C:\Users\arang\OneDrive\Escritorio\0001_SCCE_MAIN_LIMPIO` |
| **⚠️ OFF-LIMITS** | `0001_SCCE_MAIN_PRE_RENDER` — NO tocar nunca |

---

## 2. ARQUITECTURA DEL SISTEMA

### Stack tecnológico
```
Monorepo
├── api/                    NestJS · TypeScript · Puerto 3000
│   ├── Prisma ORM         PostgreSQL v5.22.0 (Docker)
│   ├── JWT Auth           passport-jwt · secret: SCCE_DEV_SECRET_CHANGE_ME
│   └── Guards             JwtAuthGuard → ContextGuard → Ctx decorator
└── scce-app/              React · TypeScript · Vite · Puerto 5173
```

### Base de datos
- **Motor:** PostgreSQL vía Docker · contenedor: `scce-postgres`
- **Comando inicio:** `npm run db:up` (desde raíz del monorepo)
- **URL:** `postgresql://postgres:postgres@localhost:5432/scce?schema=public`

### Comandos de arranque
```bash
# 1. Base de datos
npm run db:up                    # desde raíz

# 2. Backend
cd api && npm run start:dev       # → puerto 3000

# 3. Frontend
cd scce-app && npm run dev        # → puerto 5173
```

### Nota Windows — EPERM al generar Prisma
Si `prisma generate` falla con EPERM (rename .dll.node.tmp):
```powershell
Get-Process node | Stop-Process -Force
npx prisma generate
```

---

## 3. MODELO DE GOBERNANZA

### Contextos
| ContextType | ContextId | Uso |
|-------------|-----------|-----|
| `SIMULACION` | `SIM_1` | Entrenamiento y pruebas — **contexto activo de desarrollo** |
| `OPERACION` | `GLOBAL` | Uso real en elección — **bloqueado** (`OPERACION_ENABLED=false`) |

### Usuario de prueba
| Campo | Valor |
|-------|-------|
| Email | `admin.piloto@scce.local` |
| Password | `ClavePiloto2026` |
| userId | `cmn7uzk6j001c1bhfl9z2vqx7` |

### Memberships del admin (4 activos)
| id | Contexto | Rol | regionCode | regionScopeMode | regionScope |
|----|----------|-----|------------|-----------------|-------------|
| `cmn8ip31q0006a0fhsf5yha4a` | SIMULACION/SIM_1 | DR | TRP | LIST | ["TRP"] |
| `cmn8ip31u0008a0fh811fqg9o` | SIMULACION/SIM_1 | ADMIN_PILOTO | ADM | ALL | [] |
| `cmn8ip31h0002a0fhjseq3ihv` | OPERACION/GLOBAL | DR | TRP | LIST | ["TRP"] |
| `cmn8ip31n0004a0fh4k0zope5` | OPERACION/GLOBAL | ADMIN_PILOTO | ADM | ALL | [] |

### ⚠️ Convención de regionCode
- Memberships usan códigos **semánticos SERVEL**: `TRP` (Tarapacá), `ADM`
- Catálogo frontend puede usar códigos **ISO numéricos**: `"15"`
- **Pendiente normalización** — usar siempre `TRP` en requests hasta resolver

---

## 4. MODELO DE DATOS CLAVE

### Case (columnas verificadas en BD — 2026-03-27)
```
id, contextType, contextId, summary, status (CaseStatus enum), criticality (text)
createdAt, updatedAt, regionCode, communeCode, localCode, localSnapshot (jsonb)
title, description, createdByUserId, criticalityLevel (CriticalityLevel enum)
assignedTo, detail, evaluation (jsonb), completeness (int)
actions (jsonb), decisions (jsonb), instructions (jsonb)
operationalState (jsonb) ← columna huérfana, no está en schema.prisma, pendiente limpiar
```

### Event (evento append-only)
```
id, caseId (FK→Case), contextType, contextId, actorId
eventType (EventType enum): CASE_CREATED | COMMENT_ADDED | INSTRUCTION_CREATED |
  CASE_CLOSED | ACK | RESOLVE | CHANGE_CRITICALITY | OPERATIONAL_VALIDATION |
  ASSIGNMENT_CHANGED | ACTION_ADDED | DECISION_ADDED
payloadJson (jsonb), prevHash, hash (SHA-256 encadenado), createdAt
```

### Membership
```
id, userId (FK→User), contextType, contextId, role (Role enum)
regionCode, regionScopeMode (RegionScopeMode enum: ALL|LIST), regionScope (text[])
```

### Enums confirmados en BD (2026-03-27)
`ContextType` · `Role` · `RegionScopeMode` · `CriticalityLevel` · `CaseStatus` · `EventType`

---

## 5. HISTORIAL DE FASES

| Fase | Descripción | Estado |
|------|-------------|--------|
| v1.0–v1.9 | SPA monolítica React con audit trail, Policy Engine RBAC/ABAC, catálogo 16 regiones/346 comunas | ✅ |
| Fase 6 | Export Hardening — JSON estructurado con schemaVersion | ✅ |
| Fase 7 | Import seguro, fail-closed, ciclo export→reset→import | ✅ |
| Migración monorepo | NestJS + React + PostgreSQL + Docker | ✅ |
| Gobernanza v1 piloto | Memberships, ContextGuard, aislamiento SIMULACION/OPERACION | ✅ |
| **E2E SIMULACION/SIM_1** | Flujo completo creación + listado + aislamiento | ✅ 2026-03-27 |

---

## 6. BUGS Y DEUDA TÉCNICA

| ID | Descripción | Severidad | Estado |
|----|-------------|-----------|--------|
| BUG-001 | Error 500 GET /cases — columnas faltantes en BD (P2022) | 🔴 | ✅ RESUELTO 2026-03-27 |
| BUG-002 | Cast inseguro en `context.guard.ts` ~línea 46 (`as { id: boolean }`) | 🟠 | ✅ RESUELTO 2026-03-27 |
| BUG-003 | Ctrl+F5 / login salta selector de contexto (auto-select incorrecto) | 🟡 | ✅ RESUELTO 2026-03-27 |
| DEUDA-001 | Columna huérfana `Case.operationalState` no está en schema.prisma | 🟡 | ✅ RESUELTO 2026-03-27 |
| DEUDA-002 | regionCode semántico (TRP) vs ISO (15) — sin mapeo explícito | 🟠 | 🔄 Agrupar con DEUDA-005 (refactor App.tsx) |
| DEUDA-003 | Sin ExceptionFilter global → stack traces no se loggean en prod | 🟠 | ✅ RESUELTO 2026-03-27 |
| DEUDA-004 | JWT secret hardcodeado (`SCCE_DEV_SECRET_CHANGE_ME`) | 🟠 | ⚠️ Solo dev, OK por ahora |
| DEUDA-005 | God Component App.tsx (~3900 líneas) | 🔴 | 🔄 Plan elaborado — ver docs/QA/REFACTOR_PLAN_APP.md |

---

## 7. DECISIONES DE ARQUITECTURA

| Decisión | Motivo | Fecha |
|----------|--------|-------|
| `OPERACION_ENABLED=false` en `.env` | Modo piloto — solo SIMULACION activa | 2026-02 |
| Prisma output en `node_modules/.prisma/client` | Monorepo compartido | 2026-02 |
| Hash SHA-256 encadenado en eventos | Audit trail inmutable | 2026-02 |
| `regionScopeMode` en Membership | Aislamiento territorial por región | 2026-03 |
| Migraciones vacías completadas con SQL idempotente | Fix BUG-001 sin reset de BD | 2026-03-27 |
| `assignedTo` añadido directo con ALTER TABLE | Evitar reset de BD con datos de gobernanza | 2026-03-27 |

---

## 8. ARCHIVOS CRÍTICOS — MAPA RÁPIDO

```
api/
├── src/cases/cases.service.ts      ← lógica principal casos + events + regionWhere()
├── src/cases/cases.controller.ts   ← endpoints REST
├── src/cases/dto.ts                ← validación de entrada (CreateCaseDto)
├── src/auth/context.guard.ts       ← guard contexto/membership ← BUG-002 cast inseguro
├── src/auth/ctx.decorator.ts       ← extractor ScceCtx del request
├── src/auth/jwt.strategy.ts        ← validación JWT
├── prisma/schema.prisma            ← modelo de datos completo
├── prisma/show-memberships.cjs     ← diagnóstico memberships en BD
├── prisma/reset-sim.cjs            ← reset datos de simulación
└── .env                            ← OPERACION_ENABLED + DATABASE_URL

docs/estado/
├── PROYECTO.md                     ← este archivo
├── SESSION_LOG.md                  ← bitácora de sesiones
└── INICIO_SESION.md                ← bloque para pegar al abrir nuevo chat

scce-app/
├── src/domain/apiClient.ts         ← cliente HTTP frontend
├── src/domain/authSession.ts       ← gestión sesión y contexto activo
├── src/App.tsx                     ← God Component (~3100 líneas) ← DEUDA-005
└── src/domain/types.ts             ← tipos compartidos
```

---

## 9. PROTOCOLO DE SESIÓN

### Al INICIAR → Claude lee:
1. `docs/estado/PROYECTO.md` (este archivo)
2. `docs/estado/SESSION_LOG.md`

### Al CERRAR → pedir a Claude:
> "Cierra la sesión y actualiza SESSION_LOG.md"

### Bloque de inicio para nuevo chat:
```
Lee docs/estado/PROYECTO.md y docs/estado/SESSION_LOG.md antes de responder.
Ruta base: C:\Users\arang\OneDrive\Escritorio\0001 SCCE_REVISION\
Estado: Docker ✅ | Backend :3000 ✅ | Frontend :5173 ✅
Contexto activo: SIMULACION/SIM_1 · Tarapacá · DR
Tarea: [describir aquí]
```
