# Inventario de casos (REAL / PRUEBA_EN_REAL / SIMULACION)

## Objetivo

Separar datos **reales** de **pruebas** y **simulación** antes de definir limpieza. Regla: **primero identificar, después decidir qué limpiar, recién al final ejecutar limpieza**.

## Uso

Desde `api/`:

```bash
node scripts/inventory-cases-by-origin.cjs
```

Requiere `DATABASE_URL` en `api/.env`. No modifica ni borra nada.

## Categorías

| Categoría          | Criterio |
|--------------------|----------|
| **REAL**           | `contextType === OPERACION` y summary/title/contextId no coinciden con patrones de prueba. |
| **PRUEBA_EN_REAL** | `contextType === OPERACION` pero summary/title contienen E2E, test, prueba, demo, "[SIM]", "E2E Camino A/B/C", etc., o `contextId` empieza por `e2e-`. |
| **SIMULACION**     | `contextType === SIMULACION`. |

## Salida

- Tabla en consola con resumen y listado por categoría.
- `api/scripts/inventory-cases-by-origin.json`: mismo inventario en JSON (fecha, resumen, listas por categoría) para definir después la regla exacta de limpieza.

## Archivo seguro (sin borrar)

Script que mueve solo los PRUEBA_EN_REAL a contexto `SIMULACION` / `archivo-prueba`, sin tocar REAL:

```bash
node scripts/archive-prueba-en-real.cjs           # dry-run
node scripts/archive-prueba-en-real.cjs --execute # aplica y escribe backup
```

- **Case:** `contextType = SIMULACION`, `contextId = archivo-prueba`, `summary = "[ARCHIVADO-PRUEBA] " + summary`
- **Event** (todos los del caso): mismo contexto.
- Se genera `archive-prueba-backup-<timestamp>.json` con valores anteriores para reversión.

## Regla de creación: prueba → SIMULACION

Desde ahora toda prueba nueva nace obligatoriamente en SIMULACION, no en OPERACION:

- **Seed:** Cada usuario DR y admin tiene un membership `SIMULACION` / `e2e` (además de OPERACION/GLOBAL). Tras `npx prisma db seed`, al elegir contexto "SIMULACION / e2e" los casos se crean en simulación.
- **API E2E (Jest):** Los tests inyectan contexto `SIMULACION` (e2e-case-flow, e2e-validation, etc.).
- **Playwright E2E:** `ensureLoggedIn` selecciona el contexto SIMULACION antes de crear casos.
- **flow-full E2E:** Usa el membership con `contextType === "SIMULACION"` y `contextId === "e2e"` si existe.

Regla simple: **si es prueba → SIMULACION; si es real → OPERACION**. Sin zona gris.
