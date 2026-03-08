import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Regiones (tabla Region): IDs "01".."16" para FK si aplica.
 * Códigos de catálogo/front: AYP, TRP, ANT, ATA, COQ, VAL, OHI, MAU, NUB, BIO, ARA, LRI, LLA, AIS, MAG, MET.
 */
const REGIONS: { id: string; name: string }[] = [
  { id: "01", name: "Tarapacá" },
  { id: "02", name: "Antofagasta" },
  { id: "03", name: "Atacama" },
  { id: "04", name: "Coquimbo" },
  { id: "05", name: "Valparaíso" },
  { id: "06", name: "Metropolitana de Santiago" },
  { id: "07", name: "O'Higgins" },
  { id: "08", name: "Maule" },
  { id: "09", name: "Ñuble" },
  { id: "10", name: "Biobío" },
  { id: "11", name: "La Araucanía" },
  { id: "12", name: "Los Ríos" },
  { id: "13", name: "Los Lagos" },
  { id: "14", name: "Aysén" },
  { id: "15", name: "Magallanes" },
  { id: "16", name: "Arica y Parinacota" }
];

/** Códigos de región del catálogo (front). Un DR por región. */
const REGION_CODES = ["AYP", "TRP", "ANT", "ATA", "COQ", "VAL", "OHI", "MAU", "NUB", "BIO", "ARA", "LRI", "LLA", "AIS", "MAG", "MET"] as const;

