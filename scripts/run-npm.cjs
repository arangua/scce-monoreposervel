// scripts/run-npm.cjs
const { spawnSync } = require("node:child_process");
const path = require("node:path");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

// args: --cwd <dir> <npm-args...>
// example: node scripts/run-npm.cjs --cwd api run start:dev
const argv = process.argv.slice(2);
const cwdIdx = argv.indexOf("--cwd");
if (cwdIdx === -1) die("Uso: node scripts/run-npm.cjs --cwd <dir> <npm args...>");

const cwdRel = argv[cwdIdx + 1];
if (!cwdRel) die("Falta valor para --cwd");

const npmArgs = argv.slice(cwdIdx + 2);
if (npmArgs.length === 0) die("Faltan argumentos npm (ej: run dev)");

const repoRoot = path.resolve(__dirname, "..");
const cwd = path.resolve(repoRoot, cwdRel);

// Buscar npm.cmd real (evita alias/funciones)
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

// Ejecutar npm con cwd forzado (shell: true en Windows para resolver npm.cmd en PATH)
const r = spawnSync(npmCmd, npmArgs, {
  cwd,
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(r.status ?? 1);
