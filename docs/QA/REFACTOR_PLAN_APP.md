# SCCE — Plan de Refactor App.tsx
> Elaborado: 2026-03-27
> Objetivo: descomponer el God Component (3931 líneas) en una arquitectura
> mantenible sin romper funcionalidad existente.

---

## 1. Diagnóstico cuantitativo

| Sección | Líneas |
|---------|--------|
| Helpers validación import/export | 138 |
| Policy Engine | 53 |
| Catálogo | 54 |
| Utilidades + seed | 116 |
| Estado + hooks + bootstrap | 385 |
| bootstrapSession + doLogin | 247 |
| submitCase | 202 |
| Operaciones de caso | 228 |
| Export/Import/Simulación | 351 |
| **Case Detail** | **509** ← más grande |
| Dashboard | 175 |
| New Case Form | 245 |
| Otras vistas (6) | ~612 |
| Layout + nav | 180 |
| **TOTAL** | **3931** |

**Hooks en el componente raíz:** 103 (useState × 35, useEffect × 18, useMemo × 12...)

---

## 2. Mapa de dependencias de estado por vista

| Vista | Estado que consume |
|-------|-------------------|
| Dashboard | cases, currentUser, filterState, crisisMode, activeRegion |
| NewCaseForm | currentUser, localCatalog, evalForm, newCase, bypassForm |
| CaseDetail | cases, currentUser, localCatalog, auditLog, selectedCase, uiMode |
| CatalogView | cases, currentUser, localCatalog, auditLog, activeRegion |
| ReportsView | cases, currentUser |
| AuditView | currentUser, auditLog |
| SimView | simCases (aislado ✅) |
| ConfigView | currentUser, localCatalog, electionConfig |
| FirmaView | currentUser (casi aislado ✅) |

**Observación clave:** SimView y FirmaView son casi independientes.
CaseDetail es el más acoplado (6 vars de estado global).

---

## 3. Arquitectura objetivo

```
scce-app/src/
├── domain/                    ← ya existe, mantener
│   ├── apiClient.ts
│   ├── authSession.ts
│   ├── types.ts
│   └── ...
│
├── store/                     ← NUEVO — estado global centralizado
│   ├── AppContext.tsx          ← React Context con todo el estado compartido
│   └── useAppStore.ts          ← hook de acceso al store
│
├── hooks/                     ← NUEVO — lógica extraída del componente
│   ├── useAuth.ts              ← bootstrapSession, doLogin, doLogout
│   ├── useCases.ts             ← submitCase, recepcionar, changeStatus...
│   ├── useCatalog.ts           ← catalogAdd, catalogDeactivate...
│   ├── useExportImport.ts      ← onExportState, onImportStateFile
│   └── useNotification.ts     ← notify, notification state
│
├── components/                ← ya existe, expandir
│   ├── layout/
│   │   ├── AppShell.tsx        ← navbar + layout principal (líneas 3752-3931)
│   │   └── ContextBadge.tsx    ← badge SIMULACION/SIM_1
│   ├── auth/
│   │   ├── LoginGate.tsx       ← GATE A (líneas 2049-2122)
│   │   └── ContextSelector.tsx ← GATE B (líneas 2123-2210)
│   └── cases/
│       └── CaseCard.tsx        ← tarjeta de caso en dashboard
│
├── views/                     ← NUEVO — cada vista es un componente propio
│   ├── DashboardView.tsx       ← 175 líneas
│   ├── NewCaseView.tsx         ← 245 líneas (4 pasos)
│   ├── CaseDetailView.tsx      ← 509 líneas ← prioridad
│   ├── CatalogView.tsx         ← 143 líneas
│   ├── ReportsView.tsx         ← 71 líneas
│   ├── AuditView.tsx           ← 44 líneas
│   ├── SimulationView.tsx      ← 53 líneas
│   ├── ChecklistView.tsx       ← 42 líneas
│   ├── ConfigView.tsx          ← 71 líneas
│   └── FirmaView.tsx           ← 188 líneas
│
└── App.tsx                    ← resultado final: ~200 líneas
    (solo routing entre vistas + provider del store)
```

