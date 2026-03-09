const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");

// Cargar .env.test de api como fuente de verdad
dotenv.config({ path: path.resolve(__dirname, "..", "api", ".env.test") });

const repoRoot = path.resolve(__dirname, "..");
const apiDir = path.join(repoRoot, "api");

function run(cmd, opts = {}) {
  const cwd = opts.cwd ?? repoRoot;
  execSync(cmd, { stdio: "inherit", env: process.env, cwd });
}

// Importante: schema explícito (monorepo)
run("npx prisma generate --schema=api/prisma/schema.prisma");
run("npx prisma migrate deploy --schema=api/prisma/schema.prisma");

// Seed idempotente para E2E (usuario + memberships); usa DATABASE_URL de .env.test
run("npx prisma db seed", { cwd: apiDir });
