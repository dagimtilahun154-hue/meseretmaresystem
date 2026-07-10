const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      reportsToId: true,
      department: true
    }
  });
  console.log("--- USERS IN DB ---");
  console.log(JSON.stringify(users, null, 2));

  const requests = await prisma.hierarchyRequest.findMany({
    include: {
      createdBy: { select: { username: true } },
      assignedTo: { select: { username: true } }
    }
  });
  console.log("--- REQUESTS IN DB ---");
  console.log(JSON.stringify(requests, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
