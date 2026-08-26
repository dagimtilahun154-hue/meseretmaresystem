import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ETHIOPIAN_BANKS, formatCurrency } from "@/lib/data";
import {
  analyticsDB,
  financeCenterDB,
  inventoryRequestsDB,
  journalDB,
  hierarchyRequestsDB,
} from "@/lib/db-service";
import {
  BankReconciliationRecord,
  BuildingRentRecord,
  BudgetRecord,
  PayrollWorker,
  VATRecord,
  LoanRecord,
  CashFlowEntry,
  BankAccount,
  PettyCashRecord,
} from "@/lib/finance-data";
import {
  JournalEntry,
} from "@/lib/accounting-system";
import {
  financeStore,
  normalizePayment,
  Payment,
  toMoneyNumber,
} from "@/lib/finance-hub-store";

// Modular Domain Sub-components
import { FinanceWorkspaceNav } from "@/components/finance/FinanceWorkspaceNav";
import { FinanceOverviewWorkspace } from "@/components/finance/workspace/FinanceOverviewWorkspace";
import { PumpSizingProposalsModule } from "@/components/finance/pumps/PumpSizingProposalsModule";
import { InventoryRequestsModule, InventoryRequestWithPrice } from "@/components/finance/operations/InventoryRequestsModule";
import { CashFlowModule } from "@/components/finance/treasury/CashFlowModule";
import { BankAccountsModule } from "@/components/finance/treasury/BankAccountsModule";
import { BankReconciliationModule } from "@/components/finance/treasury/BankReconciliationModule";
import { PettyCashModule } from "@/components/finance/treasury/PettyCashModule";
import { BuildingRentModule } from "@/components/finance/commitments/BuildingRentModule";
import { LoansModule } from "@/components/finance/commitments/LoansModule";
import { BudgetModule } from "@/components/finance/commitments/BudgetModule";
import { VatComplianceModule } from "@/components/finance/compliance/VatComplianceModule";
import { PayrollModule } from "@/components/finance/compliance/PayrollModule";
import { FinancialStatementsModule } from "@/components/finance/statements/FinancialStatementsModule";
import PeachtreePage from "@/pages/PeachtreePage";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const FINANCE_SECTIONS = new Set([
  "dashboard",
  "cashflow",
  "bank",
  "loans",
  "bank-reconciliation",
  "building-rent",
  "sizing-proposals",
  "inventory",
  "budget",
  "payroll",
  "vat",
  "petty-cash",
  "peachtree",
  "financials",
  "reports",
]);

function parseRecordPayload(record: unknown) {
  if (typeof record === "string") {
    try {
      return JSON.parse(record);
    } catch {
      return null;
    }
  }

  if (record && typeof record === "object" && "payload" in record) {
    const payload = (record as { payload?: unknown }).payload;
    return parseRecordPayload(payload) || record;
  }

  return record && typeof record === "object" ? record : null;
}

function normalizeCashFlowEntry(record: unknown): CashFlowEntry | null {
  const payload = parseRecordPayload(record) as any;
  if (!payload) return null;

  const amount = toMoneyNumber(payload.amount ?? payload.value ?? 0);
  const type =
    payload.type === "expense" || payload.flowType === "expense" || amount < 0
      ? "expense"
      : "income";
  const id = String(payload.id ?? payload.reference ?? crypto.randomUUID());
  const date = String(payload.date ?? payload.createdAt ?? new Date().toISOString()).slice(0, 10);

  return {
    id,
    type,
    category: String(payload.category ?? payload.title ?? "General"),
    amount: Math.abs(amount),
    description: String(payload.description ?? payload.note ?? payload.reference ?? ""),
    date,
    status: (payload.status as CashFlowEntry["status"]) || "approved",
  };
}

