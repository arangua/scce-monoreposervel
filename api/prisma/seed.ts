import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Regiones: deja IDs simples "01".."16".
 * Si ya tienes una codificación propia SCCE (RegionCode), la ajustamos después.
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

async function main() {
  // 1) Regiones
  for (const r of REGIONS) {
    await prisma.region.upsert({
      where: { id: r.id },
      update: { name: r.name },
      create: { id: r.id, name: r.name }
    });
  }

  // 2) Admin piloto (credenciales iniciales)
  const adminEmail = "admin.piloto@scce.local";
  const adminPass = "SCCE-Piloto-2026!";
  const passwordHash = await bcrypt.hash(adminPass, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, isActive: true },
    create: { email: adminEmail, passwordHash, isActive: true }
  });

  // Membership global: OPERACION + contextId="GLOBAL" + regionCode
  const existing = await prisma.membership.findFirst({
    where: { userId: admin.id, contextType: "OPERACION", contextId: "GLOBAL", regionCode: "TRP" }
  });
  if (!existing) {
    await prisma.membership.create({
      data: {
        userId: admin.id,
        contextType: "OPERACION",
        contextId: "GLOBAL",
        regionCode: "TRP",
        role: "ADMIN_PILOTO"
      }
    });
  }

  console.log("✅ Seed OK");
  console.log("ADMIN:", adminEmail);
  console.log("PASS :", adminPass);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
