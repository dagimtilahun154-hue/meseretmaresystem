export type AccountCategory = "asset" | "liability" | "equity" | "revenue" | "expense";

import { toMoneyNumber } from "@/lib/finance-hub-store";

export interface Account {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  description?: string;
  subCategory?: string;
}

export interface TransactionLine {
  accountId: string;
  type: "debit" | "credit";
  amount: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  referenceId?: string;
  voucherType?: "CPV" | "CRV" | "JV" | "INV" | "BILL";
  lines: TransactionLine[];
}

// Meseret Mare Solar - Official Peachtree 2010 Chart of Accounts Hierarchy
export const DEFAULT_ACCOUNTS: Account[] = [
  // 11-x: Cash & Liquid Treasury Assets
  { id: "11-1-001", code: "11-1-001", name: "Petty Cash (Office)", category: "asset", subCategory: "Cash on Hand", description: "Imprest petty cash fund for minor expenses" },
  { id: "11-1-002", code: "11-1-002", name: "Cash on Hand (Main Safe)", category: "asset", subCategory: "Cash on Hand", description: "Office physical safe cash balance" },
  { id: "11-2-001", code: "11-2-001", name: "Commercial Bank of Ethiopia (CBE)", category: "asset", subCategory: "Bank Accounts", description: "Main operating Birr account at CBE" },
  { id: "11-2-002", code: "11-2-002", name: "Development Bank of Ethiopia (DBE)", category: "asset", subCategory: "Bank Accounts", description: "Development loan and project account" },
  { id: "11-2-003", code: "11-2-003", name: "Cooperative Bank of Oromia (COOP)", category: "asset", subCategory: "Bank Accounts", description: "Commercial agricultural project account" },
  { id: "11-2-004", code: "11-2-004", name: "Amhara Bank", category: "asset", subCategory: "Bank Accounts", description: "Northern region operational account" },
  { id: "11-2-005", code: "11-2-005", name: "Addis International Bank", category: "asset", subCategory: "Bank Accounts", description: "Trade finance & import settlement account" },
  { id: "11-2-006", code: "11-2-006", name: "Bank of Abyssinia", category: "asset", subCategory: "Bank Accounts", description: "Secondary operating bank account" },
  { id: "11-3-001", code: "11-3-001", name: "Telebirr Merchant / Microfinance", category: "asset", subCategory: "Digital Treasury", description: "Mobile money merchant wallet & savings" },

  // 12-x: Accounts Receivable (Customer Debtors)
  { id: "12-1-000", code: "12-1-000", name: "Trade Receivables (General)", category: "asset", subCategory: "Receivables", description: "Total open customer trade debt" },
  { id: "12-1-001", code: "12-1-001", name: "Customer Accounts Receivable", category: "asset", subCategory: "Receivables", description: "Invoiced solar pump & retail customers" },
  { id: "12-3-014", code: "12-3-014", name: "Withholding Tax Receivable", category: "asset", subCategory: "Tax Assets", description: "Withholding tax deducted at source by clients" },

  // 13-x / 14-x: Inventory & Fixed Assets
  { id: "13-1-001", code: "13-1-001", name: "Solar Pumps & Equipment Inventory", category: "asset", subCategory: "Inventory", description: "Warehouse stock valuation" },
  { id: "14-1-001", code: "14-1-001", name: "Installation Tools & Equipment", category: "asset", subCategory: "Fixed Assets", description: "Rigging, testing & excavation tools" },

  // 21-x / 22-x: Accounts Payable & Liabilities
  { id: "21-1-000", code: "21-1-000", name: "Trade Payables (Suppliers)", category: "liability", subCategory: "Payables", description: "Amounts owed to manufacturers & vendors" },
  { id: "21-1-002", code: "21-1-002", name: "Advance Customer Deposits", category: "liability", subCategory: "Current Liabilities", description: "Advance payments received for pending pump installations" },
  { id: "22-1-001", code: "22-1-001", name: "VAT Payable (15%)", category: "liability", subCategory: "Tax Liabilities", description: "Value Added Tax collected from sales" },
  { id: "22-1-002", code: "22-1-002", name: "Payroll & Pension Liabilities", category: "liability", subCategory: "Payroll Liabilities", description: "Withheld staff taxes & employee pension" },
  { id: "23-1-001", code: "23-1-001", name: "Commercial Bank Loan Facilities", category: "liability", subCategory: "Long Term Debt", description: "Outstanding principal balances on bank credit lines" },

  // 31-x: Owner's Equity
  { id: "31-1-001", code: "31-1-001", name: "Owner Contribution / Paid Capital", category: "equity", subCategory: "Capital", description: "Capital invested in the business" },
  { id: "31-1-002", code: "31-1-002", name: "Owner's Drawings", category: "equity", subCategory: "Equity Adjustments", description: "Owner capital withdrawals" },
  { id: "31-1-003", code: "31-1-003", name: "Retained Earnings", category: "equity", subCategory: "Retained Profit", description: "Cumulative retained profit from prior periods" },

  // 41-x: Revenue & Income
  { id: "41-1-001", code: "41-1-001", name: "Solar Pump Solutions Sales Revenue", category: "revenue", subCategory: "Operating Revenue", description: "Revenue from solar pumping systems & turn-key installations" },
  { id: "41-1-002", code: "41-1-002", name: "Retail & Spare Parts Revenue", category: "revenue", subCategory: "Operating Revenue", description: "Revenue from retail store parts, fittings & accessories" },
  { id: "41-1-003", code: "41-1-003", name: "Technical Engineering & Service Fees", category: "revenue", subCategory: "Service Revenue", description: "Installation, water testing & maintenance service fees" },

  // 51-x: Cost of Sales (COGS)
  { id: "51-1-001", code: "51-1-001", name: "Cost of Goods Sold - Solar Pumps", category: "expense", subCategory: "Cost of Sales", description: "Direct import and procurement cost of pumps & panels" },
  { id: "51-1-002", code: "51-1-002", name: "Direct Site Materials & Pipes", category: "expense", subCategory: "Cost of Sales", description: "Galvanized pipes, submersible cables, fittings & frames" },

  // 61-x: Operating & Administrative Expenses
  { id: "61-1-001", code: "61-1-001", name: "Staff Salaries & Field Per Diem", category: "expense", subCategory: "Labor Expenses", description: "Technician, engineering & administrative payroll and daily allowances" },
  { id: "61-1-002", code: "61-1-002", name: "Office & Warehouse Building Rent", category: "expense", subCategory: "Occupancy", description: "Commercial lease and warehouse rental payments" },
  { id: "61-1-003", code: "61-1-003", name: "Field Logistics & Transport", category: "expense", subCategory: "Logistics", description: "Vehicle fuel, mobile crane hire, freight & site logistics" },
  { id: "61-1-004", code: "61-1-004", name: "Utilities, Tax & Bank Charges", category: "expense", subCategory: "Admin Expenses", description: "Electricity, internet, bank transaction fees and municipal charges" },
];