---

## 4. Plan de ejecución por fases

### FASE R-1 — Extraer helpers puros (sin riesgo, sin estado)
**Archivos a crear:**
- `domain/importValidation.ts` ← 138 líneas de assertImport*, assertString*, etc.
- `domain/policyEngine.ts` ← canDo(), isNivelCentral() (ya existe parcialmente)
- `domain/caseUtils.ts` ← genId(), calcCriticality(), critColor(), statusColor()

**Riesgo:** 🟢 Cero — son funciones puras sin efectos secundarios.
**Esfuerzo:** 30 min.

### FASE R-2 — Extraer store de estado global
**Archivo a crear:** `store/AppContext.tsx`
- Mover los 35 useState del componente raíz
- Exponer mediante React Context
- App.tsx solo envuelve con `<AppProvider>`

**Riesgo:** 🟡 Medio — requiere actualizar todas las referencias.
**Esfuerzo:** 60 min.
**Prerequisito:** R-1 completa.

### FASE R-3 — Extraer hooks de lógica
**Archivos a crear:**
- `hooks/useAuth.ts` ← bootstrapSession, doLogin (247 líneas)
- `hooks/useCases.ts` ← submitCase + 10 operaciones de caso (430 líneas)
- `hooks/useExportImport.ts` ← export/import (351 líneas)

**Riesgo:** 🟡 Medio — funciones con efectos secundarios, requieren acceso al store.
**Esfuerzo:** 90 min.
**Prerequisito:** R-2 completa.

### FASE R-4 — Extraer vistas (orden por tamaño descendente)
1. `FirmaView.tsx` — casi aislada (188 líneas, solo currentUser)
2. `SimulationView.tsx` — aislada (53 líneas, solo simCases)
3. `AuditView.tsx` — simple (44 líneas)
4. `ChecklistView.tsx` — simple (42 líneas)
5. `ReportsView.tsx` — simple (71 líneas)
6. `ConfigView.tsx` — moderada (71 líneas)
7. `CatalogView.tsx` — moderada (143 líneas)
8. `DashboardView.tsx` — moderada (175 líneas)
9. `NewCaseView.tsx` — compleja (245 líneas)
10. `CaseDetailView.tsx` — más compleja (509 líneas) ← dejar para último

**Riesgo:** 🟡 Medio por vista, bajo si se hace en orden.
**Esfuerzo:** 30-45 min por vista.

### FASE R-5 — Extraer componentes auth + layout
- `LoginGate.tsx` (74 líneas)
- `ContextSelector.tsx` (88 líneas)
- `AppShell.tsx` (180 líneas)

**Esfuerzo:** 45 min total.

### FASE R-6 — App.tsx final
App.tsx queda como:
```tsx
// ~80 líneas
export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
```

---

## 5. Reglas de oro del refactor

1. **Una fase a la vez** — nunca mezclar R-1 con R-2 en el mismo commit
2. **Test visual después de cada fase** — abrir UI y verificar que todo sigue funcionando
3. **Sin cambios de lógica** — el refactor es solo movimiento de código, cero nuevas features
4. **Compilar después de cada extracción** — `npx tsc --noEmit` en verde antes de continuar
5. **Commit por fase** — mensaje: `refactor(app): R-1 extraer helpers puros`

---

## 6. Estimación total

| Fase | Esfuerzo | Sesiones |
|------|----------|---------|
| R-1 Helpers puros | 30 min | 0.5 |
| R-2 Store global | 60 min | 1 |
| R-3 Hooks lógica | 90 min | 1.5 |
| R-4 Vistas (10) | 360 min | 4-5 |
| R-5 Auth + layout | 45 min | 0.5 |
| R-6 App final | 30 min | 0.5 |
| **Total** | **~10 horas** | **8-9 sesiones** |

**Recomendación:** ejecutar R-1 en la próxima sesión (30 min, riesgo cero).
Confirma que el refactor no rompe nada y establece el patrón para las fases siguientes.
