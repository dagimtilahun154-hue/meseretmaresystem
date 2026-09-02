const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedAccounts() {
  const accounts = [
    { id: "11-1-001", name: "Petty Cash on Hand", type: "Cash and Bank", openingBalance: 450.17 },
    { id: "11-2-001", name: "Commercial Bank of Ethiopia (Birr Account)", type: "Cash and Bank", openingBalance: 53986.16 },
    { id: "11-2-002", name: "Awash Bank S.C.", type: "Cash and Bank", openingBalance: 250000.00 },
    { id: "11-2-003", name: "Dashen Bank S.C.", type: "Cash and Bank", openingBalance: 180000.00 },
    { id: "11-2-004", name: "Amhara Bank S.C.", type: "Cash and Bank", openingBalance: 9559.48 },
    { id: "11-2-005", name: "Telebirr Commercial Merchant Wallet", type: "Cash and Bank", openingBalance: 120000.00 },
    { id: "12-1-000", name: "Accounts Receivable - Debtors Control", type: "Accounts Receivable", openingBalance: 6365084.13 },
    { id: "13-1-001", name: "Merchandise Inventory & Stock", type: "Inventory", openingBalance: 4120000.00 },
    { id: "15-1-001", name: "Property, Plant & Equipment", type: "Fixed Asset", openingBalance: 8200000.00 },
    { id: "21-1-001", name: "Accounts Payable Control (Suppliers)", type: "Accounts Payable", openingBalance: 2035865.72 },
    { id: "22-1-001", name: "15% Ethiopian VAT Output Liability", type: "Accounts Payable", openingBalance: 1760447.17 },
    { id: "31-1-001", name: "Owner's Capital & Share Equity", type: "Equity", openingBalance: 6188365.04 },
    { id: "41-1-001", name: "Commercial Sales & Solar Revenue", type: "Revenue", openingBalance: 11736447.79 },
    { id: "51-1-001", name: "Cost of Goods Sold / Cost of Sales", type: "Cost of Goods Sold", openingBalance: 5994419.40 },
    { id: "61-1-001", name: "Salaries & Direct Operating Labor", type: "Operating Expense", openingBalance: 2450000.00 },
    { id: "61-1-002", name: "Commercial Office Rent", type: "Operating Expense", openingBalance: 840000.00 },
    { id: "61-1-003", name: "Electricity & Utility Expenses", type: "Operating Expense", openingBalance: 185000.00 },
    { id: "61-1-004", name: "Vehicle Fuel & Transport Maintenance", type: "Operating Expense", openingBalance: 650000.00 },
    { id: "61-1-005", name: "Travel & Mission Per Diem", type: "Operating Expense", openingBalance: 420000.00 },
    { id: "61-1-006", name: "Advertising & Marketing", type: "Operating Expense", openingBalance: 280000.00 },
    { id: "61-1-007", name: "Audit & Professional Fees", type: "Operating Expense", openingBalance: 150000.00 },
    { id: "61-1-008", name: "Depreciation Expense", type: "Operating Expense", openingBalance: 202626.38 },
  ];

  for (const acct of accounts) {
    await prisma.account.upsert({
      where: { id: acct.id },
      update: {
        name: acct.name,
        type: acct.type,
        openingBalance: acct.openingBalance,
        description: acct.name,
      },
      create: {
        id: acct.id,
        name: acct.name,
        type: acct.type,
        openingBalance: acct.openingBalance,
        description: acct.name,
      },
    });
  }

  console.log("Seeded and synchronized 22 authentic Chart of Accounts!");
  await prisma.$disconnect();
}

seedAccounts().catch(console.error);
