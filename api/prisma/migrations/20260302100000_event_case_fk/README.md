# Migración: FK Event → Case

Añade la restricción de integridad referencial `Event.caseId` → `Case.id`.

## 1) Chequeo previo: ¿hay eventos huérfanos?

```bash
cd api
node scripts/check-event-orphans.cjs
```

O en SQL:

```sql
SELECT COUNT(*) AS orphan_events
FROM "Event" e
LEFT JOIN "Case" c ON c.id = e."caseId"
WHERE c.id IS NULL;
```

- Si da **0** → puedes migrar tranquilo.
- Si da **>0** → hay que corregir antes.

## 2) Plan de corrección (piloto)

Si es piloto y esos eventos no importan, lo más práctico es borrarlos:

```sql
DELETE FROM "Event" e
WHERE NOT EXISTS (
  SELECT 1 FROM "Case" c WHERE c.id = e."caseId"
);
```

**Alternativa conservadora:** exportar a CSV antes si quieres conservar los datos.

## 3) Aplicar migración

- **Desarrollo:**
  ```bash
  cd api
  npx prisma migrate dev
  ```

- **Producción / staging:**
  ```bash
  cd api
  npx prisma migrate deploy
  ```

## Nota

No requiere cambios en `cases.service.ts`; la FK solo refuerza integridad en BD.
