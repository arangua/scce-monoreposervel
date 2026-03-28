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
  if (!seedPassword || seedPassword.trim().length < 12) {
    throw new Error(
      "SEED_PASSWORD no está definido (o es muy corto). Define SEED_PASSWORD en el entorno antes de ejecutar el seed."
    );
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  // Helper: upsert un membership dado contextType + contextId + regionCode
  async function upsertMembership(params: {
    userId: string;
    contextType: "OPERACION" | "SIMULACION";
    contextId: string;
    regionCode: string;
    role: "DR" | "ADMIN_PILOTO";
    regionScopeMode: "ALL" | "LIST";
    regionScope: string[];
  }) {
    const existing = await prisma.membership.findFirst({
      where: {
        userId: params.userId,
        contextType: params.contextType,
        contextId: params.contextId,
        regionCode: params.regionCode,
      }
    });
    if (existing) {
      await prisma.membership.update({
        where: { id: existing.id },
        data: {
          regionScopeMode: params.regionScopeMode,
          regionScope: params.regionScope,
          role: params.role,
        }
      });
    } else {
      await prisma.membership.create({
        data: {
          userId: params.userId,
          contextType: params.contextType,
          contextId: params.contextId,
          regionCode: params.regionCode,
          role: params.role,
          regionScopeMode: params.regionScopeMode,
          regionScope: params.regionScope,
        }
      });
    }
  }

  // 2) 16 usuarios DR (solo si SEED_FULL está definido; por defecto piloto mínimo = solo admin)
  if (process.env.SEED_FULL) {
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
      // OPERACION GLOBAL — su región
      await upsertMembership({
        userId: user.id,
        contextType: "OPERACION",
        contextId: "GLOBAL",
        regionCode: code,
        role: "DR",
        regionScopeMode: "LIST",
        regionScope: [code],
      });
      // SIMULACION SIM_1 — su región
      await upsertMembership({
        userId: user.id,
        contextType: "SIMULACION",
        contextId: "SIM_1",
        regionCode: code,
        role: "DR",
        regionScopeMode: "LIST",
        regionScope: [code],
      });
    }
  }

  // 3) Admin piloto: 1 usuario, solo 2 memberships (DR TRP + ADMIN_PILOTO global)
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || "admin.piloto@scce.local";
  if (!adminEmail) {
    throw new Error("SEED_ADMIN_EMAIL está vacío.");
  }
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      isActive: true,
      // NO actualizar passwordHash: la contraseña se fija solo al crear
    },
    create: {
      email: adminEmail,
      passwordHash,
      isActive: true,
    },
  });

  // Quitar memberships viejos de admin para que solo queden los 4 del piloto
  await prisma.membership.deleteMany({
    where: { userId: admin.id }
  });

  // 4 memberships del admin: OPERACION + SIMULACION × (DR TRP + ADMIN_PILOTO ALL)
  const adminMemberships: Array<{
    contextType: "OPERACION" | "SIMULACION";
    contextId: string;
    regionCode: string;
    role: "DR" | "ADMIN_PILOTO";
    regionScopeMode: "ALL" | "LIST";
    regionScope: string[];
  }> = [
    // --- OPERACION ---
    { contextType: "OPERACION",  contextId: "GLOBAL", regionCode: "TRP", role: "DR",          regionScopeMode: "LIST", regionScope: ["TRP"] },
    { contextType: "OPERACION",  contextId: "GLOBAL", regionCode: "ADM", role: "ADMIN_PILOTO", regionScopeMode: "ALL",  regionScope: [] },
    // --- SIMULACION ---
    { contextType: "SIMULACION", contextId: "SIM_1",  regionCode: "TRP", role: "DR",          regionScopeMode: "LIST", regionScope: ["TRP"] },
    { contextType: "SIMULACION", contextId: "SIM_1",  regionCode: "ADM", role: "ADMIN_PILOTO", regionScopeMode: "ALL",  regionScope: [] },
  ];

  for (const m of adminMemberships) {
    await upsertMembership({
      userId: admin.id,
      contextType: m.contextType,
      contextId: m.contextId,
      regionCode: m.regionCode,
      role: m.role,
      regionScopeMode: m.regionScopeMode,
      regionScope: m.regionScope,
    });
  }

  console.log("\n✅ Seed OK");
  if (process.env.SEED_FULL) {
    console.log("--- 16 Directores Regionales (2 memberships c/u: OPERACION + SIMULACION, scope = su región) ---");
    REGION_CODES.forEach(code => console.log(`    dr.${code.toLowerCase()}@scce.local`));
    console.log(`    Total DR memberships: ${REGION_CODES.length * 2}`);
  }
  console.log("--- Admin piloto (4 memberships: DR TRP ×2 + ADMIN_PILOTO ×2, ambos contextos) ---");
  console.log(`    ${adminEmail}`);
  console.log(`    OPERACION/GLOBAL · TRP (DR)`);
  console.log(`    OPERACION/GLOBAL · ADM (ADMIN_PILOTO · todas las regiones)`);
  console.log(`    SIMULACION/SIM_1 · TRP (DR)`);
  console.log(`    SIMULACION/SIM_1 · ADM (ADMIN_PILOTO · todas las regiones)`);
  if (process.env.SEED_FULL) {
    console.log(`\n    Total memberships en BD: ${REGION_CODES.length * 2 + 4} (${REGION_CODES.length} DRs ×2 + admin ×4)`);
  } else {
    console.log(`\n    Total memberships en BD: 4 (solo admin piloto)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
