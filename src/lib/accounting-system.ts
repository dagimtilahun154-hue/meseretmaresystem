export type AccountCategory = "asset" | "liability" | "equity" | "revenue" | "expense";

import { toMoneyNumber } from "@/lib/finance-hub-store";

export interface Account {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  description?: string;
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
  lines: TransactionLine[];
}

// Default Chart of Accounts
export const DEFAULT_ACCOUNTS: Account[] = [
  // Assets (1000s)
  { id: "acc-1001", code: "1001", name: "Cash (CBE)", category: "asset", description: "Main bank account at CBE" },
  { id: "acc-1002", code: "1002", name: "Cash (Awash)", category: "asset", description: "Secondary bank account at Awash" },
  { id: "acc-1100", code: "1100", name: "Accounts Receivable", category: "asset", description: "Money owed by customers" },
  { id: "acc-1200", code: "1200", name: "Inventory", category: "asset", description: "Value of stock on hand" },
  
  // Liabilities (2000s)
  { id: "acc-2000", code: "2000", name: "Accounts Payable", category: "liability", description: "Money owed to suppliers" },
  { id: "acc-2100", code: "2100", name: "VAT Payable", category: "liability", description: "VAT collected from customers" },
  { id: "acc-2200", code: "2200", name: "Payroll Liabilities", category: "liability", description: "Unpaid salaries and taxes" },
  { id: "acc-2300", code: "2300", name: "Bank Loans", category: "liability", description: "Outstanding loan balances" },

  // Equity (3000s)
  { id: "acc-3000", code: "3000", name: "Owner's Equity", category: "equity", description: "Capital invested in the business" },
  { id: "acc-3100", code: "3100", name: "Retained Earnings", category: "equity", description: "Cumulative net income" },

  // Revenue (4000s)
  { id: "acc-4000", code: "4000", name: "Sales Revenue", category: "revenue", description: "Revenue from product sales" },
  { id: "acc-4100", code: "4100", name: "Service Revenue", category: "revenue", description: "Revenue from installations/services" },

  // Expenses (5000s)
  { id: "acc-5000", code: "5000", name: "Cost of Goods Sold", category: "expense", description: "Direct cost of products sold" },
  { id: "acc-5100", code: "5100", name: "Payroll Expense", category: "expense", description: "Employee salaries and benefits" },
  { id: "acc-5200", code: "5200", name: "Rent & Utilities", category: "expense", description: "Office and warehouse costs" },
  { id: "acc-5300", code: "5300", name: "Transport & Logistics", category: "expense", description: "Travel and shipping costs" },
];

export function getAccountById(id: string): Account | undefined {
  return DEFAULT_ACCOUNTS.find(a => a.id === id);
}

export function calculateAccountBalance(accountId: string, entries: JournalEntry[]): number {
  const account = getAccountById(accountId);
  if (!account) return 0;

  let balance = 0;
  entries.forEach(entry => {
    entry.lines.filter(l => l.accountId === accountId).forEach(line => {
      // Normal balance rules
      // Assets/Expenses: Debit increases, Credit decreases
      // Liabilities/Equity/Revenue: Credit increases, Debit decreases
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

export function generateBalanceSheet(entries: JournalEntry[]) {
  const assets = DEFAULT_ACCOUNTS.filter(a => a.category === "asset").map(a => ({
    name: a.name,
    balance: calculateAccountBalance(a.id, entries)
  }));
  
  const liabilities = DEFAULT_ACCOUNTS.filter(a => a.category === "liability").map(a => ({
    name: a.name,
    balance: calculateAccountBalance(a.id, entries)
  }));

  const equity = DEFAULT_ACCOUNTS.filter(a => a.category === "equity").map(a => ({
    name: a.name,
    balance: calculateAccountBalance(a.id, entries)
  }));

  const totalAssets = assets.reduce((s, a) => s + toMoneyNumber(a.balance), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + toMoneyNumber(l.balance), 0);
  const totalEquity = equity.reduce((s, e) => s + toMoneyNumber(e.balance), 0);

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
}

export function generateIncomeStatement(entries: JournalEntry[]) {
  const revenue = DEFAULT_ACCOUNTS.filter(a => a.category === "revenue").map(a => ({
    name: a.name,
    balance: calculateAccountBalance(a.id, entries)
  }));

  const expenses = DEFAULT_ACCOUNTS.filter(a => a.category === "expense").map(a => ({
    name: a.name,
    balance: calculateAccountBalance(a.id, entries)
  }));

  const totalRevenue = revenue.reduce((s, r) => s + toMoneyNumber(r.balance), 0);
  const totalExpenses = expenses.reduce((s, e) => s + toMoneyNumber(e.balance), 0);
  const netIncome = totalRevenue - totalExpenses;

  return { revenue, expenses, totalRevenue, totalExpenses, netIncome };
}
