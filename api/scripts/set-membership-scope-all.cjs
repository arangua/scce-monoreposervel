require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "admin.piloto@scce.local" },
  });
  if (!user) {
    console.error("User not found");
    process.exit(1);
  }
  const updated = await prisma.membership.updateMany({
    where: { userId: user.id },
    data: { regionScopeMode: "ALL", regionScope: [] },
  });
  console.log("Updated to ALL:", updated.count);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
