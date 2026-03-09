# Prueba manual: NewCaseForm con territorio CUT en Tarapacá

**Objetivo:** Validar de punta a punta que el formulario de nuevo caso funciona con comunas reales (CUT) y que el mapeo a código interno para locales no rompe el flujo.

**Precondiciones:**
- API levantada (`api`: `npm run start:dev`) con BD con seed territorial (16 regiones, 56 provincias, 346 comunas).
- App levantada (`scce-app`: `npm run dev`).
- Usuario con región TRP (ej. dr.trp@scce.local o usuario demo TRP).
- Contexto SIMULACIÓN u OPERACIÓN según corresponda.

---

## Checklist

### 1. Región TRP
- [ ] Ir a **Nuevo incidente** (botón "+ Incidente" o "+ Nuevo incidente").
- [ ] En **Región**, elegir **Tarapacá** (o la opción que corresponda a TRP).
- [ ] Confirmar que el valor seleccionado es TRP (si inspeccionas el `<select>`, el `value` debe ser `TRP`).

### 2. Comuna desde API (CUT)
- [ ] En **Comuna**, comprobar que aparecen opciones cargadas desde la API (nombres reales).
- [ ] Elegir **Iquique** o **Alto Hospicio**.
- [ ] Confirmar que el selector de **Local de votación** **no queda vacío** (debe mostrar locales del catálogo para esa comuna).

### 3. Local y envío
- [ ] Elegir un **local válido** (ej. "Liceo Arturo Pérez Canto" si elegiste Iquique).
- [ ] Completar **Resumen** y resto de pasos (Evaluación, Detalles, Confirmar).
- [ ] Pulsar **Registrar incidente**.
- [ ] Confirmar que **no aparece error de validación** y que el caso se crea (vuelves al listado o ves mensaje de éxito).

### 4. Datos guardados
- [ ] Abrir el caso recién creado.
- [ ] Comprobar que **communeCode** quedó en **CUT** (ej. `1101` para Iquique, `1107` para Alto Hospicio).  
  - Si la API devuelve el caso, revisar `communeCode` en la respuesta o en la ficha.
- [ ] Comprobar que el **local** seleccionado es el correcto (nombre y datos del snapshot si aplica).

---

## Resultado esperado

| Paso              | Esperado                                                                 |
|-------------------|--------------------------------------------------------------------------|
| Región            | TRP seleccionado y estable.                                               |
| Comuna            | Lista real (Iquique, Alto Hospicio, …); valor CUT (1101, 1107, …).      |
| Locales           | Selector con opciones (mapeo CUT→interno aplicado).                       |
| Validación        | Pasa sin error.                                                          |
| Caso creado      | Sí.                                                                      |
| communeCode       | CUT (1101 / 1107).                                                       |
| Local             | Correcto.                                                                |

Si algún ítem falla, anotar en qué paso y qué mensaje o comportamiento se vio.

---

## E2E automatizado

Mismo flujo cubierto por un test Playwright (comuna por etiqueta "Iquique", compatible con CUT):

```bash
cd scce-app
E2E_LOGIN_PASSWORD=<seed_password> npx playwright test e2e/territory-cut-newcase.spec.ts
```
