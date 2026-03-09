// One-off: set admin membership to regionScopeMode LIST, regionScope ["TRP"]
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "admin.piloto@scce.local" },
  });
  if (!user) {
    console.error("User admin.piloto@scce.local not found");
    process.exit(1);
  }
  const updated = await prisma.membership.updateMany({
    where: { userId: user.id },
    data: { regionScopeMode: "LIST", regionScope: ["TRP"] },
  });
  console.log("Updated memberships:", updated.count);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
