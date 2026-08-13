// Finance Hub Store - backed by the NestJS API
import { format } from "date-fns";
import {
  customersDB,
  vendorsDB,
  accountsDB,
  invoicesDB,
  billsDB,
  paymentsDB,
  expensesDB,
  journalDB,
} from "./db-service";

export const toMoneyNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value && typeof value === "object" && typeof (value as any).toNumber === "function") {
    return Number((value as any).toNumber()) || 0;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    return Number(normalized) || 0;
  }
  return Number(value || 0) || 0;
};

export interface Account {
  id: string;
  name: string;
  type: "Assets" | "Liabilities" | "Equity" | "Revenue" | "Expenses";
  description: string;
  openingBalance: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tin?: string;
  contact?: string;
  city?: string;
  state?: string;
  zip?: string;
  creditLimit?: number;
  balance?: number;
  installedPumpModel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  address: string;
  tin: string;
  balance: number;
}

export interface InvoiceItem {
  product: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  totalVat: number;
  total: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
}

export interface Bill {
  id: string;
  vendorId: string;
  vendorName: string;
  date: string;
  items: { product: string; quantity: number; costPrice: number; total: number }[];
  total: number;
  status: "Pending" | "Paid";
}

export interface Payment {
  id: string;
  reference: string;
  entityId: string;
  entityName: string;
  invoiceOrBillId: string;
  amount: number;
  method: "Cash" | "Bank Transfer" | "Check" | "Mobile Money";
  bankName?: string;
  note?: string;
  date: string;
  type: "received" | "made";
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  method: "Cash" | "Bank Transfer" | "Check" | "Mobile Money";
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

// Local cache loaded from the backend on first use
let _customers: Customer[] | null = null;
let _vendors: Vendor[] | null = null;
let _accounts: Account[] | null = null;
let _invoices: Invoice[] | null = null;
let _bills: Bill[] | null = null;
let _payments: Payment[] | null = null;
let _expenses: Expense[] | null = null;
let _journals: JournalEntry[] | null = null;

const normalizeAccount = (account: Account): Account => ({
  ...account,
  openingBalance: toMoneyNumber(account.openingBalance),
});

const normalizeCustomer = (customer: Customer): Customer => ({
  ...customer,
  creditLimit: toMoneyNumber(customer.creditLimit),
  balance: toMoneyNumber(customer.balance),
});

const normalizeVendor = (vendor: Vendor): Vendor => ({
  ...vendor,
  balance: toMoneyNumber(vendor.balance),
});

const normalizeInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  items: Array.isArray(invoice.items)
    ? invoice.items.map((item) => ({
        ...item,
        quantity: toMoneyNumber(item.quantity),
        unitPrice: toMoneyNumber(item.unitPrice),
        discount: toMoneyNumber(item.discount),
        tax: toMoneyNumber(item.tax),
        total: toMoneyNumber(item.total),
      }))
    : [],
  subtotal: toMoneyNumber(invoice.subtotal),
  totalVat: toMoneyNumber(invoice.totalVat),
  total: toMoneyNumber(invoice.total),
});

const normalizeBill = (bill: Bill): Bill => ({
  ...bill,
  items: Array.isArray(bill.items)
    ? bill.items.map((item) => ({
        ...item,
        quantity: toMoneyNumber(item.quantity),
        costPrice: toMoneyNumber(item.costPrice),
        total: toMoneyNumber(item.total),
      }))
    : [],
  total: toMoneyNumber(bill.total),
});

export const normalizePayment = (payment: Payment): Payment => ({
  ...payment,
  amount: toMoneyNumber(payment.amount),
});

const normalizeExpense = (expense: Expense): Expense => ({
  ...expense,
  amount: toMoneyNumber(expense.amount),
});

const normalizeJournalEntry = (entry: JournalEntry): JournalEntry => ({
  ...entry,
  amount: toMoneyNumber(entry.amount),
});

