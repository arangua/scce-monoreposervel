-- Base de datos de tests E2E. Ejecutar como superusuario (postgres).
-- Deja scce_test con dueño scce y esquema public usable (evita "permiso denegado al esquema public").
--
-- Repetible en una sola acción (desde api/):  node scripts/run-create-scce-test-db.cjs
-- O con psql:
--   psql -U postgres -c "CREATE DATABASE scce_test OWNER scce; ALTER DATABASE scce_test OWNER TO scce;"
--   psql -U postgres -d scce_test -c "ALTER SCHEMA public OWNER TO scce;"
--
-- Manual en pgAdmin/DBeaver: ejecutar Parte 1 conectado a postgres; luego conectar a scce_test y ejecutar Parte 2.

-- ---------- Parte 1: conectado a la base postgres ----------
CREATE DATABASE scce_test OWNER scce;
ALTER DATABASE scce_test OWNER TO scce;

-- ---------- Parte 2: conectado a la base scce_test (no ejecutar estando en postgres) ----------
-- ALTER SCHEMA public OWNER TO scce;
