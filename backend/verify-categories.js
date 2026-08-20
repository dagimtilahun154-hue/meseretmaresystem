const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mats = await prisma.fieldJobMaterial.findMany({
    select: { name: true, category: true },
    distinct: ['name']
  });
  console.log('Final material categories:');
  mats.forEach(m => console.log(`  [${m.category}] ${m.name}`));
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); });
