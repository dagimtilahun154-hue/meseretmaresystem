const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.invoice.count();
  console.log("Total Invoice records in Prisma DB:", count);

  const sample = await prisma.invoice.findMany({ take: 10 });
  console.log("Sample Invoice records:");
  console.log(sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
