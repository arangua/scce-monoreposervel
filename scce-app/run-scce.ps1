# run-scce.ps1 — SCCE runner (Enterprise-safe): ignora wrappers ajenos
param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("dev","build","typecheck")]
  [string]$task
)
$ErrorActionPreference = "Stop"

$SCCE = Split-Path -Parent $MyInvocation.MyCommand.Path
$NPM  = "C:\Program Files\nodejs\npm.cmd"

if (!(Test-Path $NPM)) { throw "No se encontró npm.cmd en: $NPM" }
if (!(Test-Path (Join-Path $SCCE "package.json"))) { throw "No se encontró package.json en: $SCCE" }

Write-Host "✅ Ejecutando SCCE desde: $SCCE"
Write-Host "✅ NPM real: $NPM"

& $NPM --prefix $SCCE run $task
exit $LASTEXITCODE
