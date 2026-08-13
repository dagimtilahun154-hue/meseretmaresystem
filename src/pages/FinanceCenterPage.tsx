import { useEffect, useState, useMemo, Fragment } from "react";
import { apiClient } from "@/lib/api/client";
import { useStore } from "@/context/StoreContext";
import { ClientFileModal } from "@/components/ClientFileModal";
import { financeStore, normalizePayment, Payment, toMoneyNumber } from "@/lib/finance-hub-store";
import { analyticsDB, financeCenterDB, inventoryRequestsDB, journalDB, hierarchyRequestsDB } from "@/lib/db-service";
import { ETHIOPIAN_BANKS } from "@/lib/data";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useParams } from "react-router-dom";
import {
  DollarSign, Users, BarChart3, FileText, Plus, Check, X,
  Clock, CheckCircle2, XCircle, Landmark,
  CreditCard, Calendar, CalendarClock, ArrowUpRight, ArrowDownRight, Building, Coins, Droplets
} from "lucide-react";
import { toast } from "sonner";
import {
  BankReconciliationRecord, BuildingRentRecord, BudgetRecord, PayrollWorker, VATRecord,
  LoanRecord, CashFlowEntry, BankAccount, PettyCashRecord, PettyCashEntry,
  RequestStatus
} from "@/lib/finance-data";
import {
  DEFAULT_ACCOUNTS, generateBalanceSheet, generateIncomeStatement, JournalEntry
} from "@/lib/accounting-system";
import { InventoryRequest } from "@/lib/inventory-requests";
import { formatCurrency } from "@/lib/data";
import { downloadCSV, generateVATExport, generatePayrollExport, generateCashFlowExport } from "@/lib/export-utils";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import PeachtreePage from "@/pages/PeachtreePage";

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

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

type InventoryRequestWithPrice = InventoryRequest & {
  price?: number;
};

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
  const type = payload.type === "expense" || payload.flowType === "expense" || amount < 0
    ? "expense"
    : "income";
  const id = String(payload.id ?? payload.reference ?? crypto.randomUUID());
  const date = String(payload.date ?? payload.createdAt ?? new Date().toISOString()).slice(0, 10);

  return {
    id,
    type,
    category: String(payload.category ?? payload.note ?? (type === "income" ? "Income" : "Expense")),
    amount: Math.abs(amount),
    description: String(payload.description ?? payload.memo ?? payload.note ?? ""),
    date,
    status: payload.status === "pending" || payload.status === "rejected" ? payload.status : "approved",
  };
}

function normalizeAccountingJournalEntry(entry: any): JournalEntry | null {
  if (Array.isArray(entry.lines)) return entry as JournalEntry;
  if (!entry.debitAccount || !entry.creditAccount || !entry.amount) return null;

  return {
    id: entry.id,
    date: entry.date,
    description: entry.description,
    referenceId: entry.referenceId,
    lines: [
      { accountId: entry.debitAccount, type: "debit", amount: Number(entry.amount) },
      { accountId: entry.creditAccount, type: "credit", amount: Number(entry.amount) },
    ],
  };
}