function normalizeAccountingJournalEntry(entry: any): JournalEntry | null {
  if (!entry) return null;
  if (Array.isArray(entry.lines)) {
    return {
      id: String(entry.id || crypto.randomUUID()),
      date: String(entry.date || new Date().toISOString().slice(0, 10)),
      reference: String(entry.reference || ""),
      description: String(entry.description || ""),
      lines: entry.lines.map((line: any) => ({
        accountId: String(line.accountId || ""),
        type: line.type === "credit" ? "credit" : "debit",
        amount: Number(line.amount) || 0,
      })),
    };
  }

  if (!entry.debitAccount || !entry.creditAccount || !entry.amount) {
    return null;
  }

  return {
    id: String(entry.id || crypto.randomUUID()),
    date: String(entry.date || new Date().toISOString().slice(0, 10)),
    reference: String(entry.reference || ""),
    description: String(entry.description || ""),
    lines: [
      { accountId: entry.debitAccount, type: "debit", amount: Number(entry.amount) },
      { accountId: entry.creditAccount, type: "credit", amount: Number(entry.amount) },
    ],
  };
}

export default function FinanceCenterPage() {
  const { section } = useParams<{ section?: string }>();
  const activeSection = section && FINANCE_SECTIONS.has(section) ? section : "dashboard";
  const { hasAccess, currentUser } = useAuth();
  const canApprove = hasAccess(["finance"]);
  const { sales, financePayments, financeEntity, setFinanceEntity, refreshStoreData } = useStore() as any;

  const [bankReconciliations, setBankReconciliations] = useState<BankReconciliationRecord[]>([]);
  const [buildingRents, setBuildingRents] = useState<BuildingRentRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [payrollWorkers, setPayrollWorkers] = useState<PayrollWorker[]>([]);
  const [vatRecords, setVATRecords] = useState<VATRecord[]>([]);
  const [invRequests, setInvRequests] = useState<InventoryRequestWithPrice[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [pettyCashRecords, setPettyCashRecords] = useState<PettyCashRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState<any>(null);
  const [selectedBankView, setSelectedBankView] = useState<string | null>(null);

  const selectedEntity = (financeEntity as "FZ" | "MM") || "FZ";
  const selectedEntityName = selectedEntity === "FZ" ? "Fasil Zelalem" : "Meseret Mare";

  const loadFinanceCenterData = async () => {
    try {
      const [
        bankReconciliationsData,
        buildingRentsData,
        budgetsData,
        payrollWorkersData,
        vatRecordsData,
        invRequestsData,
        loansData,
        cashFlowData,
        bankAccountsData,
        pettyCashRecordsData,
        journalEntriesData,
        analyticsData,
      ] = await Promise.all([
        financeCenterDB.getAll("bank-reconciliations"),
        financeCenterDB.getAll("building-rents"),
        financeCenterDB.getAll("budgets"),
        financeCenterDB.getAll("payroll-workers"),
        financeCenterDB.getAll("vat-records"),
        inventoryRequestsDB.getAll(),
        financeCenterDB.getAll("loans"),
        financeCenterDB.getAll("cash-flow"),
        financeCenterDB.getAll("bank-accounts"),
        financeCenterDB.getAll("petty-cash-records"),
        journalDB.getAll(),
        analyticsDB.dashboard(selectedEntity),
      ]);

      setBankReconciliations(Array.isArray(bankReconciliationsData) ? bankReconciliationsData : []);
      setBuildingRents(Array.isArray(buildingRentsData) ? buildingRentsData : []);
      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setPayrollWorkers(Array.isArray(payrollWorkersData) ? payrollWorkersData : []);
      setVATRecords(Array.isArray(vatRecordsData) ? vatRecordsData : []);
      setInvRequests(Array.isArray(invRequestsData) ? invRequestsData : []);
      setLoans(Array.isArray(loansData) ? loansData : []);
      setCashFlow(
        Array.isArray(cashFlowData)
          ? cashFlowData.map(normalizeCashFlowEntry).filter((entry): entry is CashFlowEntry => Boolean(entry))
          : []
      );
      setBankAccounts(Array.isArray(bankAccountsData) ? bankAccountsData : []);
      setPettyCashRecords(Array.isArray(pettyCashRecordsData) ? pettyCashRecordsData : []);
      setJournalEntries(
        Array.isArray(journalEntriesData)
          ? (journalEntriesData.map(normalizeAccountingJournalEntry).filter(Boolean) as JournalEntry[])
          : []
      );
      setDashboardAnalytics(analyticsData);
    } catch {
      toast.error("Could not load finance center data");
    }
  };

  useEffect(() => {
    let mounted = true;
    loadFinanceCenterData();
    const timer = window.setInterval(() => {
      if (mounted) loadFinanceCenterData();
    }, 60000);

    const onFocus = () => {
      if (mounted) loadFinanceCenterData();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [selectedEntity]);

  // Derived Cash Flow from payments + manual cash flows
  const allCashFlow = useMemo(() => {
    const safePayments = Array.isArray(financePayments) ? financePayments.map(normalizePayment) : [];
    const persistedPaymentFlows: CashFlowEntry[] = safePayments.map((payment: Payment) => ({
      id: payment.id,
      type: payment.type === "received" ? "income" : "expense",
      category: payment.note || (payment.type === "received" ? "POS Sale" : "Payment Made"),
      amount: toMoneyNumber(payment.amount),
      description: `${payment.reference || payment.invoiceOrBillId || payment.id} - ${payment.entityName || "Finance"} (${payment.method || "N/A"})`,
      date: payment.date,
      status: "approved",
    }));

    return [...persistedPaymentFlows, ...cashFlow]
      .map(normalizeCashFlowEntry)
      .filter((entry): entry is CashFlowEntry => Boolean(entry));
  }, [financePayments, cashFlow]);

  // Derived Bank Accounts grouped by Ethiopian banks
  const updatedBankAccounts = useMemo(() => {
    const allBanks = [...ETHIOPIAN_BANKS, "Telebirr"];
    bankAccounts.forEach((acc) => {
      if (!allBanks.includes(acc.bankName)) {
        allBanks.push(acc.bankName);
      }
    });

    const bankGroups: Record<string, { total: number; count: number; latest: string }> = {};
    const safePayments = Array.isArray(financePayments) ? financePayments.map(normalizePayment) : [];

    safePayments
      .filter((p) => p.type === "received" && (p.method === "Bank Transfer" || p.method === "Mobile Money"))
      .forEach((p) => {
        const bName = p.bankName || "Unknown Bank";
        if (!bankGroups[bName]) {
          bankGroups[bName] = { total: 0, count: 0, latest: "" };
        }
        bankGroups[bName].total += toMoneyNumber(p.amount);
        bankGroups[bName].count += 1;
        if (!bankGroups[bName].latest || p.date > bankGroups[bName].latest) {
          bankGroups[bName].latest = p.date;
        }
      });

    return allBanks.map((bName) => {
      const g = bankGroups[bName] || { total: 0, count: 0, latest: "" };
      const persistedAccount = bankAccounts.find((a) => a.bankName === bName);

      return {
        id: `ba-${bName.replace(/\s+/g, "-").toLowerCase()}`,
        bankName: bName,
        accountNumber: persistedAccount?.accountNumber || "POS Linked",
        balance: toMoneyNumber(persistedAccount?.balance) + g.total,
        lastUpdated: g.latest || persistedAccount?.lastUpdated || "—",
      };
    });
  }, [bankAccounts, financePayments]);

  // Financial Totals
  const totalRentCollected = buildingRents
    .filter((r) => r.entity === selectedEntity && r.status === "paid")
    .reduce((s, r) => s + toMoneyNumber(r.amount), 0);
  const totalVAT = vatRecords.reduce((s, v) => s + toMoneyNumber(v.vatAmount), 0);
  const totalPayroll = payrollWorkers.reduce(
    (s, w) => s + w.history.filter((h) => h.status === "paid").reduce((a, h) => a + toMoneyNumber(h.grossSalary), 0),
    0
  );
  const totalBankBalance = updatedBankAccounts.reduce((s, a) => s + toMoneyNumber(a.balance), 0);
  const cfIncome = allCashFlow.filter((c) => c.type === "income").reduce((s, c) => s + toMoneyNumber(c.amount), 0);
  const cfExpense = allCashFlow.filter((c) => c.type === "expense").reduce((s, c) => s + toMoneyNumber(c.amount), 0);

  const normalizedFinancePayments = Array.isArray(financePayments) ? financePayments.map(normalizePayment) : [];
  const cashBalance = normalizedFinancePayments.filter((p) => p.type === "received" && p.method === "Cash").reduce((s, p) => s + toMoneyNumber(p.amount), 0);
  const telebirrBalance = normalizedFinancePayments.filter((p) => p.type === "received" && p.method === "Mobile Money").reduce((s, p) => s + toMoneyNumber(p.amount), 0);
  const bankMoneyOnly = totalBankBalance - telebirrBalance;

  const totalLoans = loans
    .filter((l) => l.entity === selectedEntity)
    .reduce((s, l) => s + toMoneyNumber(l.remainingBalance), 0);

  const cashflowChartData = useMemo(() => {
    const byFullDate: Record<string, { income: number; expense: number }> = {};
    allCashFlow.forEach((c) => {
      const dateKey = String(c.date || "").slice(0, 10);
      if (!byFullDate[dateKey]) byFullDate[dateKey] = { income: 0, expense: 0 };
      if (c.type === "income") byFullDate[dateKey].income += toMoneyNumber(c.amount);
      else byFullDate[dateKey].expense += toMoneyNumber(c.amount);
    });

    const now = new Date();
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const isoDate = targetDate.toISOString().slice(0, 10);
      const monthDay = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // e.g. "Aug 24"

      const item = byFullDate[isoDate] || { income: 0, expense: 0 };
      result.push({
        date: monthDay,
        fullDate: isoDate,
        income: item.income,
        expense: item.expense,
        net: item.income - item.expense,
      });
    }

    return result;
  }, [allCashFlow]);

  const dualSourceRevenueData = useMemo(() => {
    const now = new Date();
    const months: Array<{ monthKey: string; monthLabel: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = d.toLocaleDateString("en-US", { month: "short" });
      months.push({ monthKey, monthLabel });
    }

    const safeSales = Array.isArray(sales) ? sales : [];

    return months.map(({ monthKey, monthLabel }) => {
      let solarRevenue = 0;
      let peachtreeRevenue = 0;

      safeSales.forEach((s: any) => {
        const sDate = String(s.date || s.createdAt || "").slice(0, 7);
        if (sDate === monthKey) {
          const total = Number(s.totalSell || s.totalAmount || s.total || 0);
          const hasPump = (s.items || []).some((item: any) =>
            item.category === "PUMPS" ||
            String(item.name || "").toLowerCase().includes("pump") ||
            String(item.name || "").toLowerCase().includes("solar")
          );
          if (hasPump) {
            solarRevenue += total;
          } else {
            peachtreeRevenue += total;
          }
        }
      });

      allCashFlow.forEach((c) => {
        const cDate = String(c.date || "").slice(0, 7);
        if (cDate === monthKey && c.type === "income") {
          const cat = String(c.category || "").toLowerCase();
          if (cat.includes("pump") || cat.includes("sizing") || cat.includes("solar")) {
            solarRevenue += Number(c.amount || 0);
          } else if (cat.includes("pos") || cat.includes("retail") || cat.includes("peachtree")) {
            peachtreeRevenue += Number(c.amount || 0);
          }
        }
      });

      return {
        month: monthLabel,
        solarflow: Math.round(solarRevenue),
        peachtree: Math.round(peachtreeRevenue),
        total: Math.round(solarRevenue + peachtreeRevenue),
      };
    });
  }, [sales, allCashFlow]);

  const bankDistributionData = useMemo(() => {
    const defaultBanks = [
      { name: "Commercial Bank of Ethiopia (CBE)", key: "cbe", color: "#8b5cf6" },
      { name: "Awash Bank", key: "awash", color: "#f59e0b" },
      { name: "Dashen Bank", key: "dashen", color: "#0ea5e9" },
      { name: "Telebirr SuperApp", key: "telebirr", color: "#10b981" },
      { name: "Bank of Abyssinia", key: "abyssinia", color: "#ec4899" },
      { name: "Office Safe / Cash", key: "cash", color: "#64748b" },
    ];

    return defaultBanks.map((b) => {
      let balance = 0;
      if (b.key === "cash") {
        balance = cashBalance;
      } else if (b.key === "telebirr") {
        balance = telebirrBalance;
      } else {
        const found = updatedBankAccounts.find(
          (acc) =>
            acc.bankName.toLowerCase().includes(b.key) ||
            b.name.toLowerCase().includes(acc.bankName.toLowerCase())
        );
        balance = found ? Number(found.balance || 0) : 0;
      }

      return {
        name: b.name,
        balance: Math.max(0, balance),
        color: b.color,
      };
    });
  }, [updatedBankAccounts, cashBalance, telebirrBalance]);

  // Operations Handlers
  const updateInventoryRequestStatus = async (id: string, status: "approved" | "rejected") => {
    const approver = currentUser?.displayName || "Finance";
    const updated = invRequests.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            approvedBy: approver,
            approvedDate: new Date().toISOString().slice(0, 10),
          }
        : r
    );

    const changed = updated.find((request) => request.id === id);
    try {
      if (!changed || !(await inventoryRequestsDB.save(changed))) {
        toast.error("Could not update inventory request");
        return;
      }
      const refreshedRequests = await inventoryRequestsDB.getAll();
      setInvRequests(Array.isArray(refreshedRequests) ? refreshedRequests : updated);
      await refreshStoreData();
      toast.success(
        status === "approved" ? "Inventory request approved and stock updated" : "Inventory request rejected"
      );
    } catch (error) {
      console.error("Finance inventory request update failed", error);
      toast.error("Could not update inventory request");
    }
  };

  const handleAddRent = async (newRent: BuildingRentRecord) => {
    const record: BuildingRentRecord = {
      ...newRent,
      id: Date.now().toString(),
      entity: selectedEntity,
    };
    await financeCenterDB.add("building-rents", record);
    setBuildingRents((prev) => [...prev, record]);

    if (record.status === "paid") {
      const cfEntry: CashFlowEntry = {
        id: crypto.randomUUID(),
        type: "income",
        category: "Building Rental Income",
        amount: Number(record.amount),
        description: `Rent collection Floor ${record.floorNumber || "1"} (${record.tenantName || record.entity})`,
        date: record.date || new Date().toISOString().slice(0, 10),
        status: "approved",
      };
      await financeCenterDB.save("cash-flow", cfEntry);
      setCashFlow((prev) => [cfEntry, ...prev]);
    }

    toast.success("Rent record added and ledger updated.");
  };

  const handleAddBudget = async (record: Omit<BudgetRecord, "id" | "entity" | "date">) => {
    const newRecord: BudgetRecord = {
      ...record,
      id: crypto.randomUUID(),
      entity: selectedEntity,
      date: new Date().toISOString().slice(0, 10),
    };
    if (await financeCenterDB.save("budgets", newRecord)) {
      setBudgets((prev) => [...prev, newRecord]);
      toast.success("Budget added");
    } else {
      toast.error("Could not add budget");
    }
  };

  const handleAddLoan = async (form: any) => {
    const record: LoanRecord = {
      id: crypto.randomUUID(),
      entity: selectedEntity,
      bankName: form.bankName,
      loanAmount: Number(form.loanAmount) || 0,
      interestRate: Number(form.interestRate) || 0,
      remainingBalance: Number(form.loanAmount) || 0,
      monthlyPayment: Number(form.monthlyPayment) || 0,
      startDate: form.startDate,
      endDate: form.endDate,
      nextPaymentDate: form.startDate,
      status: "active",
      payments: [],
    };
    if (await financeCenterDB.add("loans", record)) {
      setLoans((prev) => [...prev, record]);
      toast.success("Loan added");
    } else {
      toast.error("Failed to add loan");
    }
  };

  const handleRecordLoanPayment = async (form: { loanId: string; amount: string; note: string }) => {
    const updatedLoan = loans.find((l) => l.id === form.loanId);
    if (!updatedLoan) {
      toast.error("Loan not found");
      return;
    }
    const nextLoan: LoanRecord = {
      ...updatedLoan,
      remainingBalance: updatedLoan.remainingBalance - Number(form.amount),
      payments: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          amount: Number(form.amount),
          note: form.note,
        },
        ...(updatedLoan.payments || []),
      ],
    };
    if (await financeCenterDB.save("loans", nextLoan)) {
      setLoans((prev) => prev.map((l) => (l.id === nextLoan.id ? nextLoan : l)));

      // Auto-post to Cash Flow Ledger as Expense
      const cfEntry: CashFlowEntry = {
        id: crypto.randomUUID(),
        type: "expense",
        category: `Loan Repayment (${updatedLoan.bankName})`,
        amount: Number(form.amount),
        description: form.note || `Principal repayment for ${updatedLoan.bankName} loan facility`,
        date: new Date().toISOString().slice(0, 10),
        status: "approved",
      };
      await financeCenterDB.save("cash-flow", cfEntry);
      setCashFlow((prev) => [cfEntry, ...prev]);

      toast.success("Loan payment recorded and cash flow updated");
    } else {
      toast.error("Could not record loan payment");
    }
  };

  const handleAddBankAccount = async (form: { bankName: string; accountNumber: string; initialBalance: string }) => {
    const record: BankAccount = {
      id: crypto.randomUUID(),
      bankName: form.bankName,
      accountNumber: form.accountNumber,
      balance: Number(form.initialBalance) || 0,
      lastUpdated: new Date().toISOString(),
    };
    if (await financeCenterDB.add("bank-accounts", record)) {
      setBankAccounts((prev) => [...prev, record]);
      toast.success("Bank account added");
    } else {
      toast.error("Failed to add bank account");
    }
  };

  const handleAddBankReconciliation = async (form: any) => {
    const record: BankReconciliationRecord = {
      id: crypto.randomUUID(),
      entity: selectedEntity,
      ...form,
      date: new Date().toISOString().slice(0, 10),
      bankStatementBalance: Number(form.bankStatementBalance) || 0,
      depositInTransit: Number(form.depositInTransit) || 0,
      outstandingCheque: Number(form.outstandingCheque) || 0,
      companyCashBook: Number(form.companyCashBook) || 0,
      bankCredits: Number(form.bankCredits) || 0,
      bankCharges: Number(form.bankCharges) || 0,
    };
    if (await financeCenterDB.add("bank-reconciliations", record)) {
      setBankReconciliations((prev) => [...prev, record]);
      toast.success("Bank reconciliation saved");
    } else {
      toast.error("Failed to save bank reconciliation");
    }
  };

  const handleAddPettyCash = async (form: any) => {
    const record: PettyCashRecord = {
      id: crypto.randomUUID(),
      entity: selectedEntity,
      beginningBalance: Number(form.beginningBalance) || 0,
      chequeNo: form.chequeNo,
      period: form.period,
      preparedBy: form.preparedBy,
      checkedBy: form.checkedBy,
      approvedBy: form.approvedBy,
      date: new Date().toISOString().slice(0, 10),
      entries: (form.entries || []).map((e: any) => ({
        ...e,
        id: crypto.randomUUID(),
        amount: Number(e.amount) || 0,
      })),
    };
    if (await financeCenterDB.add("petty-cash-records", record)) {
      setPettyCashRecords((prev) => [...prev, record]);
      toast.success("Petty cash settlement saved");
    } else {
      toast.error("Failed to save petty cash settlement");
    }
  };

  const handleAddCashFlowEntry = async (form: {
    type: "income" | "expense";
    category: string;
    amount: string;
    description: string;
  }) => {
    const isDraft = !canApprove;
    const record: CashFlowEntry = {
      id: crypto.randomUUID(),
      type: form.type,
      category: form.category,
      amount: toMoneyNumber(form.amount),
      description: form.description,
      date: new Date().toISOString().slice(0, 10),
      status: isDraft ? "pending" : "approved",
    };

    if (!(await financeCenterDB.save("cash-flow", record))) {
      toast.error("Could not add cash flow entry");
      return;
    }

    if (isDraft) {
      try {
        await hierarchyRequestsDB.create({
          title: `Cash Flow Approval: ${form.category}`,
          description: `Cash Flow entry proposed by ${currentUser?.displayName || "Accountant"}.\nCategory: ${form.category}\nAmount: ${form.amount} ETB\nDescription: ${form.description || ""}`,
          amount: toMoneyNumber(form.amount),
          type: "GENERAL",
          comment: `Draft entry created. Reference ID: ${record.id}`,
        });
        toast.success("Cash flow proposal submitted to Finance Admin!");
      } catch (e) {
        console.error("Failed to submit workflow request:", e);
      }
    } else {
      toast.success("Cash flow entry added");
    }

    setCashFlow((prev) => [record, ...prev]);
  };

  const handleApproveCashFlowEntry = async (id: string) => {
    const entry = cashFlow.find((c) => c.id === id);
    if (!entry) return;
    const updated: CashFlowEntry = { ...entry, status: "approved" };
    if (await financeCenterDB.save("cash-flow", updated)) {
      setCashFlow((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success("Cash flow entry approved!");
    } else {
      toast.error("Failed to approve entry");
    }
  };

  const handleMarkPayrollPaid = async (workerId: string, entryId: string) => {
    const worker = payrollWorkers.find((w) => w.id === workerId);
    const historyItem = worker?.history.find((h) => h.id === entryId);

    const updatedWorkers = payrollWorkers.map((w) =>
      w.id === workerId
        ? {
            ...w,
            history: w.history.map((h) =>
              h.id === entryId
                ? { ...h, status: "paid" as const, paidDate: new Date().toISOString().slice(0, 10) }
                : h
            ),
          }
        : w
    );

    setPayrollWorkers(updatedWorkers);
    const changedWorker = updatedWorkers.find((w) => w.id === workerId);
    if (changedWorker) {
      await financeCenterDB.save("payroll-workers", changedWorker);
    }

    if (worker && historyItem) {
      const netAmount = Number(historyItem.netSalary || historyItem.grossSalary || 0);
      const cfEntry: CashFlowEntry = {
        id: crypto.randomUUID(),
        type: "expense",
        category: "Staff Salary Disbursement",
        amount: netAmount,
        description: `Payroll payment to ${worker.fullName} (${worker.role || "Staff"}) for ${historyItem.month}`,
        date: new Date().toISOString().slice(0, 10),
        status: "approved",
      };
      await financeCenterDB.save("cash-flow", cfEntry);
      setCashFlow((prev) => [cfEntry, ...prev]);
    }

    toast.success("Payroll marked as paid and cash disbursement recorded.");
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header Nav Bar */}
      <FinanceWorkspaceNav
        activeSection={activeSection}
        selectedEntity={selectedEntity}
        selectedEntityName={selectedEntityName}
        onEntityChange={(ent) => setFinanceEntity(ent)}
        pendingSizingCount={dashboardAnalytics?.stats?.pendingSizing || 0}
        pendingInvCount={invRequests.filter((r) => r.status === "pending").length}
      />

      {/* Render Active Domain Module */}
      {activeSection === "dashboard" && (
        <FinanceOverviewWorkspace
          selectedEntity={selectedEntity}
          totalAssets={totalBankBalance + cashBalance}
          totalBankBalance={totalBankBalance}
          cashBalance={cashBalance}
          telebirrBalance={telebirrBalance}
          bankMoneyOnly={bankMoneyOnly}
          cfIncome={cfIncome}
          cfExpense={cfExpense}
          totalVAT={totalVAT}
          totalLoans={totalLoans}
          totalRentCollected={totalRentCollected}
          pendingInvCount={invRequests.filter((r) => r.status === "pending").length}
          pendingSizingCount={dashboardAnalytics?.stats?.pendingSizing || 0}
          dashboardAnalytics={dashboardAnalytics}
          cashflowChartData={cashflowChartData}
          dualSourceRevenueData={dualSourceRevenueData}
          bankDistributionData={bankDistributionData}
        />
      )}

      {activeSection === "sizing-proposals" && (
        <PumpSizingProposalsModule
          selectedEntity={selectedEntity}
          onSwitchToMM={() => setFinanceEntity("MM")}
          canApprove={canApprove}
          onRefreshGlobal={loadFinanceCenterData}
        />
      )}

      {activeSection === "inventory" && (
        <InventoryRequestsModule
          invRequests={invRequests}
          canApprove={canApprove}
          onApprove={(id) => updateInventoryRequestStatus(id, "approved")}
          onReject={(id) => updateInventoryRequestStatus(id, "rejected")}
        />
      )}

      {activeSection === "cashflow" && (
        <CashFlowModule
          allCashFlow={allCashFlow}
          cfIncome={cfIncome}
          cfExpense={cfExpense}
          canApprove={canApprove}
          onAddEntry={handleAddCashFlowEntry}
          onApproveEntry={handleApproveCashFlowEntry}
        />
      )}

      {activeSection === "bank" && (
        <BankAccountsModule
          updatedBankAccounts={updatedBankAccounts}
          financePayments={financePayments}
          selectedBankView={selectedBankView}
          setSelectedBankView={setSelectedBankView}
          onAddBankAccount={handleAddBankAccount}
        />
      )}

      {activeSection === "bank-reconciliation" && (
        <BankReconciliationModule
          bankReconciliations={bankReconciliations}
          selectedEntity={selectedEntity}
          onAddReconciliation={handleAddBankReconciliation}
        />
      )}

      {activeSection === "petty-cash" && (
        <PettyCashModule
          pettyCashRecords={pettyCashRecords}
          selectedEntity={selectedEntity}
          onAddPettyCash={handleAddPettyCash}
        />
      )}

      {activeSection === "building-rent" && (
        <BuildingRentModule
          buildingRents={buildingRents}
          selectedEntity={selectedEntity}
          totalRentCollected={totalRentCollected}
          onAddRent={handleAddRent}
        />
      )}

      {activeSection === "loans" && (
        <LoansModule
          loans={loans}
          selectedEntity={selectedEntity}
          canApprove={canApprove}
          onAddLoan={handleAddLoan}
          onRecordPayment={handleRecordLoanPayment}
        />
      )}

      {activeSection === "budget" && (
        <BudgetModule
          budgets={budgets}
          selectedEntity={selectedEntity}
          onAddBudget={handleAddBudget}
        />
      )}

      {activeSection === "vat" && (
        <VatComplianceModule
          vatRecords={vatRecords}
          totalVAT={totalVAT}
        />
      )}

      {activeSection === "payroll" && (
        <PayrollModule
          payrollWorkers={payrollWorkers}
          canApprove={canApprove}
          onMarkPaid={handleMarkPayrollPaid}
        />
      )}

      {activeSection === "financials" && (
        <FinancialStatementsModule
          journalEntries={journalEntries}
        />
      )}

      {activeSection === "peachtree" && (
        <PeachtreePage />
      )}

      {activeSection === "reports" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Rent Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-black font-mono">{formatCurrency(totalRentCollected)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total Payroll</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-black font-mono">{formatCurrency(totalPayroll)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total VAT</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-black font-mono text-destructive">{formatCurrency(totalVAT)}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-muted/30 p-3 text-center border">
                  <p className="text-xs text-muted-foreground font-semibold">Bank Balance</p>
                  <p className="text-sm font-bold font-mono text-primary mt-1">{formatCurrency(totalBankBalance)}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center border">
                  <p className="text-xs text-muted-foreground font-semibold">Cash Flow (Net)</p>
                  <p className={`text-sm font-bold font-mono mt-1 ${cfIncome - cfExpense >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {formatCurrency(cfIncome - cfExpense)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center border">
                  <p className="text-xs text-muted-foreground font-semibold">Loan Outstanding</p>
                  <p className="text-sm font-bold font-mono text-warning mt-1">{formatCurrency(totalLoans)}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center border">
                  <p className="text-xs text-muted-foreground font-semibold">Total Income (CF)</p>
                  <p className="text-sm font-bold font-mono text-emerald-600 mt-1">{formatCurrency(cfIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
