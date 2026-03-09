# Evidencia — Enforcement Enterprise por región (scope)

**Fecha:** 2026-02-27  
**Ámbito:** GET/POST /cases con `regionScopeMode` y `regionScope` (membership). Sin UI, solo API.

## Resultados de prueba

| Modo | Scope        | POST TRP | POST AYP | GET /cases        |
|------|--------------|----------|----------|-------------------|
| LIST | ["TRP"]      | 201 ✅   | 403 ✅   | Solo TRP ✅       |
| ALL  | []           | 201 ✅   | 201 ✅   | Multi-región ✅   |

## Integridad de datos

- **SELECT regionCode NULL/vacío:** 1 caso corregido (id `cmm36csbt00001i1wxfhblshs`, `regionCode = ""` → `TRP`).
- **DB enforced:** NOT NULL + NOT BLANK (columna `regionCode` ya NOT NULL; constraint `Case_regionCode_not_blank` CHECK (btrim <> '')).

## Regresión automatizada (e2e)

- **Spec:** `api/test/region-scope.e2e-spec.ts`
- **LIST ["TRP"]:** POST TRP → 201, POST AYP → 403, GET /cases → solo TRP.
- **ALL:** POST AYP → 201, GET /cases → existe item con `id === created.id` y `regionCode === "AYP"` (determinista, sin depender de dataset).
- **CI local (verde):** `cd api` → `npm run test:e2e:db:up` → `npm run test:e2e:prep` → `npm run test:e2e`. Requiere Docker (Postgres test en 5433) o `.env.test` con `DATABASE_URL` apuntando a una DB disponible.

## Checklist de cierre

| Ítem | Estado |
|------|--------|
| Enforcer por región (LIST vs ALL) probado con evidencia | ✅ |
| Dataset sin regionCode vacío | ✅ |
| Constraint anti-blank | ✅ |
| regionCode NOT NULL en DB | ✅ (verificado: `information_schema.columns.is_nullable = 'NO'`) |
| E2E region-scope determinista (ALL por id creado) | ✅ |
| Suite e2e pasando en CI local | ⬜ (requiere DB test: Docker o .env.test) |