export default function FinanceCenterPage() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const activeSection = section && FINANCE_SECTIONS.has(section) ? section : "dashboard";
  const { hasAccess, currentUser } = useAuth();
  const canApprove = hasAccess(["finance"]);
  const { fieldWorks, sales, financePayments, financeEntity, refreshStoreData } = useStore() as any;

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
  const selectedEntity = financeEntity as "FZ" | "MM";
  const selectedEntityName = selectedEntity === "FZ" ? "Fasil Zelalem" : "Meseret Mare";

  const [sizingProposals, setSizingProposals] = useState<any[]>([]);
  const [loadingSizing, setLoadingSizing] = useState<boolean>(false);
  const [fileModalOpen, setFileModalOpen] = useState<boolean>(false);
  const [fileModalProposal, setFileModalProposal] = useState<any | null>(null);

  const fetchSizingProposals = async () => {
    setLoadingSizing(true);
    try {
      const res = await apiClient.get("/sizing-requests");
      setSizingProposals(res.data);
    } catch (e) {
      console.error("Failed to load sizing proposals in Finance Center", e);
    } finally {
      setLoadingSizing(false);
    }
  };

  const handleRegisterSizingPayment = async (id: string) => {
    try {
      await apiClient.patch(`/sizing-requests/${id}/finance-pay`);
      toast.success("Client payment registered successfully! Proposal marked as Paid.");
      fetchSizingProposals();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to register payment.");
    }
  };

  useEffect(() => {
    fetchSizingProposals();
  }, []);

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
  const updatedBankAccounts = useMemo(() => {
    // Start with ALL Ethiopian banks as the baseline
    const allBanks = [...ETHIOPIAN_BANKS, "Telebirr"];
    
    // Merge with any custom banks from persisted data or transactions
    bankAccounts.forEach(acc => {
      if (!allBanks.includes(acc.bankName)) {
        allBanks.push(acc.bankName);
      }
    });

    // Group all POS/Bank/Mobile payments by bank name
    const bankGroups: Record<string, { total: number, count: number, latest: string }> = {};
    
    const safePayments = Array.isArray(financePayments) ? financePayments.map(normalizePayment) : [];

    safePayments
      .filter(p => p.type === "received" && (p.method === "Bank Transfer" || p.method === "Mobile Money"))
      .forEach(p => {
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

    // Create the final accounts list
    return allBanks.map(bName => {
      const g = bankGroups[bName] || { total: 0, count: 0, latest: "" };
      const persistedAccount = bankAccounts.find(a => a.bankName === bName);
      
      return {
        id: `ba-${bName.replace(/\s+/g, "-").toLowerCase()}`,
        bankName: bName,
        accountNumber: persistedAccount?.accountNumber || "POS Linked",
        balance: toMoneyNumber(persistedAccount?.balance) + g.total,
        lastUpdated: g.latest || persistedAccount?.lastUpdated || "—"
      };
    });
  }, [bankAccounts, financePayments]);

  const selectedBankTransactions = useMemo(() => {
    if (!selectedBankView) return [];
    const safePayments = Array.isArray(financePayments) ? financePayments.map(normalizePayment) : [];
    return safePayments.filter(p => p.bankName === selectedBankView);
  }, [selectedBankView, financePayments]);

  useEffect(() => {
    let mounted = true;

    async function loadFinanceCenterData() {
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

        if (!mounted) return;

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
            ? journalEntriesData.map(normalizeAccountingJournalEntry).filter(Boolean) as JournalEntry[]
            : []
        );
        setDashboardAnalytics(analyticsData);
      } catch {
        if (mounted) toast.error("Could not load finance center data");
      }
    }

    loadFinanceCenterData();
    const timer = window.setInterval(loadFinanceCenterData, 60000);
    const onFocus = () => loadFinanceCenterData();
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [selectedEntity]);

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
        status === "approved"
          ? "Inventory request approved and stock updated"
          : "Inventory request rejected"
      );
    } catch (error) {
      console.error("Finance inventory request update failed", error);
      toast.error("Could not update inventory request");
    }
  };

  const addRent = async () => {
    if (!rentForm.roomNo || !rentForm.rentPrice || !rentForm.amount) {
      toast.error("Fill all required fields.");
      return;
    }
    const newRent: BuildingRentRecord = {
      id: Date.now().toString(),
      entity: selectedEntity,
      month: rentForm.month,
      floor: rentForm.floor,
      roomNo: rentForm.roomNo,
      collection: rentForm.collection,
      rentPrice: Number(rentForm.rentPrice),
      amount: Number(rentForm.amount),
      status: rentForm.status,
      remark: rentForm.remark
    };
    await financeCenterDB.add("building-rents", newRent);
    setBuildingRents(prev => [...prev, newRent]);
    setRentDialog(false);
    toast.success("Rent record added.");
    setRentForm({
      month: new Date().toLocaleString("default", { month: "long" }),
      floor: "Ground",
      roomNo: "",
      collection: "",
      rentPrice: "",
      amount: "",
      status: "paid",
      remark: ""
    });
  };

  const handleInvApprove = (id: string) => void updateInventoryRequestStatus(id, "approved");
  const handleInvReject = (id: string) => void updateInventoryRequestStatus(id, "rejected");

  const markPayrollPaid = (workerId: string, entryId: string) => {
    setPayrollWorkers((prev) =>
      prev.map((w) =>
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
      )
    );
    toast.success("Marked as paid");
  };

  const [budgetDialog, setBudgetDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ type: "monthly" as BudgetRecord["type"], amount: "", label: "" });
  const [rentDialog, setRentDialog] = useState(false);
  const [rentForm, setRentForm] = useState<{
    month: string;
    floor: BuildingRentRecord["floor"];
    roomNo: string;
    collection: string;
    rentPrice: string;
    amount: string;
    status: "paid" | "pending";
    remark: string;
  }>({
    month: new Date().toLocaleString("default", { month: "long" }),
    floor: "Ground",
    roomNo: "",
    collection: "",
    rentPrice: "",
    amount: "",
    status: "paid",
    remark: ""
  });

  const addBudget = async () => {
    if (!budgetForm.amount || !budgetForm.label) {
      toast.error("Fill all fields");
      return;
    }
    const record: BudgetRecord = {
      id: crypto.randomUUID(),
      entity: selectedEntity,
      type: budgetForm.type,
      amount: Number(budgetForm.amount),
      label: budgetForm.label,
      date: new Date().toISOString().slice(0, 10),
    };
    if (!(await financeCenterDB.save("budgets", record))) {
      toast.error("Could not add budget");
      return;
    }
    setBudgets((prev) => [...prev, record]);
    setBudgetDialog(false);
    toast.success("Budget added");
  };

  const [loanPayDialog, setLoanPayDialog] = useState(false);
  const [loanPayForm, setLoanPayForm] = useState({ loanId: "", amount: "", note: "" });

  const addLoanPayment = async () => {
    if (!loanPayForm.amount) {
      toast.error("Enter amount");
      return;
    }
    const updatedLoan = loans.find((l) => l.id === loanPayForm.loanId);
    if (!updatedLoan) {
      toast.error("Select a loan");
      return;
    }

    const nextLoan = {
      ...updatedLoan,
      remainingBalance: updatedLoan.remainingBalance - Number(loanPayForm.amount),
      payments: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          amount: Number(loanPayForm.amount),
          note: loanPayForm.note,
        },
        ...updatedLoan.payments,
      ],
    };

    if (!(await financeCenterDB.save("loans", nextLoan))) {
      toast.error("Could not record loan payment");
      return;
    }

    setLoans((prev) => prev.map((l) => (l.id === nextLoan.id ? nextLoan : l)));
    setLoanPayDialog(false);
    toast.success("Loan payment recorded");
  };

  const [cfDialog, setCfDialog] = useState(false);
  const [cfForm, setCfForm] = useState({ type: "income" as "income" | "expense", category: "", amount: "", description: "" });

  const [bankAccountDialog, setBankAccountDialog] = useState(false);
  const [bankAccountForm, setBankAccountForm] = useState({ bankName: "", accountNumber: "", initialBalance: "" });

  const [newLoanDialog, setNewLoanDialog] = useState(false);
  const [newLoanForm, setNewLoanForm] = useState({ bankName: "", loanAmount: "", interestRate: "", monthlyPayment: "", startDate: "", endDate: "" });

  const [bankRecDialog, setBankRecDialog] = useState(false);
  const [bankRecForm, setBankRecForm] = useState({ bankName: "", accountNo: "", currency: "ETB", reconciliationPeriod: "", preparedBy: "", reviewedBy: "", bankStatementBalance: "", depositInTransit: "", outstandingCheque: "", companyCashBook: "", bankCredits: "", bankCharges: "" });

  const [pettyCashDialog, setPettyCashDialog] = useState(false);
  const [pettyCashForm, setPettyCashForm] = useState({ beginningBalance: "", chequeNo: "", period: "", preparedBy: "", checkedBy: "", approvedBy: "", entries: [] as Omit<PettyCashEntry, "id">[] });

  const handleAddBankAccount = async () => {
    if (!bankAccountForm.bankName || !bankAccountForm.accountNumber) return toast.error("Fill required fields");
    const record: BankAccount = {
      id: crypto.randomUUID(),
      bankName: bankAccountForm.bankName,
      accountNumber: bankAccountForm.accountNumber,
      balance: Number(bankAccountForm.initialBalance) || 0,
      lastUpdated: new Date().toISOString()
    };
    if (await financeCenterDB.add("bank-accounts", record)) {
      setBankAccounts(prev => [...prev, record]);
      setBankAccountDialog(false);
      toast.success("Bank account added");
    } else toast.error("Failed to add bank account");
  };

  const handleAddLoan = async () => {
    if (!newLoanForm.bankName || !newLoanForm.loanAmount) return toast.error("Fill required fields");
    const record: LoanRecord = {
      id: crypto.randomUUID(),
      entity: selectedEntity,
      bankName: newLoanForm.bankName,
      loanAmount: Number(newLoanForm.loanAmount),
      interestRate: Number(newLoanForm.interestRate),
      remainingBalance: Number(newLoanForm.loanAmount),
      monthlyPayment: Number(newLoanForm.monthlyPayment),
      startDate: newLoanForm.startDate,
      endDate: newLoanForm.endDate,
      nextPaymentDate: newLoanForm.startDate,
      status: "active",
      payments: []
    };
    if (await financeCenterDB.add("loans", record)) {
      setLoans(prev => [...prev, record]);
      setNewLoanDialog(false);
      toast.success("Loan added");
    } else toast.error("Failed to add loan");
  };

  const handleAddBankReconciliation = async () => {
    if (!bankRecForm.bankName) return toast.error("Fill required fields");
    const record: BankReconciliationRecord = {
      id: crypto.randomUUID(),
      entity: selectedEntity,
      ...bankRecForm,
      date: new Date().toISOString().slice(0, 10),
      bankStatementBalance: Number(bankRecForm.bankStatementBalance) || 0,
      depositInTransit: Number(bankRecForm.depositInTransit) || 0,
      outstandingCheque: Number(bankRecForm.outstandingCheque) || 0,
      companyCashBook: Number(bankRecForm.companyCashBook) || 0,
      bankCredits: Number(bankRecForm.bankCredits) || 0,
      bankCharges: Number(bankRecForm.bankCharges) || 0,
    };
    if (await financeCenterDB.add("bank-reconciliations", record)) {
      setBankReconciliations(prev => [...prev, record]);
      setBankRecDialog(false);
      toast.success("Bank reconciliation saved");
    } else toast.error("Failed to save bank reconciliation");
  };

  const handleAddPettyCash = async () => {
    if (!pettyCashForm.chequeNo) return toast.error("Cheque No is required");
    const record: PettyCashRecord = {
      id: crypto.randomUUID(),
      entity: selectedEntity,
      beginningBalance: Number(pettyCashForm.beginningBalance) || 0,
      chequeNo: pettyCashForm.chequeNo,
      period: pettyCashForm.period,
      preparedBy: pettyCashForm.preparedBy,
      checkedBy: pettyCashForm.checkedBy,
      approvedBy: pettyCashForm.approvedBy,
      date: new Date().toISOString().slice(0, 10),
      entries: pettyCashForm.entries.map(e => ({ ...e, id: crypto.randomUUID(), amount: Number(e.amount) || 0 }))
    };
    if (await financeCenterDB.add("petty-cash-records", record)) {
      setPettyCashRecords(prev => [...prev, record]);
      setPettyCashDialog(false);
      toast.success("Petty cash settlement saved");
    } else toast.error("Failed to save petty cash settlement");
  };

  const addCashFlowEntry = async () => {
    if (!cfForm.amount || !cfForm.category) {
      toast.error("Fill required fields");
      return;
    }
    const isDraft = !canApprove;
    const record: CashFlowEntry = {
      id: crypto.randomUUID(),
      ...cfForm,
      amount: toMoneyNumber(cfForm.amount),
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
          title: `Cash Flow Approval: ${cfForm.category}`,
          description: `Cash Flow entry proposed by ${currentUser?.displayName || "Accountant"}.\nCategory: ${cfForm.category}\nAmount: ${cfForm.amount} ETB\nDescription: ${cfForm.description || ""}`,
          amount: toMoneyNumber(cfForm.amount),
          type: "GENERAL",
          comment: `Draft entry created. Reference ID: ${record.id}`
        });
        toast.success("Cash flow proposal submitted to Finance Admin!");
      } catch (e) {
        console.error("Failed to submit workflow request:", e);
      }
    } else {
      toast.success("Cash flow entry added");
    }

    setCashFlow((prev) => [record, ...prev]);
    setCfDialog(false);
  };

  const approveCashFlowEntry = async (id: string) => {
    const entry = cashFlow.find(c => c.id === id);
    if (!entry) return;
    const updated: CashFlowEntry = { ...entry, status: "approved" };
    if (await financeCenterDB.save("cash-flow", updated)) {
      setCashFlow(prev => prev.map(c => c.id === id ? updated : c));
      toast.success("Cash flow entry approved!");
    } else {
      toast.error("Failed to approve entry");
    }
  };


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
  const cashBalance = normalizedFinancePayments.filter(p => p.type === "received" && p.method === "Cash").reduce((s, p) => s + toMoneyNumber(p.amount), 0);
  const telebirrBalance = normalizedFinancePayments.filter(p => p.type === "received" && p.method === "Mobile Money").reduce((s, p) => s + toMoneyNumber(p.amount), 0);
  const bankMonyOnly = totalBankBalance - telebirrBalance;

  const totalLoans = loans
    .filter((l) => l.entity === selectedEntity)
    .reduce((s, l) => s + toMoneyNumber(l.remainingBalance), 0);

  const CompanyPill = () => (
    <Badge variant="outline" className="border-primary/30 bg-primary/10 px-3 py-1 text-primary">
      {selectedEntity} · {selectedEntityName}
    </Badge>
  );

  const cashflowChartData = useMemo(() => {
    const byDate: Record<string, { income: number, expense: number }> = {};
    allCashFlow.forEach(c => {
      const d = c.date.slice(5); // MM-DD
      if (!byDate[d]) byDate[d] = { income: 0, expense: 0 };
      if (c.type === "income") byDate[d].income += toMoneyNumber(c.amount);
      else byDate[d].expense += toMoneyNumber(c.amount);
    });
    return Object.entries(byDate).map(([date, data]) => ({ date, income: data.income, expense: data.expense })).sort((a,b) => a.date.localeCompare(b.date)).slice(-14);
  }, [allCashFlow]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold font-heading">Finance Center</h1>
            <CompanyPill />
          </div>
          <p className="text-sm text-muted-foreground">Manage costs, expenses, budgets, payroll, loans & VAT</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground text-center uppercase font-bold mb-1">Total Assets</p>
            <p className="text-xl font-bold text-primary text-center">{formatCurrency(totalBankBalance + cashBalance)}</p>
            <div className="mt-2 pt-2 border-t border-primary/10 flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-medium">{formatCurrency(bankMonyOnly)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Cash:</span>
                <span className="font-medium">{formatCurrency(cashBalance)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Telebirr:</span>
                <span className="font-medium text-secondary">{formatCurrency(telebirrBalance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Cash Flow (Net)</p><p className={`text-lg font-bold ${cfIncome - cfExpense >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(cfIncome - cfExpense)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total VAT</p><p className="text-lg font-bold text-destructive">{formatCurrency(totalVAT)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Loan Outstanding</p><p className="text-lg font-bold text-warning">{formatCurrency(totalLoans)}</p></CardContent></Card>
      </div>

      <Tabs value={activeSection} className="space-y-4">
        <TabsContent value="dashboard">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary/80 mb-1">Total Sales</p>
                  <p className="text-3xl font-black text-primary">{formatCurrency(dashboardAnalytics?.stats?.totalSales || 0)}</p>
                  <Badge variant="outline" className="mt-2 bg-background/50 border-primary/20">{dashboardAnalytics?.stats?.uniqueCustomers || 0} Customers</Badge>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Net Cash Flow</p>
                  <p className={`text-3xl font-black ${(dashboardAnalytics?.stats?.netCashFlow || 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(dashboardAnalytics?.stats?.netCashFlow || 0)}
                  </p>
                  <p className="text-[10px] uppercase text-muted-foreground mt-2 font-semibold">Income minus expenses</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/finance/inventory")}>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-warning mb-1">Pending Inventory</p>
                  <p className="text-3xl font-black text-warning">{invRequests.filter((r) => r.status === "pending").length}</p>
                  <Button variant="link" size="sm" className="mt-1 h-auto py-0 text-warning hover:text-warning/80">Waiting approval</Button>
                </CardContent>
              </Card>
              <Card className="shadow-sm cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/finance/sizing-proposals")}>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Sizing Proposals</p>
                  <p className="text-3xl font-black text-blue-600">{sizingProposals.filter((p) => p.status === "APPROVED_TM").length}</p>
                  <Button variant="link" size="sm" className="mt-1 h-auto py-0 text-blue-600 hover:text-blue-700">Awaiting Payment</Button>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Peachtree Sync</p>
                  <p className="text-lg font-black truncate max-w-full text-center">{dashboardAnalytics?.peachtree?.lastFileName || "No sync yet"}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{dashboardAnalytics?.peachtree?.lastSyncAt ? new Date(dashboardAnalytics.peachtree.lastSyncAt).toLocaleString() : "Waiting for import"}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <Card className="shadow-sm border-border/50">
                <CardHeader className="bg-muted/10 border-b pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-primary" /> Cash Flow Trend (14 Days)
                  </CardTitle>
                  <CardDescription>Income vs Expenses over time</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-6">
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashflowChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-800" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}`} dx={-10} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val: number) => formatCurrency(val)} />
                        <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                        <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="bg-muted/10 border-b pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Recent Cash Flow</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/finance/cashflow")}>View All</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {allCashFlow.slice(0, 5).map((cf) => (
                          <TableRow key={cf.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="w-[40px] pl-4">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cf.type === 'income' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                {cf.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-semibold text-sm">{cf.category}</p>
                              <p className="text-xs text-muted-foreground">{cf.date}</p>
                            </TableCell>
                            <TableCell className={`text-right font-bold pr-4 ${cf.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                              {cf.type === "income" ? "+" : "-"}{formatCurrency(cf.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {allCashFlow.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No cash flow records yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cashflow">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="grid grid-cols-2 gap-3 flex-1 mr-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                    <div><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-bold text-primary">{formatCurrency(cfIncome)}</p></div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-800">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ArrowDownRight className="h-5 w-5 text-destructive" />
                    <div><p className="text-xs text-muted-foreground">Expense</p><p className="text-lg font-bold text-destructive">{formatCurrency(cfExpense)}</p></div>
                  </CardContent>
                </Card>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadCSV("cashflow_export.csv", generateCashFlowExport(allCashFlow))}>
                  <FileText className="h-4 w-4 mr-1" /> Export
                </Button>
                <Button onClick={() => { setCfForm({ type: "income", category: "", amount: "", description: "" }); setCfDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {allCashFlow.map((cf) => (
                      <TableRow key={cf.id}>
                        <TableCell>{cf.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cf.type === "income" ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}>
                            {cf.type === "income" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}{cf.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{cf.category}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{cf.description}</TableCell>
                        <TableCell className={`text-right font-medium ${cf.type === "income" ? "text-success" : "text-destructive"}`}>
                          {cf.type === "income" ? "+" : "-"}{formatCurrency(cf.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cf.status === "pending" ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-green-100 text-green-700 border-green-200"}>
                            {cf.status || "approved"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {cf.status === "pending" && canApprove && (
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white border-0" onClick={() => approveCashFlowEntry(cf.id)}>
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <Dialog open={cfDialog} onOpenChange={setCfDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Cash Flow Entry</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={cfForm.type} onValueChange={(v) => setCfForm({ ...cfForm, type: v as "income" | "expense" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label>Category</Label><Input value={cfForm.category} onChange={(e) => setCfForm({ ...cfForm, category: e.target.value })} placeholder="Sales, Payroll, Transport..." /></div>
                <div className="space-y-1.5"><Label>Amount (ETB)</Label><Input type="number" value={cfForm.amount} onChange={(e) => setCfForm({ ...cfForm, amount: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={cfForm.description} onChange={(e) => setCfForm({ ...cfForm, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setCfDialog(false)}>Cancel</Button><Button onClick={addCashFlowEntry}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="bank">
          {selectedBankView ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setSelectedBankView(null)}>
                  <ArrowDownRight className="h-4 w-4 mr-2 rotate-90" /> Back to all banks
                </Button>
                <Badge variant="outline" className="text-primary font-bold px-3 py-1">
                  {selectedBankView} Details
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Inflow</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedBankTransactions.reduce((s, t) => s + toMoneyNumber(t.amount), 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-200/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Transactions</p>
                    <p className="text-2xl font-bold text-green-600">{selectedBankTransactions.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Latest Entry</p>
                    <p className="text-2xl font-bold">
                      {selectedBankTransactions.length > 0 
                        ? [...selectedBankTransactions].sort((a,b) => b.date.localeCompare(a.date))[0].date 
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Sale ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Bank Name</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBankTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{t.date}</TableCell>
                          <TableCell className="font-mono text-xs">{t.reference || "—"}</TableCell>
                          <TableCell className="font-medium">{t.entityName || "Walk-in Customer"}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{formatCurrency(t.amount)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{t.method}</Badge></TableCell>
                          <TableCell className="text-xs">{t.bankName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground italic">{t.note || "POS Sale"}</TableCell>
                        </TableRow>
                      ))}
                      {selectedBankTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                            No transactions found for this bank.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Select a bank account to view transactions</div>
                <Button onClick={() => setBankAccountDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Bank Account</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {updatedBankAccounts.map((acc) => (
                <Card 
                  key={acc.id} 
                  className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
                  onClick={() => setSelectedBankView(acc.bankName)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">{acc.bankName}</CardTitle>
                          <CardDescription>Account: {acc.accountNumber}</CardDescription>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(acc.balance)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground italic">Last activity: {acc.lastUpdated || "N/A"}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {financePayments.filter(p => p.bankName === acc.bankName).length} Txns
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="loans">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <CompanyPill />
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Showing Accounts For</p>
                  <div className="h-2 w-12 bg-primary rounded-full mt-1" />
                </div>
              </div>
              <Button onClick={() => setNewLoanDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Loan</Button>
            </div>
            {loans.filter(l => l.entity === selectedEntity).map((loan) => {
              const progress = ((loan.loanAmount - loan.remainingBalance) / loan.loanAmount) * 100;
              const isPastDue = loan.status === "past_due";

              return (
                <div key={loan.id} className="relative overflow-hidden rounded-2xl border bg-background p-1 shadow-sm transition-all hover:shadow-md">
                  <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${isPastDue ? 'from-red-500 to-orange-500' : 'from-primary to-secondary'}`} />
                  <div className="relative rounded-xl bg-background/80 backdrop-blur-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-4 rounded-xl flex items-center justify-center ${isPastDue ? 'bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]'}`}>
                          <Landmark className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            {loan.bankName}
                            <Badge variant="outline" className={
                              loan.status === "active" ? "border-green-500/30 text-green-600 bg-green-500/10" : 
                              loan.status === "past_due" ? "border-red-500/30 text-red-600 bg-red-500/10 animate-pulse" : 
                              "border-slate-500/30 text-slate-600 bg-slate-500/10"
                            }>
                              {loan.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center"><CalendarClock className="h-3.5 w-3.5 mr-1" />{loan.startDate} to {loan.endDate}</span>
                            <span>•</span>
                            <span>Rate: <strong className="text-foreground">{loan.interestRate}%</strong></span>
                          </div>
                        </div>
                      </div>
                      
                      {loan.amountDue ? (
                         <div className="text-right bg-red-50/50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                           <p className="text-xs font-bold uppercase text-red-600/80 dark:text-red-400 mb-1">Amount Due</p>
                           <p className={`text-2xl font-black ${isPastDue ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                             {formatCurrency(loan.amountDue)}
                           </p>
                           {loan.remark && <p className="text-xs font-medium text-red-500 mt-1.5 max-w-[220px] leading-tight">{loan.remark}</p>}
                         </div>
                      ) : (
                         <div className="text-right p-3">
                           <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Monthly Payment</p>
                           <p className="text-xl font-bold text-primary">
                             {formatCurrency(loan.monthlyPayment)}
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">Due: {loan.nextPaymentDate}</p>
                         </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:bg-muted/50 transition-colors">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Loan Principal</p>
                        <p className="text-lg font-bold">{formatCurrency(loan.loanAmount)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:bg-muted/50 transition-colors">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Remaining Principal</p>
                        <p className="text-lg font-bold text-warning">{formatCurrency(loan.remainingBalance)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:bg-muted/50 transition-colors">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Accrual Interest</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{loan.remainingAccrualInterest ? formatCurrency(loan.remainingAccrualInterest) : '—'}</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:bg-muted/50 transition-colors">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Repayment Schedule</p>
                        <p className="text-sm font-bold truncate">{loan.repaymentScheduleDate || loan.nextPaymentDate}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(loan.monthlyPayment)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 flex-grow mb-6">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Repayment Progress</span>
                        <span className={progress >= 100 ? "text-green-600" : "text-primary"}>{progress.toFixed(1)}% Completed</span>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div 
                           className={`h-full flex-1 transition-all duration-500 ease-in-out ${isPastDue ? 'bg-red-500' : 'bg-primary'}`} 
                           style={{ transform: `translateX(-${100 - (progress || 0)}%)` }} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-3 flex-wrap">
                        {(loan.status === "active" || loan.status === "past_due") && canApprove && (
                          <Button 
                            className={`shadow-sm transition-all hover:scale-105 active:scale-95 ${isPastDue ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                            onClick={() => { setLoanPayForm({ loanId: loan.id, amount: String(loan.amountDue || loan.monthlyPayment), note: "" }); setLoanPayDialog(true); }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" /> Make Payment
                          </Button>
                        )}
                        {loan.followUp && (
                          <Badge variant="secondary" className="px-3 py-1 text-xs">
                            Follow up: {loan.followUp}
                          </Badge>
                        )}
                      </div>

                      {loan.payments.length > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1">Last Payment</p>
                          <p className="text-sm font-medium flex items-center justify-end gap-1">
                            <span className="text-green-600 dark:text-green-400">{formatCurrency(loan.payments[0].amount)}</span>
                            <span className="text-muted-foreground font-normal">on {loan.payments[0].date}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Dialog open={loanPayDialog} onOpenChange={setLoanPayDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl"><CreditCard className="h-5 w-5 text-primary"/> Record Loan Payment</DialogTitle>
                <DialogDescription>
                  Enter the payment details to update the loan balance.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Payment Amount (ETB)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-muted-foreground font-medium text-sm">ETB</span>
                    <Input className="pl-12 font-bold text-lg h-12" type="number" value={loanPayForm.amount} onChange={(e) => setLoanPayForm({ ...loanPayForm, amount: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Note / Reference</Label>
                  <Input className="h-10" value={loanPayForm.note} onChange={(e) => setLoanPayForm({ ...loanPayForm, note: e.target.value })} placeholder="E.g., Monthly installment for March" />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 mt-2">
                <Button variant="ghost" onClick={() => setLoanPayDialog(false)}>Cancel</Button>
                <Button className="font-bold px-6 shadow-md" onClick={addLoanPayment}>Record Payment</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="bank-reconciliation">
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h2 className="text-lg font-bold">Bank Reconciliation</h2>
                  <p className="text-sm text-muted-foreground">Match company books with bank statements</p>
               </div>
               <div className="flex items-center gap-4">
                 <CompanyPill />
                 <Button onClick={() => setBankRecDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Reconciliation</Button>
               </div>
            </div>
            
            {bankReconciliations.filter(r => r.entity === selectedEntity).map((rec) => {
              const adjustedBankBalance = rec.bankStatementBalance + rec.depositInTransit - rec.outstandingCheque;
              const adjustedCompanyCash = rec.companyCashBook + rec.bankCredits - rec.bankCharges;
              const difference = adjustedBankBalance - adjustedCompanyCash;
              const isBalanced = difference === 0;

              return (
                <Card key={rec.id} className="overflow-hidden shadow-md border-border/50">
                  <div className={`h-2 w-full ${isBalanced ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Header Info Left */}
                    <div className="p-6 border-b lg:border-b-0 lg:border-r border-border bg-muted/10">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" /> Bank Information
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 border-b border-border/50 pb-3">
                          <div className="text-sm text-muted-foreground font-medium">Bank Name:</div>
                          <div className="col-span-2 font-semibold text-right">{rec.bankName}</div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-border/50 pb-3">
                          <div className="text-sm text-muted-foreground font-medium">Account No.</div>
                          <div className="col-span-2 font-semibold text-right">{rec.accountNo}</div>
                        </div>
                        <div className="grid grid-cols-3 border-b border-border/50 pb-3">
                          <div className="text-sm text-muted-foreground font-medium">Currency:</div>
                          <div className="col-span-2 font-semibold text-right">{rec.currency}</div>
                        </div>
                        <div className="grid grid-cols-3 pb-2 mt-4">
                          <div className="text-sm text-muted-foreground font-medium">Period:</div>
                          <div className="col-span-2 font-bold text-primary text-right">{rec.reconciliationPeriod}</div>
                        </div>
                      </div>

                      <div className="mt-8 space-y-3 bg-background p-4 rounded-xl border border-border shadow-sm">
                        <div className="grid grid-cols-3">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prepared by:</div>
                          <div className="col-span-2 text-sm font-medium text-right">{rec.preparedBy}</div>
                        </div>
                        <div className="grid grid-cols-3">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reviewed by:</div>
                          <div className="col-span-2 text-sm font-medium text-right">{rec.reviewedBy}</div>
                        </div>
                        <div className="grid grid-cols-3 pt-2 border-t border-border/50">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date:</div>
                          <div className="col-span-2 text-sm font-bold text-right">{rec.date}</div>
                        </div>
                      </div>
                    </div>

                    {/* Details Table Right */}
                    <div className="p-0">
                      <Table>
                        <TableHeader className="bg-primary/5">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-foreground">Description</TableHead>
                            <TableHead className="text-right font-bold text-foreground w-[150px]">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-muted-foreground">Bank Statement Balance</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(rec.bankStatementBalance)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground pl-8">Deposit In Transit</TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(rec.depositInTransit)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground pl-8">Outstanding Cheque</TableCell>
                            <TableCell className="text-right text-destructive">-{formatCurrency(rec.outstandingCheque)}</TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/30">
                            <TableCell className="font-bold">Adjusted Bank Balance</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(adjustedBankBalance)}</TableCell>
                          </TableRow>
                          
                          <TableRow>
                            <TableCell className="font-medium text-muted-foreground pt-6">Company Cash Book</TableCell>
                            <TableCell className="text-right font-bold pt-6">{formatCurrency(rec.companyCashBook)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground pl-8">Bank Credits</TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(rec.bankCredits)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground pl-8">Bank Charges</TableCell>
                            <TableCell className="text-right text-destructive">-{formatCurrency(rec.bankCharges)}</TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/30">
                            <TableCell className="font-bold">Adjusted Company Cash</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(adjustedCompanyCash)}</TableCell>
                          </TableRow>
                          
                          <TableRow className={`${isBalanced ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <TableCell className="font-black text-lg py-4">Difference</TableCell>
                            <TableCell className={`text-right font-black text-lg py-4 ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                              {formatCurrency(difference)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="building-rent">
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h2 className="text-lg font-bold">Building Rent Collection</h2>
                  <p className="text-sm text-muted-foreground">Track rental collections per floor</p>
               </div>
               <div className="flex items-center gap-6">
                  <CompanyPill />
                  <Badge variant="outline" className="px-4 py-1.5 bg-primary/10 text-primary border-primary/30 text-base font-bold">
                    Total Collected: <span className="ml-2 font-black">{formatCurrency(totalRentCollected)}</span>
                  </Badge>
                  <Button onClick={() => setRentDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Rent
                  </Button>
               </div>
            </div>
            {Object.entries(buildingRents.filter(r => r.entity === selectedEntity).reduce((acc, rent) => {
              if (!acc[rent.month]) acc[rent.month] = [];
              acc[rent.month].push(rent);
              return acc;
            }, {} as Record<string, BuildingRentRecord[]>)).map(([month, rents]) => {
              const monthTotal = rents.reduce((s, r) => s + toMoneyNumber(r.amount), 0);
              const floors = ["Ground", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"];
              
              return (
                <Card key={month} className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
                   <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                      <div className="flex justify-between items-center">
                         <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-primary" /> {month}
                         </CardTitle>
                         <Badge variant="outline" className="text-sm bg-primary/5 text-primary border-primary/20">
                            Month Total: <span className="font-bold ml-1">{formatCurrency(monthTotal)}</span>
                         </Badge>
                      </div>
                   </CardHeader>
                   <CardContent className="p-0">
                      <Table>
                        <TableHeader className="bg-muted/10">
                          <TableRow>
                            <TableHead className="w-[120px]">Floor</TableHead>
                            <TableHead>Room No.</TableHead>
                            <TableHead>Collection</TableHead>
                            <TableHead className="text-right">Rent Price</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Remark</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {floors.map(floor => {
                             const floorRents = rents.filter(r => r.floor === floor);
                             if (floorRents.length === 0) return null;
                             const floorSubTotal = floorRents.reduce((s, r) => s + toMoneyNumber(r.amount), 0);
                             const floorExpected = floorRents.reduce((s, r) => s + toMoneyNumber(r.rentPrice), 0);
                             
                             return (
                               <Fragment key={floor}>
                                 {floorRents.map((r, idx) => (
                                   <TableRow key={r.id} className={`group ${r.status === 'pending' ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                                     {idx === 0 ? <TableCell rowSpan={floorRents.length} className="font-bold align-top bg-muted/5 border-r border-border/30">{floor}</TableCell> : null}
                                     <TableCell className="font-medium">{r.roomNo}</TableCell>
                                     <TableCell>
                                       <Badge variant="secondary" className="text-[10px] uppercase font-bold text-muted-foreground">{r.collection}</Badge>
                                     </TableCell>
                                     <TableCell className="text-right text-muted-foreground">{formatCurrency(r.rentPrice)}</TableCell>
                                     <TableCell className={`text-right font-bold ${r.amount === 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                        {formatCurrency(r.amount)}
                                     </TableCell>
                                     <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.remark || "—"}</TableCell>
                                     <TableCell>
                                       <Badge variant="outline" className={r.status === "paid" ? "bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200"}>
                                         {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                         {r.status === "paid" && <Check className="h-3 w-3 mr-1" />}
                                         {r.status.toUpperCase()}
                                       </Badge>
                                     </TableCell>
                                   </TableRow>
                                 ))}
                                 <TableRow className="bg-muted/10 border-b-2">
                                   <TableCell colSpan={2} className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground border-r border-border/30">Sub Total {floor}</TableCell>
                                   <TableCell className="text-right font-bold text-muted-foreground line-through opacity-70">{formatCurrency(floorExpected)}</TableCell>
                                   <TableCell className="text-right font-black text-primary text-base">{formatCurrency(floorSubTotal)}</TableCell>
                                   <TableCell colSpan={2}></TableCell>
                                 </TableRow>
                               </Fragment>
                             )
                          })}
                        </TableBody>
                      </Table>
                   </CardContent>
                </Card>
              )
            })}
          </div>
          
           <Dialog open={rentDialog} onOpenChange={setRentDialog}>
             <DialogContent>
               <DialogHeader><DialogTitle>Record Building Rent</DialogTitle></DialogHeader>
               <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <Label>Month</Label>
                     <Input value={rentForm.month} onChange={e => setRentForm(prev => ({...prev, month: e.target.value}))} placeholder="e.g. March" />
                   </div>
                   <div className="space-y-1.5">
                     <Label>Floor</Label>
                     <Select value={rentForm.floor} onValueChange={(v: BuildingRentRecord["floor"]) => setRentForm(prev => ({...prev, floor: v}))}>
                       <SelectTrigger><SelectValue/></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Ground">Ground Floor</SelectItem>
                         <SelectItem value="1st Floor">1st Floor</SelectItem>
                         <SelectItem value="2nd Floor">2nd Floor</SelectItem>
                         <SelectItem value="3rd Floor">3rd Floor</SelectItem>
                         <SelectItem value="4th Floor">4th Floor</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <Label>Room No</Label>
                     <Input value={rentForm.roomNo} onChange={e => setRentForm(prev => ({...prev, roomNo: e.target.value}))} />
                   </div>
                   <div className="space-y-1.5">
                     <Label>Collection Name</Label>
                     <Input value={rentForm.collection} onChange={e => setRentForm(prev => ({...prev, collection: e.target.value}))} />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <Label>Rent Price (ETB)</Label>
                     <Input type="number" value={rentForm.rentPrice} onChange={e => setRentForm(prev => ({...prev, rentPrice: e.target.value}))} />
                   </div>
                   <div className="space-y-1.5">
                     <Label>Paid Amount (ETB)</Label>
                     <Input type="number" value={rentForm.amount} onChange={e => setRentForm(prev => ({...prev, amount: e.target.value}))} />
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <Label>Status</Label>
                     <Select value={rentForm.status} onValueChange={(v: "paid" | "pending") => setRentForm(prev => ({...prev, status: v}))}>
                       <SelectTrigger><SelectValue/></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="paid">Paid</SelectItem>
                         <SelectItem value="pending">Pending</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-1.5">
                     <Label>Remark</Label>
                     <Input value={rentForm.remark} onChange={e => setRentForm(prev => ({...prev, remark: e.target.value}))} />
                   </div>
                 </div>
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setRentDialog(false)}>Cancel</Button>
                 <Button onClick={addRent}>Save Rent</Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader><CardTitle className="text-lg">Inventory Requests</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Approved Date</TableHead>
                  {canApprove && <TableHead className="text-right">Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {invRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell className="font-mono">{r.productCode}</TableCell>
                      <TableCell className="font-medium">{r.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.category}</TableCell>
                      <TableCell className="text-center font-medium">{r.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(r.price || 0))}</TableCell>
                      <TableCell>{r.requestedBy}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.note}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[r.status]}>
                          {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {r.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {r.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.approvedBy || "—"}</TableCell>
                      <TableCell>{r.approvedDate || "—"}</TableCell>
                      {canApprove && <TableCell className="text-right space-x-1">
                        {r.status === "pending" && (<>
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleInvApprove(r.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleInvReject(r.id)}><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                        </>)}
                      </TableCell>}
                    </TableRow>
                  ))}
                  {invRequests.length === 0 && <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">No inventory requests.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizing-proposals">
          <Card>
            <CardHeader className="bg-muted/15 border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-primary" />
                    Sizing Proposals & Client Payment Collections
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Review TM-approved solar pump sizing proposals, inspect calculated equipment packages, and log client payments to authorize fieldwork dispatches.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={fetchSizingProposals} disabled={loadingSizing}>
                  <Clock className="h-3.5 w-3.5 mr-1" /> Refresh List
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Site Address</TableHead>
                    <TableHead>Selected Pump Model</TableHead>
                    <TableHead>Water Demand</TableHead>
                    <TableHead>Calculated Package Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sizingProposals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.clientName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.address || "N/A"}</TableCell>
                      <TableCell className="font-semibold text-primary">{p.selectedPumpModel}</TableCell>
                      <TableCell className="font-mono text-xs">{p.dailyWaterNeed} m³/day</TableCell>
                      <TableCell className="font-mono font-bold text-sm">
                        {p.totalPrice ? `$${Number(p.totalPrice).toLocaleString()}` : "Pending Calc"}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          p.status === "APPROVED_TM" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          p.status === "PAID" ? "bg-green-100 text-green-800 border-green-200" :
                          p.status === "FIELDWORK_CREATED" ? "bg-teal-100 text-teal-800 border-teal-200" :
                          "bg-gray-100 text-gray-800"
                        }>
                          {p.status === "APPROVED_TM" ? "TM Approved (Payable)" :
                           p.status === "PAID" ? "Paid (Awaiting Crew)" :
                           p.status === "FIELDWORK_CREATED" ? "Fieldwork Active" : p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.checkedByName || "TM"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="gap-1 text-xs font-semibold" onClick={() => { setFileModalProposal(p); setFileModalOpen(true); }}>
                            <FileText className="h-3.5 w-3.5 text-primary" /> Full Client File
                          </Button>

                          {p.status === "APPROVED_TM" && canApprove && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-1" onClick={() => handleRegisterSizingPayment(p.id)}>
                              <CreditCard className="h-3.5 w-3.5" /> Register Client Payment
                            </Button>
                          )}
                          {p.status === "PAID" && (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              Payment Logged
                            </Badge>
                          )}
                          {p.status === "FIELDWORK_CREATED" && (
                            <Badge variant="outline" className="text-teal-600 border-teal-200 bg-teal-50">
                              Crew Dispatched
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sizingProposals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No sizing proposals found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h2 className="text-lg font-bold">Budget Management</h2>
                  <p className="text-sm text-muted-foreground">Track daily, monthly and yearly allocated budgets</p>
               </div>
               <div className="flex items-center gap-4">
                 <CompanyPill />
                 <Button onClick={() => { setBudgetForm({ type: "monthly", amount: "", label: "" }); setBudgetDialog(true); }}>
                   <Plus className="h-4 w-4 mr-1" /> Add Budget
                 </Button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["daily", "monthly", "yearly"] as const).map((type) => {
                const typeBudgets = budgets.filter((b) => b.type === type && (!b.entity || b.entity === selectedEntity));
                const total = typeBudgets.reduce((s, b) => s + toMoneyNumber(b.amount), 0);
                
                return (
                  <Card key={type} className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
                    <div className={`h-1.5 w-full ${type === 'daily' ? 'bg-blue-500' : type === 'monthly' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                    <CardHeader className="pb-2 bg-muted/10">
                      <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
                        <span>{type} Budget</span>
                        {type === 'daily' && <Clock className="h-4 w-4" />}
                        {type === 'monthly' && <Calendar className="h-4 w-4" />}
                        {type === 'yearly' && <CalendarClock className="h-4 w-4" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-3xl font-black">{formatCurrency(total)}</p>
                      <p className="text-xs text-muted-foreground mt-2">{typeBudgets.length} active allocations</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="bg-muted/30 p-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Active Budget Allocations
                </h3>
              </div>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow>
                      <TableHead>Label / Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.filter(b => !b.entity || b.entity === selectedEntity).map((b) => (
                      <TableRow key={b.id} className="hover:bg-muted/5">
                        <TableCell className="font-medium">{b.label}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-xs font-semibold">
                            {b.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatCurrency(b.amount)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{b.date}</TableCell>
                      </TableRow>
                    ))}
                    {budgets.filter(b => !b.entity || b.entity === selectedEntity).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-20" />
                          <p>No budget allocations found for the selected entity.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <Dialog open={budgetDialog} onOpenChange={setBudgetDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Budget</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Type</Label><Select value={budgetForm.type} onValueChange={(v) => setBudgetForm({ ...budgetForm, type: v as BudgetRecord["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label>Label</Label><Input value={budgetForm.label} onChange={(e) => setBudgetForm({ ...budgetForm, label: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Amount (ETB)</Label><Input type="number" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setBudgetDialog(false)}>Cancel</Button><Button onClick={addBudget}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Payroll Management</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadCSV("payroll_export.csv", generatePayrollExport(payrollWorkers))}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Export CSV
                  </Button>
                  <Badge variant="outline" className="text-xs">Ethiopian Tax Brackets + 7% Employee / 11% Employer Pension</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Gross Salary</TableHead>
                    <TableHead className="text-right">Income Tax</TableHead>
                    <TableHead className="text-right">Emp. Pension (7%)</TableHead>
                    <TableHead className="text-right">Empr. Pension (11%)</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    {canApprove && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollWorkers.flatMap((w) =>
                    w.history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell>{h.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(h.grossSalary)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(h.incomeTax)}</TableCell>
                        <TableCell className="text-right text-warning">{formatCurrency(h.employeePension)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(h.employerPension)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{formatCurrency(h.netSalary)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={h.status === "paid" ? STATUS_COLORS.approved : STATUS_COLORS.pending}>{h.status}</Badge>
                        </TableCell>
                        {canApprove && <TableCell className="text-right">
                          {h.status === "pending" && <Button size="sm" variant="ghost" className="text-green-600" onClick={() => markPayrollPaid(w.id, h.id)}><Check className="h-3.5 w-3.5 mr-1" /> Pay</Button>}
                        </TableCell>}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Rent Collected</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(totalRentCollected)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Payroll</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total VAT</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(totalVAT)}</p></CardContent></Card>
          </div>
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-xs text-muted-foreground">Bank Balance</p><p className="text-sm font-bold">{formatCurrency(totalBankBalance)}</p></div>
                <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-xs text-muted-foreground">Cash Flow (Net)</p><p className={`text-sm font-bold ${cfIncome - cfExpense >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(cfIncome - cfExpense)}</p></div>
                <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-xs text-muted-foreground">Loan Outstanding</p><p className="text-sm font-bold text-warning">{formatCurrency(loans.reduce((s, l) => s + l.remainingBalance, 0))}</p></div>
                <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-xs text-muted-foreground">Total Income (CF)</p><p className="text-sm font-bold text-green-600">{formatCurrency(cfIncome)}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vat">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">VAT History</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadCSV("vat_export.csv", generateVATExport(vatRecords))}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Export for Tax
                  </Button>
                  <Badge className="bg-primary/10 text-primary">Total: {formatCurrency(totalVAT)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Receipt #</TableHead><TableHead>VAT Amount</TableHead><TableHead>Note</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {vatRecords.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.customerName}</TableCell>
                      <TableCell>{v.receiptNumber}</TableCell>
                      <TableCell>{formatCurrency(v.vatAmount)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{v.note}</TableCell>
                      <TableCell>{v.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="petty-cash">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <CompanyPill />
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Coins className="h-5 w-5 text-warning" /> Petty Cash Settlement
                </h2>
              </div>
              <Button onClick={() => setPettyCashDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Settlement</Button>
            </div>

            {pettyCashRecords.filter(r => r.entity === selectedEntity).map((record) => (
              <Card key={record.id} className="overflow-hidden shadow-lg border-border/50">
                <div className="bg-primary/5 p-6 border-b border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Beginning Balance</p>
                      <p className="text-2xl font-black text-primary">{formatCurrency(record.beginningBalance)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Cheque No.</p>
                      <p className="text-xl font-bold">{record.chequeNo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Period</p>
                      <p className="text-xl font-bold">{record.period}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Date</p>
                      <p className="text-xl font-bold">{record.date}</p>
                    </div>
                  </div>
                </div>

                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[60px] text-center font-bold">No.</TableHead>
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Voucher No.</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                        <TableHead className="text-right font-bold">Amount</TableHead>
                        <TableHead className="text-right font-bold w-[180px]">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.entries.map((entry, index) => {
                        // Calculate running balance
                        const totalSpentSoFar = record.entries.slice(0, index + 1).reduce((sum, e) => sum + toMoneyNumber(e.amount), 0);
                        const currentBalance = record.beginningBalance - totalSpentSoFar;
                        
                        return (
                          <TableRow key={entry.id} className="hover:bg-muted/30">
                            <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">{entry.date}</TableCell>
                            <TableCell className="font-mono text-xs">{entry.voucherNo}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{entry.description}</TableCell>
                            <TableCell className="text-right font-bold text-destructive">
                              {formatCurrency(entry.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={`font-black tracking-tight ${currentBalance < 500 ? 'text-red-500 border-red-200' : 'text-primary border-primary/20'}`}>
                                {formatCurrency(currentBalance)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {/* Footer Totals */}
                      <TableRow className="bg-muted/20 border-t-2">
                        <TableCell colSpan={4} className="text-right font-black uppercase text-xs tracking-widest text-muted-foreground"> Total Expenses </TableCell>
                        <TableCell className="text-right font-black text-lg text-destructive">
                          {formatCurrency(record.entries.reduce((sum, e) => sum + toMoneyNumber(e.amount), 0))}
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex flex-col items-end">
                              <p className="text-[9px] font-black uppercase text-muted-foreground">Remaining Petty Cash</p>
                              <p className="text-xl font-black text-primary">
                                 {formatCurrency(toMoneyNumber(record.beginningBalance) - record.entries.reduce((sum, e) => sum + toMoneyNumber(e.amount), 0))}
                              </p>
                           </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-muted/5 p-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center border-r border-border last:border-0 p-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Prepared By</p>
                    <p className="text-sm font-medium mt-1">{record.preparedBy}</p>
                  </div>
                  <div className="text-center border-r border-border last:border-0 p-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Checked By</p>
                    <p className="text-sm font-medium mt-1">{record.checkedBy}</p>
                  </div>
                  <div className="text-center p-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Approved By</p>
                    <p className="text-sm font-medium mt-1 uppercase tracking-tighter">{record.approvedBy}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="financials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Income Statement (P&L)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const pl = generateIncomeStatement(journalEntries);
                  return (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Revenue</p>
                        {pl.revenue.map((r, i) => (
                          <div key={i} className="flex justify-between text-sm"><span>{r.name}</span><span>{formatCurrency(r.balance)}</span></div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-1"><span>Total Revenue</span><span>{formatCurrency(pl.totalRevenue)}</span></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Expenses</p>
                        {pl.expenses.map((e, i) => (
                          <div key={i} className="flex justify-between text-sm"><span>{e.name}</span><span>{formatCurrency(e.balance)}</span></div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-1"><span>Total Expenses</span><span className="text-destructive">({formatCurrency(pl.totalExpenses)})</span></div>
                      </div>
                      <div className="flex justify-between text-lg font-bold bg-primary/5 p-2 rounded">
                        <span>Net Income</span>
                        <span className={pl.netIncome >= 0 ? "text-green-600" : "text-destructive"}>{formatCurrency(pl.netIncome)}</span>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Balance Sheet</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const bs = generateBalanceSheet(journalEntries);
                  return (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Assets</p>
                        {bs.assets.map((a, i) => (
                          <div key={i} className="flex justify-between text-sm"><span>{a.name}</span><span>{formatCurrency(a.balance)}</span></div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-1"><span>Total Assets</span><span>{formatCurrency(bs.totalAssets)}</span></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Liabilities</p>
                        {bs.liabilities.map((l, i) => (
                          <div key={i} className="flex justify-between text-sm"><span>{l.name}</span><span>{formatCurrency(l.balance)}</span></div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-1"><span>Total Liabilities</span><span>{formatCurrency(bs.totalLiabilities)}</span></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Equity</p>
                        {bs.equity.map((e, i) => (
                          <div key={i} className="flex justify-between text-sm"><span>{e.name}</span><span>{formatCurrency(e.balance)}</span></div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-1"><span>Total Equity</span><span>{formatCurrency(bs.totalEquity)}</span></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground border-t pt-2 italic">
                        <span>L + E</span>
                        <span>{formatCurrency(bs.totalLiabilities + bs.totalEquity)}</span>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="peachtree">
          <PeachtreePage />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={bankAccountDialog} onOpenChange={setBankAccountDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Bank Name</Label><Input value={bankAccountForm.bankName} onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })} placeholder="e.g. Commercial Bank of Ethiopia" /></div>
            <div className="space-y-1.5"><Label>Account Number</Label><Input value={bankAccountForm.accountNumber} onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })} placeholder="e.g. 1000123456789" /></div>
            <div className="space-y-1.5"><Label>Initial Balance (ETB)</Label><Input type="number" value={bankAccountForm.initialBalance} onChange={(e) => setBankAccountForm({ ...bankAccountForm, initialBalance: e.target.value })} placeholder="0.00" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBankAccountDialog(false)}>Cancel</Button><Button onClick={handleAddBankAccount}>Save Bank Account</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newLoanDialog} onOpenChange={setNewLoanDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record New Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2"><Label>Bank Name / Lender</Label><Input value={newLoanForm.bankName} onChange={(e) => setNewLoanForm({ ...newLoanForm, bankName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Loan Amount</Label><Input type="number" value={newLoanForm.loanAmount} onChange={(e) => setNewLoanForm({ ...newLoanForm, loanAmount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Interest Rate (%)</Label><Input type="number" value={newLoanForm.interestRate} onChange={(e) => setNewLoanForm({ ...newLoanForm, interestRate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Monthly Payment</Label><Input type="number" value={newLoanForm.monthlyPayment} onChange={(e) => setNewLoanForm({ ...newLoanForm, monthlyPayment: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={newLoanForm.startDate} onChange={(e) => setNewLoanForm({ ...newLoanForm, startDate: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>End Date</Label><Input type="date" value={newLoanForm.endDate} onChange={(e) => setNewLoanForm({ ...newLoanForm, endDate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewLoanDialog(false)}>Cancel</Button><Button onClick={handleAddLoan}>Save Loan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bankRecDialog} onOpenChange={setBankRecDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Bank Reconciliation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Bank Name</Label><Input value={bankRecForm.bankName} onChange={(e) => setBankRecForm({ ...bankRecForm, bankName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Account No</Label><Input value={bankRecForm.accountNo} onChange={(e) => setBankRecForm({ ...bankRecForm, accountNo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Reconciliation Period</Label><Input value={bankRecForm.reconciliationPeriod} onChange={(e) => setBankRecForm({ ...bankRecForm, reconciliationPeriod: e.target.value })} placeholder="e.g. May 2026" /></div>
            <div className="space-y-1.5"><Label>Bank Statement Balance</Label><Input type="number" value={bankRecForm.bankStatementBalance} onChange={(e) => setBankRecForm({ ...bankRecForm, bankStatementBalance: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Deposit In Transit</Label><Input type="number" value={bankRecForm.depositInTransit} onChange={(e) => setBankRecForm({ ...bankRecForm, depositInTransit: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Outstanding Cheque</Label><Input type="number" value={bankRecForm.outstandingCheque} onChange={(e) => setBankRecForm({ ...bankRecForm, outstandingCheque: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Company Cash Book Balance</Label><Input type="number" value={bankRecForm.companyCashBook} onChange={(e) => setBankRecForm({ ...bankRecForm, companyCashBook: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Bank Credits (Not in CB)</Label><Input type="number" value={bankRecForm.bankCredits} onChange={(e) => setBankRecForm({ ...bankRecForm, bankCredits: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Bank Charges (Not in CB)</Label><Input type="number" value={bankRecForm.bankCharges} onChange={(e) => setBankRecForm({ ...bankRecForm, bankCharges: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Prepared By</Label><Input value={bankRecForm.preparedBy} onChange={(e) => setBankRecForm({ ...bankRecForm, preparedBy: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Reviewed By</Label><Input value={bankRecForm.reviewedBy} onChange={(e) => setBankRecForm({ ...bankRecForm, reviewedBy: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBankRecDialog(false)}>Cancel</Button><Button onClick={handleAddBankReconciliation}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pettyCashDialog} onOpenChange={setPettyCashDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Petty Cash Settlement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Period</Label><Input value={pettyCashForm.period} onChange={(e) => setPettyCashForm({ ...pettyCashForm, period: e.target.value })} placeholder="e.g. Week 1 May 2026" /></div>
            <div className="space-y-1.5"><Label>Cheque No.</Label><Input value={pettyCashForm.chequeNo} onChange={(e) => setPettyCashForm({ ...pettyCashForm, chequeNo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Beginning Balance</Label><Input type="number" value={pettyCashForm.beginningBalance} onChange={(e) => setPettyCashForm({ ...pettyCashForm, beginningBalance: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Prepared By</Label><Input value={pettyCashForm.preparedBy} onChange={(e) => setPettyCashForm({ ...pettyCashForm, preparedBy: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Checked By</Label><Input value={pettyCashForm.checkedBy} onChange={(e) => setPettyCashForm({ ...pettyCashForm, checkedBy: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Approved By</Label><Input value={pettyCashForm.approvedBy} onChange={(e) => setPettyCashForm({ ...pettyCashForm, approvedBy: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPettyCashDialog(false)}>Cancel</Button><Button onClick={handleAddPettyCash}>Save Settlement</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientFileModal
        open={fileModalOpen}
        onOpenChange={setFileModalOpen}
        proposal={fileModalProposal}
      />
    </div>
  );
}
