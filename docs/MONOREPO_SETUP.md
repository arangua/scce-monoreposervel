# Monorepo SCCE — Setup

## Estructura

- **Raíz:** `package.json` con workspaces `scce-app`, `api`, `packages/*`
- **scce-app:** frontend Vite + React
- **api:** NestJS + Prisma, PostgreSQL

## Comandos (ejecutar desde la raíz del repo)

```bash
cd "c:\Users\arang\OneDrive\Escritorio\0001 SCCE_REVISION"
```

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar PostgreSQL (Docker)

Abre Docker Desktop y luego:

```bash
npm run db:up
npm run db:logs
```

Espera a ver "database system is ready to accept connections".

### 3. Migraciones y seed

```bash
npm run db:migrate
npm run db:seed
```

### 4. Desarrollo (API + app)

```bash
npm run dev
```

- App: normalmente http://localhost:5173
- API: normalmente http://localhost:3000

## Si el terminal ejecuta npm en otro proyecto

Ejecuta los comandos desde la raíz **0001 SCCE_REVISION** en una terminal nueva (sin perfiles que cambien el directorio). O instala en api manualmente:

```bash
cd api
npm install
npx prisma generate
cd ..
```

Luego, con Docker levantado, desde la raíz:

```bash
npm run db:migrate
npm run db:seed
```

## Credenciales admin piloto (seed)

- **Email:** admin.piloto@scce.local  
- **Pass:** SCCE-Piloto-2026!

## Variables

- **api/.env:** `DATABASE_URL="postgresql://scce:scce_dev_password@localhost:5432/scce?schema=public"`