function mapStoreAccountToLocal(acc: any): Account {
  const typeMap: Record<string, AccountCategory> = {
    assets: "asset",
    asset: "asset",
    liabilities: "liability",
    liability: "liability",
    equity: "equity",
    revenue: "revenue",
    expense: "expense",
    expenses: "expense",
  };
  const category = typeMap[String(acc.type || "").toLowerCase()] || "asset";
  return {
    id: acc.id,
    code: acc.code || acc.id,
    name: acc.name,
    category,
    description: acc.description || "",
    subCategory: acc.subCategory || "",
  };
}

export function getAccountById(id: string, customAccounts?: any[]): Account | undefined {
  const accountsToUse =
    customAccounts && customAccounts.length > 0
      ? customAccounts.map(mapStoreAccountToLocal)
      : DEFAULT_ACCOUNTS;
  return accountsToUse.find((a) => a.id === id || a.code === id);
}

export function calculateAccountBalance(accountId: string, entries: JournalEntry[], customAccounts?: any[]): number {
  const accountsToUse =
    customAccounts && customAccounts.length > 0
      ? customAccounts.map(mapStoreAccountToLocal)
      : DEFAULT_ACCOUNTS;

  const account = accountsToUse.find((a) => a.id === accountId || a.code === accountId);
  if (!account) return 0;

  let balance = 0;
  const storeAcc = customAccounts?.find((a) => a.id === accountId || a.code === accountId);
  if (storeAcc) {
    balance = toMoneyNumber(storeAcc.openingBalance || 0);
  }

  entries.forEach((entry) => {
    (entry.lines || [])
      .filter((l) => l.accountId === accountId || l.accountId === account.code)
      .forEach((line) => {
        // Normal balance rules:
        // Assets / Expenses: Debit increases (+), Credit decreases (-)
        // Liabilities / Equity / Revenue: Credit increases (+), Debit decreases (-)
        const isDebitIncrease = account.category === "asset" || account.category === "expense";

        if (line.type === "debit") {
          balance += isDebitIncrease ? toMoneyNumber(line.amount) : -toMoneyNumber(line.amount);
        } else {
          balance += isDebitIncrease ? -toMoneyNumber(line.amount) : toMoneyNumber(line.amount);
        }
      });
  });

  return balance;
}