async function main() {
  // 1) Regiones (tabla Region)
  for (const r of REGIONS) {
    await prisma.region.upsert({
      where: { id: r.id },
      update: { name: r.name },
      create: { id: r.id, name: r.name }
    });
  }

  // --- SEED_PASSWORD obligatorio (no hardcode, no logs) ---
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword) throw new Error("SEED_PASSWORD missing");

  // Huella: no muestra la clave, solo longitud y últimos 2 caracteres
  const tail2 = seedPassword.slice(-2);
  console.log(`SEED_PASSWORD len=${seedPassword.length} tail2=${tail2}`);

  if (seedPassword.trim().length < 12) {
    throw new Error(
      "SEED_PASSWORD no está definido (o es muy corto). Define SEED_PASSWORD en el entorno antes de ejecutar el seed."
    );
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  // 2) 16 usuarios DR (uno por Director Regional)
  for (const code of REGION_CODES) {
    const email = `dr.${code.toLowerCase()}@scce.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        isActive: true,
        // NO actualizar passwordHash: la contraseña se fija solo al crear
      },
      create: {
        email,
        passwordHash,
        isActive: true,
      },
    });
    const existing = await prisma.membership.findFirst({
      where: { userId: user.id, contextType: "OPERACION", contextId: "GLOBAL", regionCode: code }
    });
    if (existing) {
      await prisma.membership.update({
        where: { id: existing.id },
        data: { regionScopeMode: "LIST", regionScope: [code] }
      });
    } else {
      await prisma.membership.create({
        data: {
          userId: user.id,
          contextType: "OPERACION",
          contextId: "GLOBAL",
          regionCode: code,
          role: "DR",
          regionScopeMode: "LIST",
          regionScope: [code]
        }
      });
    }
    // Regla: toda prueba nace en SIMULACION. Membership de prueba para E2E/manual.
    const simExisting = await prisma.membership.findFirst({
      where: { userId: user.id, contextType: "SIMULACION", contextId: "e2e", regionCode: code }
    });
    if (!simExisting) {
      await prisma.membership.create({
        data: {
          userId: user.id,
          contextType: "SIMULACION",
          contextId: "e2e",
          regionCode: code,
          role: "DR",
          regionScopeMode: "LIST",
          regionScope: [code]
        }
      });
    }
  }

  // 3) Admin piloto: si existe, actualiza passwordHash; si no existe, lo crea.
  const adminEmail = "admin.piloto@scce.local";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      isActive: true,
    },
  });

  // Quitar memberships viejos de admin para recrear los actuales (2 OPERACION + 16 SIMULACION)
  await prisma.membership.deleteMany({
    where: { userId: admin.id }
  });

  const adminMemberships: Array<{
    regionCode: string;
    role: "DR" | "ADMIN_PILOTO";
    regionScopeMode: "ALL" | "LIST";
    regionScope: string[];
  }> = [
    { regionCode: "TRP", role: "DR", regionScopeMode: "LIST", regionScope: ["TRP"] },
    { regionCode: "ADM", role: "ADMIN_PILOTO", regionScopeMode: "ALL", regionScope: [] }
  ];

  for (const m of adminMemberships) {
    const existing = await prisma.membership.findFirst({
      where: { userId: admin.id, contextType: "OPERACION", contextId: "GLOBAL", regionCode: m.regionCode }
    });
    if (existing) {
      await prisma.membership.update({
        where: { id: existing.id },
        data: { regionScopeMode: m.regionScopeMode, regionScope: m.regionScope, role: m.role }
      });
    } else {
      await prisma.membership.create({
        data: {
          userId: admin.id,
          contextType: "OPERACION",
          contextId: "GLOBAL",
          regionCode: m.regionCode,
          role: m.role,
          regionScopeMode: m.regionScopeMode,
          regionScope: m.regionScope
        }
      });
    }
  }
  // Admin piloto: SIMULACION/e2e en las 16 regiones (role ADMIN_PILOTO), una por región.
  for (const code of REGION_CODES) {
    const existing = await prisma.membership.findFirst({
      where: {
        userId: admin.id,
        contextType: "SIMULACION",
        contextId: "e2e",
        regionCode: code,
      },
    });
    if (existing) {
      await prisma.membership.update({
        where: { id: existing.id },
        data: { role: "ADMIN_PILOTO", regionScopeMode: "LIST", regionScope: [code] },
      });
    } else {
      await prisma.membership.create({
        data: {
          userId: admin.id,
          contextType: "SIMULACION",
          contextId: "e2e",
          regionCode: code,
          role: "ADMIN_PILOTO",
          regionScopeMode: "LIST",
          regionScope: [code],
        },
      });
    }
  }

  // 4) Equipo regional por región: solo SIMULACION/e2e, sin OPERACION (política Fase 1).
  const EQUIPO_PER_REGION = 2;
  for (const code of REGION_CODES) {
    for (let i = 1; i <= EQUIPO_PER_REGION; i++) {
      const email = `equipo.${code.toLowerCase()}.${i}@scce.local`;
      const user = await prisma.user.upsert({
        where: { email },
        update: { isActive: true },
        create: { email, passwordHash, isActive: true },
      });
      const existing = await prisma.membership.findFirst({
        where: { userId: user.id, contextType: "SIMULACION", contextId: "e2e", regionCode: code }
      });
      if (!existing) {
        await prisma.membership.create({
          data: {
            userId: user.id,
            contextType: "SIMULACION",
            contextId: "e2e",
            regionCode: code,
            role: "EQUIPO_REGIONAL",
            regionScopeMode: "LIST",
            regionScope: [code],
          },
        });
      }
    }
  }

  console.log("✅ Seed OK — Piloto 16 DR + admin + equipo regional");
  console.log("--- 16 Directores Regionales (OPERACION/GLOBAL + SIMULACION/e2e por región) ---");
  REGION_CODES.forEach(code => console.log("  ", `dr.${code.toLowerCase()}@scce.local`));
  console.log("--- Admin piloto (OPERACION: 2; SIMULACION/e2e: 16 regiones) ---");
  console.log("  ", adminEmail);
  console.log("--- Equipo regional (solo SIMULACION/e2e, 2 por región) ---");
  REGION_CODES.forEach(code => console.log("  ", `equipo.${code.toLowerCase()}.1@scce.local`, `equipo.${code.toLowerCase()}.2@scce.local`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
