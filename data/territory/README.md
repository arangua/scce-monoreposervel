# Datos territoriales SCCE

Fuente de verdad del maestro de comunas de Chile para validación e importación.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| **chile_communes_master_v1.csv** | Maestro de las 346 comunas. 9 columnas según [TERRITORIAL_MASTER_IMPORT_SPEC_V1.md](../../docs/territory/TERRITORIAL_MASTER_IMPORT_SPEC_V1.md). Códigos CUT (fuente bdcut-cl, alineado a CUT-2018). UTF-8 con BOM. |

## Regeneración

Sin tocar BD ni migraciones:

```bash
node scripts/territory-build-master.cjs
```

El script descarga el CSV desde [bdcut-cl](https://github.com/knxroot/bdcut-cl) (BD/CSV_utf8) y genera `chile_communes_master_v1.csv`. Si existe `data/territory/bdcut_source.csv`, se usa ese archivo en lugar de descargar.

## Validación (V1–V6)

Antes de usar el maestro para seed/import, validar contra la especificación:

```bash
node scripts/territory-validate-master.cjs
```

- **Salida:** reporte en consola (filas procesadas/válidas/inválidas, resultado por V1–V6, APROBADO/RECHAZADO).
- **Exit code:** 0 = APROBADO, 1 = RECHAZADO (para uso en CI o pipelines).

## Carga en base de datos

Tras validar (APROBADO), cargar el maestro en la BD con el seed territorial (idempotente):

```bash
cd api
npx prisma migrate deploy   # si aún no está aplicada la migración Province/Commune
npm run prisma:seed:territory
```

- Lee `data/territory/chile_communes_master_v1.csv`, valida V1–V6 y aborta si falla.
- Upsert en orden: regiones → provincias → comunas (16, 56, 346).
- No modifica catálogos, casos, permisos ni frontend.

## Referencias

- [CHILE_TERRITORIAL_MASTER_V1.md](../../docs/territory/CHILE_TERRITORIAL_MASTER_V1.md) — modelo y reglas.
- [TERRITORIAL_MASTER_IMPORT_SPEC_V1.md](../../docs/territory/TERRITORIAL_MASTER_IMPORT_SPEC_V1.md) — formato de importación y validaciones.
