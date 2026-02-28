/**
 * Crea la base scce_test con dueño scce y esquema public usable.
 * Ejecutar como usuario con permisos de superusuario (postgres).
 * Uso: desde api/  →  node scripts/run-create-scce-test-db.cjs
 */
const { execSync } = require("child_process");

function run(cmd, ignoreExitCode = false) {
  try {
    execSync(cmd, { stdio: "inherit", shell: true });
  } catch (e) {
    if (!ignoreExitCode || e.status === 0) throw e;
  }
}

// Idempotente: si la DB ya existe, CREATE falla; igual aplicamos OWNER y schema
run('psql -U postgres -c "CREATE DATABASE scce_test OWNER scce;"', true);
run('psql -U postgres -c "ALTER DATABASE scce_test OWNER TO scce;"');
run('psql -U postgres -d scce_test -c "ALTER SCHEMA public OWNER TO scce;"');

console.log("scce_test lista. Siguiente: npm run test:e2e:prep && npm run test:e2e");