// Backend-backed store with in-memory cache
export const financeStore = {
  // CUSTOMERS
  getCustomers: () => _customers || [],
  loadCustomers: async () => {
    _customers = (await customersDB.getAll()).map(normalizeCustomer);
    return _customers;
  },
  setCustomers: async (data: Customer[]) => {
    _customers = data.map(normalizeCustomer);
  },
  saveCustomer: async (customer: Customer) => {
    customer = normalizeCustomer(customer);
    await customersDB.save(customer);
    if (_customers) {
      const idx = _customers.findIndex((c) => c.id === customer.id);
      if (idx >= 0) _customers[idx] = customer;
      else _customers = [..._customers, customer];
    }
  },
  deleteCustomer: async (id: string) => {
    await customersDB.delete(id);
    if (_customers) _customers = _customers.filter((c) => c.id !== id);
  },

  // VENDORS
  getVendors: () => _vendors || [],
  loadVendors: async () => {
    _vendors = (await vendorsDB.getAll()).map(normalizeVendor);
    return _vendors;
  },
  setVendors: async (data: Vendor[]) => {
    _vendors = data.map(normalizeVendor);
  },
  saveVendor: async (vendor: Vendor) => {
    vendor = normalizeVendor(vendor);
    await vendorsDB.save(vendor);
    if (_vendors) {
      const idx = _vendors.findIndex((v) => v.id === vendor.id);
      if (idx >= 0) _vendors[idx] = vendor;
      else _vendors = [..._vendors, vendor];
    }
  },
  deleteVendor: async (id: string) => {
    await vendorsDB.delete(id);
    if (_vendors) _vendors = _vendors.filter((v) => v.id !== id);
  },

  // ACCOUNTS
  getAccounts: () => _accounts || [],
  loadAccounts: async () => {
    _accounts = (await accountsDB.getAll()).map(normalizeAccount);
    return _accounts;
  },
  setAccounts: async (data: Account[]) => {
    _accounts = data.map(normalizeAccount);
  },
  saveAccount: async (account: Account) => {
    account = normalizeAccount(account);
    await accountsDB.save(account);
    if (_accounts) {
      const idx = _accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) _accounts[idx] = account;
      else _accounts = [..._accounts, account];
    }
  },
  deleteAccount: async (id: string) => {
    await accountsDB.delete(id);
    if (_accounts) _accounts = _accounts.filter((a) => a.id !== id);
  },

  // INVOICES
  getInvoices: () => _invoices || [],
  loadInvoices: async () => {
    _invoices = (await invoicesDB.getAll()).map(normalizeInvoice);
    return _invoices;
  },
  setInvoices: async (data: Invoice[]) => {
    _invoices = data.map(normalizeInvoice);
  },
  saveInvoice: async (invoice: Invoice) => {
    invoice = normalizeInvoice(invoice);
    await invoicesDB.save(invoice);
    if (_invoices) {
      const idx = _invoices.findIndex((i) => i.id === invoice.id);
      if (idx >= 0) _invoices[idx] = invoice;
      else _invoices = [..._invoices, invoice];
    }
  },

  // BILLS
  getBills: () => _bills || [],
  loadBills: async () => {
    _bills = (await billsDB.getAll()).map(normalizeBill);
    return _bills;
  },
  setBills: async (data: Bill[]) => {
    _bills = data.map(normalizeBill);
  },
  saveBill: async (bill: Bill) => {
    bill = normalizeBill(bill);
    await billsDB.save(bill);
    if (_bills) {
      const idx = _bills.findIndex((b) => b.id === bill.id);
      if (idx >= 0) _bills[idx] = bill;
      else _bills = [..._bills, bill];
    }
  },

  // PAYMENTS
  getPayments: () => _payments || [],
  loadPayments: async () => {
    _payments = (await paymentsDB.getAll()).map(normalizePayment);
    return _payments;
  },
  setPayments: async (data: Payment[]) => {
    _payments = data.map(normalizePayment);
  },
  savePayment: async (payment: Payment) => {
    payment = normalizePayment(payment);
    await paymentsDB.save(payment);
    if (_payments) {
      const idx = _payments.findIndex((p) => p.id === payment.id);
      if (idx >= 0) _payments[idx] = payment;
      else _payments = [..._payments, payment];
    }
  },

  // EXPENSES
  getExpenses: () => _expenses || [],
  loadExpenses: async () => {
    _expenses = (await expensesDB.getAll()).map(normalizeExpense);
    return _expenses;
  },
  setExpenses: async (data: Expense[]) => {
    _expenses = data.map(normalizeExpense);
  },
  saveExpense: async (expense: Expense) => {
    expense = normalizeExpense(expense);
    await expensesDB.save(expense);
    if (_expenses) {
      const idx = _expenses.findIndex((e) => e.id === expense.id);
      if (idx >= 0) _expenses[idx] = expense;
      else _expenses = [..._expenses, expense];
    }
  },
  deleteExpense: async (id: string) => {
    await expensesDB.delete(id);
    if (_expenses) _expenses = _expenses.filter((e) => e.id !== id);
  },

  // JOURNAL ENTRIES
  getJournalEntries: () => _journals || [],
  loadJournalEntries: async () => {
    _journals = (await journalDB.getAll()).map(normalizeJournalEntry);
    return _journals;
  },
  setJournalEntries: async (data: JournalEntry[]) => {
    _journals = data.map(normalizeJournalEntry);
  },
  saveJournalEntry: async (entry: JournalEntry) => {
    entry = normalizeJournalEntry(entry);
    await journalDB.save(entry);
    if (_journals) {
      const idx = _journals.findIndex((j) => j.id === entry.id);
      if (idx >= 0) _journals[idx] = entry;
      else _journals = [..._journals, entry];
    }
  },
};

// Initialize all finance data from the backend
export async function initFinanceStore(isFinanceOrManager: boolean = false) {
  const promises: Promise<any>[] = [
    financeStore.loadCustomers(),
    financeStore.loadVendors(),
  ];

  if (isFinanceOrManager) {
    promises.push(
      financeStore.loadAccounts(),
      financeStore.loadInvoices(),
      financeStore.loadBills(),
      financeStore.loadPayments(),
      financeStore.loadExpenses(),
      financeStore.loadJournalEntries()
    );
  }

  await Promise.all(promises);
}
