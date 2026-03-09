// SELECT casos con regionCode NULL o vacío (integridad)
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT id, "regionCode"
    FROM "Case"
    WHERE "regionCode" IS NULL OR btrim("regionCode") = ''
  `;
  console.log("Casos con regionCode NULL o vacío:", rows.length);
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
