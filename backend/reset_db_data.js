const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting transactional data cleanup...");

  // Delete in order of dependencies (child tables first)
  
  console.log("Clearing Refresh Tokens & Audit Logs...");
  await prisma.refreshToken.deleteMany({});
  await prisma.auditLog.deleteMany({});

  console.log("Clearing Chat Messages & Channels...");
  await prisma.chatMessage.deleteMany({});
  await prisma.channelMember.deleteMany({});
  await prisma.chatChannel.deleteMany({});

  console.log("Clearing Notifications & Comments...");
  await prisma.notification.deleteMany({});
  await prisma.comment.deleteMany({});

  console.log("Clearing Approvals & Hierarchy Requests...");
  await prisma.requestAuditLog.deleteMany({});
  await prisma.hierarchyRequest.deleteMany({});

  console.log("Clearing Eod Reports & Tasks...");
  await prisma.eodReport.deleteMany({});
  await prisma.task.deleteMany({});

  console.log("Clearing Sizing Requests...");
  await prisma.sizingRequest.deleteMany({});

  console.log("Clearing Field Work Jobs & Assets...");
  await prisma.fieldWorkAsset.deleteMany({});
  await prisma.fieldWorkJob.deleteMany({});

  console.log("Clearing POS Sales & Payments...");
  await prisma.posSale.deleteMany({});
  await prisma.payment.deleteMany({});

  console.log("Clearing other transactional data...");
  await prisma.attendanceLog.deleteMany({});
  await prisma.inventoryRequest.deleteMany({});
  await prisma.financeCenterRecord.deleteMany({});
  await prisma.peachtreeImport.deleteMany({});
  await prisma.syncMutation.deleteMany({});
  await prisma.syncConflict.deleteMany({});

  console.log("Cleanup completed successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
