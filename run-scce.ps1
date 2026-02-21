# run-scce.ps1 — Runner SCCE (seguro / no toca código)
$ErrorActionPreference = "Stop"

$root = "C:\Users\arang\OneDrive\Escritorio\0001 SCCE_REVISION"
$proj = Join-Path $root "scce-app"
$npm  = "C:\Program Files\nodejs\npm.cmd"

Set-Location $proj
Write-Host ("[SCCE] Carpeta activa: " + (Get-Location).Path)

if ($args.Count -eq 0) {
  Write-Host "[SCCE] Uso: .\run-scce.ps1 dev | build | lint | preview"
  exit 0
}

$cmd = $args[0].ToLowerInvariant()

switch ($cmd) {
  "dev"     { & $npm run dev }
  "build"   { & $npm run build }
  "lint"    { & $npm run lint }
  "preview" { & $npm run preview }
  default   { throw "Comando no reconocido: $cmd (usa dev|build|lint|preview)" }
}
