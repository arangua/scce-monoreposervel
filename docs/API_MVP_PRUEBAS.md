# API MVP — Pruebas (health, login, contexts)

## Requisitos

1. **Docker/Postgres arriba** (desde raíz SCCE):
   ```powershell
   & "C:\Program Files\nodejs\npm.cmd" run db:up
   & "C:\Program Files\nodejs\npm.cmd" run db:logs
   ```
   Esperar "ready to accept connections".

2. **Migración + seed**:
   ```powershell
   node scripts/run-npm.cjs --cwd api run prisma:migrate
   node scripts/run-npm.cjs --cwd api run prisma:seed
   ```

3. **API corriendo** (en otra terminal):
   ```powershell
   node scripts/run-npm.cjs --cwd api run start:dev
   ```

## Pruebas (PowerShell, API en 3000)

### 1) Health
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
```
**Esperado:** `ok: true`

### 2) Login admin piloto
```powershell
$body = @{ email="admin.piloto@scce.local"; password="SCCE-Piloto-2026!" } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" -ContentType "application/json" -Body $body
$r
```
**Esperado:** objeto con `token` (string JWT).

### 3) /me y /contexts (con token)
```powershell
$token = $r.token
Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "http://localhost:3000/me"
Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "http://localhost:3000/contexts"
```
**Esperado:** `/me` → usuario (id, email, isActive, createdAt). `/contexts` → `{ memberships: [...] }` (al menos OPERACION/GLOBAL para admin piloto).
