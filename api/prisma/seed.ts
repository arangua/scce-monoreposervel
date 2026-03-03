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
  }

  // 3) Admin piloto: 1 usuario, solo 2 memberships (DR TRP + ADMIN_PILOTO global)
  const adminEmail = "admin.piloto@scce.local";
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

  // Quitar memberships viejos de admin para que solo queden los 2 del piloto
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

  console.log("✅ Seed OK — Piloto 16 DR + admin");
  console.log("--- 16 Directores Regionales (1 membership cada uno, scope = su región) ---");
  REGION_CODES.forEach(code => console.log("  ", `dr.${code.toLowerCase()}@scce.local`));
  console.log("--- Admin piloto (2 memberships: DR TRP + ADMIN_PILOTO) ---");
  console.log("  ", adminEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
