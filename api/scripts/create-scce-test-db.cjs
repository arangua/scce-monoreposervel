// api/scripts/create-scce-test-db.cjs
// Crea la base scce_test en el mismo Postgres donde apunta DATABASE_URL (sin usar psql).
// Uso: desde api/ -> node scripts/create-scce-test-db.cjs
// Requiere: npm i pg

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Client } = require("pg");

function must(v, name) {
  if (!v) throw new Error(`Missing ${name}. Define DATABASE_URL in api/.env`);
  return v;
}

function buildAdminUrl(dbUrl) {
  const u = new URL(dbUrl);
  // Conectamos a una DB existente para poder ejecutar CREATE DATABASE.
  // "postgres" suele existir siempre.
  u.pathname = "/postgres";
  // Remueve schema/query si existe; no lo necesitamos para CREATE DATABASE
  u.search = "";
  return u.toString();
}

async function main() {
  const dbUrl = must(process.env.DATABASE_URL, "DATABASE_URL");
  const adminUrl = buildAdminUrl(dbUrl);

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  const dbName = "scce_test";

  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );

  if (exists.rowCount > 0) {
    console.log(`OK: database "${dbName}" already exists`);
  } else {
    // CREATE DATABASE no debe correr dentro de una transacción.
    // node-postgres ejecuta en autocommit, así que está OK.
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`CREATED: database "${dbName}"`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  if (err.message.includes("permiso") && err.message.includes("crear")) {
    console.error("");
    console.error("Si el usuario de DATABASE_URL no tiene CREATEDB, crea la DB como superuser (postgres):");
    console.error('  En pgAdmin/DBeaver conectado como postgres: CREATE DATABASE scce_test;');
    console.error("  Luego vuelve a ejecutar este script (dirá 'already exists') y npm run test:e2e:prep.");
  }
  process.exit(1);
});
