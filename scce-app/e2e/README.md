# E2E — Validación operacional (Playwright)

Tests de los 6 escenarios de validación operacional en la UI del SCCE.

## Requisitos

- **App** en `http://localhost:5173` (p. ej. `npm run dev` en `scce-app`).
- **API** en la URL configurada en `VITE_API_BASE_URL` (p. ej. `http://localhost:3000`), con BD sembrada.
- **Credenciales:** mismo usuario/contraseña que el seed de la API:
  - `E2E_LOGIN_EMAIL` (por defecto `dr.trp@scce.local`)
  - `E2E_LOGIN_PASSWORD` (debe coincidir con `SEED_PASSWORD` del seed)

Si `E2E_LOGIN_PASSWORD` no está definido, los tests se marcan como *skipped*.

## Cómo ejecutar

```bash
cd scce-app
# Con app y API ya en marcha:
E2E_LOGIN_PASSWORD=<tu_seed_password> npm run test:e2e
```

O con interfaz:

```bash
E2E_LOGIN_PASSWORD=<tu_seed_password> npm run test:e2e:ui
```

## Estructura

- **Camino A:** Escenario 1 (OK → cierre) y Escenario 2 (OBSERVATIONS con nota → cierre).
- **Camino B:** Un caso: Esc. 3 (FAIL sin acción → bloqueado) → Esc. 4 (FAIL + acción sin revalidación → bloqueado) → Esc. 5 (FAIL + acción + OK → cierre).
- **Camino C:** Un caso: Esc. 3 → Esc. 4 → Esc. 6 (FAIL + acción + OBSERVATIONS → cierre).

Configuración en `playwright.config.ts`; helpers en `helpers.ts`.
