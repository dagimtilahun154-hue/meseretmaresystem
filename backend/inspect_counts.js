const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const models = [
    "user", "organization", "company", "role", "permission", "userRole", "rolePermission", 
    "userCompany", "refreshToken", "auditLog", "product", "posSale", "fieldWorkJob", 
    "customer", "serviceTicket", "vendor", "account", "invoice", "bill", "payment", 
    "expense", "financeJournalEntry", "hrDepartment", "hrWorker", "hrSetting", 
    "attendanceLog", "inventoryRequest", "financeCenterRecord", "peachtreeImport", 
    "syncDevice", "syncMutation", "syncConflict", "pumpProduct", "pumpCategory", 
    "hierarchyRequest", "requestAuditLog", "eodReport", "task", "comment", 
    "chatChannel", "channelMember", "chatMessage", "notification", "sizingRequest", 
    "companyAsset", "fieldWorkAsset"
  ];

  console.log("=== TABLE COUNTS ===");
  for (const model of models) {
    try {
      const count = await prisma[model].count();
      if (count > 0) {
        console.log(`${model}: ${count}`);
      }
    } catch (e) {
      console.log(`Failed to count ${model}: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
