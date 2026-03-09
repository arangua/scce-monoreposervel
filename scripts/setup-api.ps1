# Run from repo root: .\scripts\setup-api.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$root\api\package.json")) { throw "api/package.json not found. Run from repo root." }
Push-Location "$root\api"
try {
    npm install
    npx prisma generate
    Write-Host "Prisma generate OK. Run 'npm run db:up' then 'npm run db:migrate' and 'npm run db:seed' from repo root when Docker is available."
} finally {
    Pop-Location
}
