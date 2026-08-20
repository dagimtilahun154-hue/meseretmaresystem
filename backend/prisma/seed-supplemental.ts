import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding supplemental data...");

  // 1. Standard Chart of Accounts (Baseline)
  const defaultAccounts = [
    { id: "ACC-1010", name: "Cash on Hand", type: "Asset", openingBalance: 0 },
    { id: "ACC-1020", name: "Bank Account (CBE / Awash)", type: "Asset", openingBalance: 0 },
    { id: "ACC-1200", name: "Accounts Receivable", type: "Asset", openingBalance: 0 },
    { id: "ACC-1300", name: "Inventory Asset", type: "Asset", openingBalance: 0 },
    { id: "ACC-2010", name: "Accounts Payable", type: "Liability", openingBalance: 0 },
    { id: "ACC-3010", name: "Owner's Equity", type: "Equity", openingBalance: 0 },
    { id: "ACC-4010", name: "Sales Revenue", type: "Revenue", openingBalance: 0 },
    { id: "ACC-5010", name: "Cost of Goods Sold", type: "Expense", openingBalance: 0 },
    { id: "ACC-6010", name: "Operating Expenses", type: "Expense", openingBalance: 0 },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: { id: acc.id },
      update: { name: acc.name, type: acc.type },
      create: {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        openingBalance: acc.openingBalance,
      },
    });
  }

  // 2. Default HR Settings
  await prisma.hrSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Meseret Mare Solar",
      workStartTime: "08:00",
      workEndTime: "17:00",
      gracePeriodMinutes: 15,
    },
  });

  console.log("Baseline chart of accounts and settings seeded successfully (Zero dummy records).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
