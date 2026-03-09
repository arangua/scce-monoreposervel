# Evidencia — Corrección del problema "Render no encuentra archivos domain"

**Fecha:** 2026-03-03  
**Ámbito:** Build de frontend (Render Static Site).

## Problema

Render (Static Site) fallaba porque durante el build del frontend aparecían errores tipo `Cannot find module …`, debido a que 4 archivos existían solo en el PC local y no estaban subidos al repositorio.

## Evidencia

`git status --porcelain` mostró como `??` (untracked, no subidos) los archivos:

- `scce-app/src/domain/dedupe.ts`
- `scce-app/src/domain/eventId.ts`
- `scce-app/src/domain/exportImport.ts`
- `scce-app/src/domain/signingVault.ts`

## Acción ejecutada (resumen)

1. Se creó commit con los 4 archivos: `fix(frontend): add missing domain files for Render build` (hash: `101c3ab`).
2. El push a `main` falló inicialmente por desincronización con GitHub.
3. Resolución:
   - `git stash` (guardar cambios locales temporalmente)
   - `git checkout main`
   - `git pull origin main` (actualizar main local)
   - `git merge wip/after-build-green` (integrar el commit con los 4 archivos)
   - `git push origin main` (subir todo a GitHub)

## Resultado final confirmado (commit domain)

- **Push exitoso:** `main -> main` actualizado en GitHub (commit: `8818730` en `main`).
- Los 4 archivos domain están en el repositorio remoto.

## Paso adicional — IconButton y Badge (commit c232cb1)

También estaban `??` untracked; se subieron en commit separado:

- `scce-app/src/components/IconButton.tsx`
- `scce-app/src/ui/Badge.tsx`

## Evidencia de cierre — Build Render OK (2026-03-03)

**Render Static Site (frontend):** Build exitoso y sitio publicado.

| Campo | Valor |
|-------|-------|
| RENDER_GIT_BRANCH | main |
| RENDER_GIT_COMMIT | c232cb1b2676d5ef8d727a5d3149c9da81f9087f |
| Ruta de build | /opt/render/project/src/scce-app |
| Comando | `tsc -b && vite build` |
| Resultado | ✓ built in 2.85s — Your site is live 🎉 |

**Nota:** "1 high severity vulnerability" — registrado como pendiente de revisión; no bloqueó el deploy.

## Checklist de cierre

| Ítem | Estado |
|------|--------|
| Archivos domain subidos al repo | ✅ |
| IconButton y Badge subidos al repo | ✅ |
| main actualizado en GitHub | ✅ |
| Build Render frontend exitoso | ✅ |
| CORS backend para frontend Render | Pendiente |