export function generateBalanceSheet(entries: JournalEntry[], customAccounts?: any[]) {
  const accountsToUse =
    customAccounts && customAccounts.length > 0
      ? customAccounts.map(mapStoreAccountToLocal)
      : DEFAULT_ACCOUNTS;

  const assets = accountsToUse
    .filter((a) => a.category === "asset")
    .map((a) => ({
      code: a.code,
      name: a.name,
      subCategory: a.subCategory,
      balance: calculateAccountBalance(a.id, entries, customAccounts),
    }));

  const liabilities = accountsToUse
    .filter((a) => a.category === "liability")
    .map((a) => ({
      code: a.code,
      name: a.name,
      subCategory: a.subCategory,
      balance: calculateAccountBalance(a.id, entries, customAccounts),
    }));

  const equity = accountsToUse
    .filter((a) => a.category === "equity")
    .map((a) => ({
      code: a.code,
      name: a.name,
      subCategory: a.subCategory,
      balance: calculateAccountBalance(a.id, entries, customAccounts),
    }));

  const totalAssets = assets.reduce((s, a) => s + toMoneyNumber(a.balance), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + toMoneyNumber(l.balance), 0);
  const totalEquity = equity.reduce((s, e) => s + toMoneyNumber(e.balance), 0);

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
}

export function generateIncomeStatement(entries: JournalEntry[], customAccounts?: any[]) {
  const accountsToUse =
    customAccounts && customAccounts.length > 0
      ? customAccounts.map(mapStoreAccountToLocal)
      : DEFAULT_ACCOUNTS;

  const revenue = accountsToUse
    .filter((a) => a.category === "revenue")
    .map((a) => ({
      code: a.code,
      name: a.name,
      subCategory: a.subCategory,
      balance: calculateAccountBalance(a.id, entries, customAccounts),
    }));

  const expenses = accountsToUse
    .filter((a) => a.category === "expense")
    .map((a) => ({
      code: a.code,
      name: a.name,
      subCategory: a.subCategory,
      balance: calculateAccountBalance(a.id, entries, customAccounts),
    }));

  const totalRevenue = revenue.reduce((s, r) => s + toMoneyNumber(r.balance), 0);
  const totalExpenses = expenses.reduce((s, e) => s + toMoneyNumber(e.balance), 0);
  const netIncome = totalRevenue - totalExpenses;

  return { revenue, expenses, totalRevenue, totalExpenses, netIncome };
}
