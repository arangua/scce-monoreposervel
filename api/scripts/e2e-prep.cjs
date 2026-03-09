"use strict";
const path = require("path");
const { execSync } = require("child_process");

// Cargar .env.test para que prisma use la DB de test
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.test") });

const run = (cmd) => execSync(cmd, { stdio: "inherit", cwd: path.resolve(__dirname, "..") });
run("npx prisma generate");
run("npx prisma migrate deploy");
