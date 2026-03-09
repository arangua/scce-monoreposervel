import { spawnSync } from "node:child_process";

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  return r.status !== undefined && r.status !== null ? r.status : 1;
}

let exitCode = 0;
try {
  exitCode = run("npm", ["run", "e2e:up"]);
  if (exitCode !== 0) throw new Error("e2e:up failed");

  exitCode = run("npm", ["run", "e2e:wait"]);
  if (exitCode !== 0) throw new Error("e2e:wait failed");

  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const schemaName =
    process.env.E2E_SCHEMA ||
    `e2e_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}_${Math.floor(Math.random() * 1000)}`;

  const DB_BASE = "postgresql://scce:scce@localhost:54329/scce_test";
  const DB = `${DB_BASE}?schema=${schemaName}`;

  // Crear schema dentro del contenedor (psql viene en la imagen postgres)
  exitCode ||= run("docker", [
    "exec",
    "scce_pg_e2e",
    "psql",
    "-U",
    "scce",
    "-d",
    "scce_test",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
  ]);

  exitCode ||= run("docker", [
    "exec",
    "scce_pg_e2e",
    "psql",
    "-U",
    "scce",
    "-d",
    "scce_test",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `GRANT ALL ON SCHEMA "${schemaName}" TO scce;`,
  ]);

  exitCode ||= run("npm", ["--prefix", "api", "run", "prisma:migrate:deploy"], { DATABASE_URL: DB });
  exitCode ||= run("npm", ["--prefix", "api", "run", "prisma:generate"], { DATABASE_URL: DB });
  exitCode ||= run("npm", ["--prefix", "api", "run", "test:e2e"], { DATABASE_URL: DB });
} finally {
  spawnSync("npm", ["run", "e2e:down"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
}

process.exit(exitCode ?? 0);
