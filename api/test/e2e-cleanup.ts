import { PrismaClient } from "@prisma/client";

export async function e2eCleanup(prisma: PrismaClient) {
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "Event",
        "Case"
      RESTART IDENTITY CASCADE;
    `);
  } catch (e) {
    // En E2E: si la DB no está disponible, no queremos "ensuciar" el diagnóstico principal.
    // Log corto, sin reventar el teardown.
    // eslint-disable-next-line no-console
    console.warn("[e2eCleanup] skipped:", (e as Error)?.message ?? e);
  }
}
