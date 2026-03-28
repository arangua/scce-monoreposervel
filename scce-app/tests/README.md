# SCCE — Suite de Tests E2E con Playwright

## Instalación (solo la primera vez)

```powershell
# Desde la carpeta scce-app\
cd scce-app
npm install
npx playwright install chromium
```

---

## Cómo ejecutar — guía rápida

### Opción A — Ver los tests ejecutarse (recomendado para empezar)

```powershell
npm run test:e2e:slow
```

Abre Chrome, ejecuta **todos** los tests con una pausa de ~1 segundo entre cada
acción. Puedes ver exactamente qué hace Playwright: rellena campos, hace clics,
verifica textos. Velocidad ideal para entender qué cubre cada test.

```powershell
npm run test:e2e:watch
```

Lo mismo pero más rápido (~0.4s entre acciones). Útil cuando ya conoces la suite
y quieres verificar que todo pasa sin esperar demasiado.

---

### Opción B — UI interactiva (la más cómoda para depurar fallos)

```powershell
npm run test:e2e:ui
```

Abre la interfaz propia de Playwright. Desde ahí puedes:
- Ver la lista de todos los tests
- Ejecutar uno solo haciendo clic
- Ver paso a paso qué hizo cada test
- Ver el snapshot visual del momento exacto en que falló

---

### Opción C — Solo smoke tests (verificación rápida, ~30s)

```powershell
npm run test:e2e:smoke          # headless (sin ventana)
npm run test:e2e:smoke:watch    # con ventana visible
```

Los smoke tests son los más cortos: detectan crashes graves en 30 segundos.
Úsalos antes de cada commit o cambio importante.

---

### Opción D — Suite completa, sin ventana (para validación final)

```powershell
npm run test:e2e
```

Ejecuta todos los tests en segundo plano. Al terminar, muestra el resumen
en la terminal. Si hay fallos, abre el reporte:

```powershell
npm run test:e2e:report
```

---

## Qué cubre cada archivo de test

| Archivo | Qué verifica |
|---------|-------------|
| `01-auth.spec.ts` | Login correcto e incorrecto, selector de contexto, botón Salir, toggle de contraseña |
| `02-dashboard.spec.ts` | Navegación entre las 7 vistas, métricas, toggle Vista OP/Full, menú Acciones |
| `03-nuevo-caso.spec.ts` | Formulario de 4 pasos: validación, llenado, creación real de un caso |
| `04-detalle-caso.spec.ts` | Ver detalle, registrar acción/comentario/decisión, cambio de estado, descarga TXT |
| `05-vistas-secundarias.spec.ts` | Contenido mínimo de Reportes, Auditoría, Simulación, Catálogo, Checklist, Config |
| `06-smoke.spec.ts` | Detecta crashes, texto "undefined" en la UI, errores de consola JavaScript |

---

## Qué hacer cuando un test falla

1. Ejecutar con `npm run test:e2e:ui` para ver el paso exacto que falló
2. Playwright genera un **screenshot automático** en `playwright-report/` del momento del fallo
3. Si el error es que no encontró un texto o botón, probablemente el selector
   necesita ajustarse para que coincida con el texto real de la UI

---

## Prerequisitos para que los tests pasen

Los tests hablan con el backend real. Antes de ejecutar:

```powershell
# 1. Base de datos
npm run db:up         # desde la raíz del monorepo

# 2. Backend NestJS
cd api
npm run start:dev     # puerto 3000

# 3. Tests (desde scce-app\)
cd ..\scce-app
npm run test:e2e:slow
```

El frontend (Vite en puerto 5173) lo levanta Playwright automáticamente.
Si ya tienes `npm run dev` corriendo, lo reutiliza sin levantar uno nuevo.
