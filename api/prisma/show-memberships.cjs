const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.membership.findMany().then((r) => {
  console.log(JSON.stringify(r, null, 2));
  return p.$disconnect();
}).catch((e) => {
  console.error(e);
  return p.$disconnect();
});
