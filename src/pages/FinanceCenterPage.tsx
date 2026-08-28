import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ETHIOPIAN_BANKS, formatCurrency } from "@/lib/data";
import {
  analyticsDB,
  financeCenterDB,
  journalDB,
  hierarchyRequestsDB,
  peachtreeDB,
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
import {
  FinanceApprovalsInbox,
  SizingProposalItem,
  PerDiemRequestItem,
  FieldCashRequestItem,
  MissionBudgetItem,
  GeneralPaymentItem,
} from "@/components/finance/operations/FinanceApprovalsInbox";
import {
  AccountantAuditMonitor,
  BacklogItem,
} from "@/components/finance/compliance/AccountantAuditMonitor";
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
import { ShieldCheck } from "lucide-react";

const FINANCE_SECTIONS = new Set([
  "dashboard",
  "invoices",
  "purchases",
  "debtors",
  "financials",
  "bank",
  "cashflow",
  "approvals",
  "sizing-proposals",
  "perdiem",
  "fieldcash",
  "mission-budgets",
  "monitor",
  "peachtree",
  "bank-reconciliation",
  "petty-cash",
  "building-rent",
  "loans",
  "budget",
  "payroll",
  "vat",
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

const DEFAULT_SIZING_PROPOSALS: SizingProposalItem[] = [
  {
    id: "SZ-2026-001",
    customerName: "Gondar Commercial Farm & Irrigation",
    customerPhone: "+251 911 234 567",
    location: "Gondar, Amhara",
    head: 85,
    flowRate: 45,
    recommendedPump: "DIFFUL 4DSC9-85-110-1500 Solar Submersible",
    recommendedPanels: "6x 450W Mono PERC Panels (2.7 kWp Array)",
    estimatedTotal: 185000,
    date: "2026-08-25",
    status: "pending",
    engineerName: "Eng. Tolessa D.",
  },
  {
    id: "SZ-2026-002",
    customerName: "Hawassa Agro Industry Cooperative",
    customerPhone: "+251 912 345 678",
    location: "Hawassa, Sidama",
    head: 40,
    flowRate: 20,
    recommendedPump: "REDBUD 3DSS2.8-40-48-550 DC Solar Pump",
    recommendedPanels: "3x 400W Mono Panels (1.2 kWp Array)",
    estimatedTotal: 92000,
    date: "2026-08-26",
    status: "approved",
    engineerName: "Eng. Bekele T.",
  },
  {
    id: "SZ-2026-003",
    customerName: "Oromia Water Works Development",
    customerPhone: "+251 913 456 789",
    location: "Bishoftu, Oromia",
    head: 120,
    flowRate: 80,
    recommendedPump: "DIFFUL High-Head AC/DC 3-Phase Solar Inverter Station",
    recommendedPanels: "16x 550W Bifacial Tier-1 Panels (8.8 kWp Array)",
    estimatedTotal: 460000,
    date: "2026-08-27",
    status: "paid",
    engineerName: "Eng. Haile G.",
  },
];

const DEFAULT_PER_DIEM_REQUESTS: PerDiemRequestItem[] = [
  {
    id: "PD-2026-101",
    workerName: "Abebe Kebede",
    workerRole: "Lead Field Technician",
    missionTitle: "Gondar Irrigation Sizing & Pump Commissioning",
    destination: "Gondar, Amhara",
    startDate: "2026-08-29",
    endDate: "2026-09-02",
    daysCount: 5,
    dailyRate: 1500,
    totalAmount: 7500,
    status: "pending",
    submittedAt: new Date().toISOString(),
  },
  {
    id: "PD-2026-102",
    workerName: "Tariku Mengistu",
    workerRole: "Solar Electrical Specialist",
    missionTitle: "Hawassa Site Electrical Assessment",
    destination: "Hawassa, Sidama",
    startDate: "2026-08-30",
    endDate: "2026-09-01",
    daysCount: 3,
    dailyRate: 1400,
    totalAmount: 4200,
    status: "pending",
    submittedAt: new Date().toISOString(),
  },
];

const DEFAULT_FIELD_CASH_REQUESTS: FieldCashRequestItem[] = [
  {
    id: "FC-2026-201",
    ttlName: "Ato Dawit Kassaye",
    siteLocation: "Bishoftu Deep Well Site #3",
    purpose: "Urgent mobile crane hire for 90m heavy pipe insertion and borehole safety hoist.",
    category: "Excavation/Crane",
    amount: 18500,
    urgency: "Critical",
    status: "pending",
    submittedAt: new Date().toISOString(),
  },
  {
    id: "FC-2026-202",
    ttlName: "Eng. Tolessa D.",
    siteLocation: "Jimma Coffee Scheme",
    purpose: "Local trenching labor & reinforced 2-inch galvanized pipe couplings.",
    category: "Local Labor",
    amount: 8000,
    urgency: "Urgent",
    status: "pending",
    submittedAt: new Date().toISOString(),
  },
];

const DEFAULT_MISSION_BUDGETS: MissionBudgetItem[] = [
  {
    id: "MB-2026-301",
    missionTitle: "Amhara Region Multi-Site Solar Pump Deployment",
    teamLead: "Eng. Bekele T.",
    targetRegion: "Gondar & Bahir Dar",
    startDate: "2026-09-05",
    endDate: "2026-09-15",
    estimatedCost: 65000,
    breakdown: {
      transport: 28000,
      materials: 17000,
      labor: 12000,
      contingency: 8000,
    },
    status: "pending",
    submittedAt: new Date().toISOString(),
  },
];

export default function FinanceCenterPage() {
  const { section } = useParams<{ section?: string }>();
  const activeSection = section && FINANCE_SECTIONS.has(section) ? section : "dashboard";
  const { hasAccess, currentUser } = useAuth();
  const canApprove = hasAccess(["admin", "manager", "finance"]);
  const canViewFullFinancials = hasAccess(["admin", "manager", "finance"]);
  const { sales, financePayments, setFinanceEntity, refreshStoreData } = useStore() as any;

  const [bankReconciliations, setBankReconciliations] = useState<BankReconciliationRecord[]>([]);
  const [buildingRents, setBuildingRents] = useState<BuildingRentRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [payrollWorkers, setPayrollWorkers] = useState<PayrollWorker[]>([]);
  const [vatRecords, setVATRecords] = useState<VATRecord[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [pettyCashRecords, setPettyCashRecords] = useState<PettyCashRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState<any>(null);
  const [selectedBankView, setSelectedBankView] = useState<string | null>(null);

  // Approvals State
  const [sizingProposals, setSizingProposals] = useState<SizingProposalItem[]>(DEFAULT_SIZING_PROPOSALS);
  const [perDiemRequests, setPerDiemRequests] = useState<PerDiemRequestItem[]>(DEFAULT_PER_DIEM_REQUESTS);
  const [fieldCashRequests, setFieldCashRequests] = useState<FieldCashRequestItem[]>(DEFAULT_FIELD_CASH_REQUESTS);
  const [missionBudgets, setMissionBudgets] = useState<MissionBudgetItem[]>(DEFAULT_MISSION_BUDGETS);
  const [generalPayments, setGeneralPayments] = useState<GeneralPaymentItem[]>([]);
  const [vaultInfo, setVaultInfo] = useState<any | null>(null);

  const selectedEntity = "MM";
  const selectedEntityName = "Meseret Mare Solar";

  const loadFinanceCenterData = async () => {
    try {
      const [
        bankReconciliationsData,
        buildingRentsData,
        budgetsData,
        payrollWorkersData,
        vatRecordsData,
        loansData,
        cashFlowData,
        bankAccountsData,
        pettyCashRecordsData,
        journalEntriesData,
        analyticsData,
        vaultRes,
      ] = await Promise.allSettled([
        financeCenterDB.getAll("bank-reconciliations"),
        financeCenterDB.getAll("building-rents"),
        financeCenterDB.getAll("budgets"),
        financeCenterDB.getAll("payroll-workers"),
        financeCenterDB.getAll("vat-records"),
        financeCenterDB.getAll("loans"),
        financeCenterDB.getAll("cash-flow"),
        financeCenterDB.getAll("bank-accounts"),
        financeCenterDB.getAll("petty-cash-records"),
        journalDB.getAll(),
        analyticsDB.dashboard(selectedEntity),
        peachtreeDB.getVault(),
      ]);

      if (bankReconciliationsData.status === "fulfilled" && Array.isArray(bankReconciliationsData.value)) {
        setBankReconciliations(bankReconciliationsData.value);
      }
      if (buildingRentsData.status === "fulfilled" && Array.isArray(buildingRentsData.value)) {
        setBuildingRents(buildingRentsData.value);
      }
      if (budgetsData.status === "fulfilled" && Array.isArray(budgetsData.value)) {
        setBudgets(budgetsData.value);
      }
      if (payrollWorkersData.status === "fulfilled" && Array.isArray(payrollWorkersData.value)) {
        setPayrollWorkers(payrollWorkersData.value);
      }
      if (vatRecordsData.status === "fulfilled" && Array.isArray(vatRecordsData.value)) {
        setVATRecords(vatRecordsData.value);
      }
      if (loansData.status === "fulfilled" && Array.isArray(loansData.value)) {
        setLoans(loansData.value);
      }
      if (cashFlowData.status === "fulfilled" && Array.isArray(cashFlowData.value)) {
        setCashFlow(
          cashFlowData.value.map(normalizeCashFlowEntry).filter((entry): entry is CashFlowEntry => Boolean(entry))
        );
      }
      if (bankAccountsData.status === "fulfilled" && Array.isArray(bankAccountsData.value)) {
        setBankAccounts(bankAccountsData.value);
      }
      if (pettyCashRecordsData.status === "fulfilled" && Array.isArray(pettyCashRecordsData.value)) {
        setPettyCashRecords(pettyCashRecordsData.value);
      }
      if (journalEntriesData.status === "fulfilled" && Array.isArray(journalEntriesData.value)) {
        setJournalEntries(
          journalEntriesData.value.map(normalizeAccountingJournalEntry).filter(Boolean) as JournalEntry[]
        );
      }
      if (analyticsData.status === "fulfilled") {
        setDashboardAnalytics(analyticsData.value);
      }
      if (vaultRes.status === "fulfilled" && vaultRes.value?.vaultInfo) {
        setVaultInfo(vaultRes.value.vaultInfo);
      }
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
      const monthDay = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
      const monthKey = d.toISOString().slice(0, 7);
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

  // Backlog Items for Accountant Monitoring
  const backlogItems: BacklogItem[] = useMemo(() => {
    const items: BacklogItem[] = [];

    sizingProposals
      .filter((p) => p.status === "paid")
      .forEach((p) => {
        items.push({
          id: p.id,
          source: "Pump Sizing Proposal",
          refNumber: p.id,
          date: p.date,
          entityName: p.customerName,
          amount: p.estimatedTotal,
          status: "pending_peachtree_entry",
        });
      });

    perDiemRequests
      .filter((pd) => pd.status === "approved")
      .forEach((pd) => {
        items.push({
          id: pd.id,
          source: "Per Diem Payment",
          refNumber: pd.id,
          date: pd.startDate,
          entityName: pd.workerName,
          amount: pd.totalAmount,
          status: "pending_peachtree_entry",
        });
      });

    fieldCashRequests
      .filter((fc) => fc.status === "approved")
      .forEach((fc) => {
        items.push({
          id: fc.id,
          source: "TTL Cash Release",
          refNumber: fc.id,
          date: new Date(fc.submittedAt).toISOString().slice(0, 10),
          entityName: `${fc.ttlName} (${fc.siteLocation})`,
          amount: fc.amount,
          status: "pending_peachtree_entry",
        });
      });

    return items;
  }, [sizingProposals, perDiemRequests, fieldCashRequests]);

  // Approval Handlers
  const handleApproveSizing = (id: string) => {
    setSizingProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" as const } : p))
    );
    toast.success("Pump Sizing proposal approved and ready for customer quote.");
  };

  const handleMarkSizingPaid = (id: string) => {
    setSizingProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "paid" as const } : p))
    );
    toast.success("Proposal marked as Paid. Queued for Peachtree invoice booking!");
  };

  const handleRejectSizing = (id: string, reason?: string) => {
    setSizingProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" as const } : p))
    );
  };

  const handleApprovePerDiem = (id: string) => {
    setPerDiemRequests((prev) =>
      prev.map((pd) => (pd.id === id ? { ...pd, status: "approved" as const } : pd))
    );
    toast.success("Per Diem request approved for disbursement.");
  };

  const handleRejectPerDiem = (id: string, reason?: string) => {
    setPerDiemRequests((prev) =>
      prev.map((pd) => (pd.id === id ? { ...pd, status: "rejected" as const } : pd))
    );
  };

  const handleApproveFieldCash = (id: string) => {
    setFieldCashRequests((prev) =>
      prev.map((fc) => (fc.id === id ? { ...fc, status: "approved" as const } : fc))
    );
    toast.success("TTL Field Cash request approved.");
  };

  const handleRejectFieldCash = (id: string, reason?: string) => {
    setFieldCashRequests((prev) =>
      prev.map((fc) => (fc.id === id ? { ...fc, status: "rejected" as const } : fc))
    );
  };

  const handleApproveMissionBudget = (id: string) => {
    setMissionBudgets((prev) =>
      prev.map((mb) => (mb.id === id ? { ...mb, status: "approved" as const } : mb))
    );
    toast.success("Fieldwork mission budget authorized.");
  };

  const handleRejectMissionBudget = (id: string, reason?: string) => {
    setMissionBudgets((prev) =>
      prev.map((mb) => (mb.id === id ? { ...mb, status: "rejected" as const } : mb))
    );
  };

  const pendingApprovalsCount =
    sizingProposals.filter((p) => p.status === "pending").length +
    perDiemRequests.filter((pd) => pd.status === "pending").length +
    fieldCashRequests.filter((fc) => fc.status === "pending").length +
    missionBudgets.filter((mb) => mb.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Workspace Header Nav Bar */}
      <FinanceWorkspaceNav
        activeSection={activeSection}
        selectedEntity={selectedEntity}
        selectedEntityName={selectedEntityName}
        onEntityChange={(ent) => setFinanceEntity(ent)}
        pendingApprovalsCount={pendingApprovalsCount}
        syncAgentStatus="online"
      />

      {/* 1. EXECUTIVE OVERVIEW */}
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
          pendingInvCount={0}
          pendingSizingCount={sizingProposals.filter((p) => p.status === "pending").length}
          dashboardAnalytics={dashboardAnalytics}
          cashflowChartData={cashflowChartData}
          dualSourceRevenueData={dualSourceRevenueData}
          bankDistributionData={bankDistributionData}
        />
      )}

      {/* 2. APPROVALS INBOX & COMMERCIAL STREAMS */}
      {(activeSection === "approvals" ||
        activeSection === "sizing-proposals" ||
        activeSection === "perdiem" ||
        activeSection === "fieldcash" ||
        activeSection === "mission-budgets") && (
        <FinanceApprovalsInbox
          sizingProposals={sizingProposals}
          perDiemRequests={perDiemRequests}
          fieldCashRequests={fieldCashRequests}
          missionBudgets={missionBudgets}
          generalPayments={generalPayments}
          canApprove={canApprove}
          onApproveSizing={handleApproveSizing}
          onMarkSizingPaid={handleMarkSizingPaid}
          onRejectSizing={handleRejectSizing}
          onApprovePerDiem={handleApprovePerDiem}
          onRejectPerDiem={handleRejectPerDiem}
          onApproveFieldCash={handleApproveFieldCash}
          onRejectFieldCash={handleRejectFieldCash}
          onApproveMissionBudget={handleApproveMissionBudget}
          onRejectMissionBudget={handleRejectMissionBudget}
        />
      )}

      {/* 3. PEACHTREE COMPLETE FINANCIAL DATASETS */}
      {activeSection === "invoices" && <PeachtreePage initialTab="invoices" />}
      {activeSection === "purchases" && <PeachtreePage initialTab="vendors" />}
      {activeSection === "debtors" && <PeachtreePage initialTab="customers" />}
      {activeSection === "peachtree" && <PeachtreePage initialTab="vault" />}

      {/* 4. ACCOUNTANT ACTIVITY AUDIT MONITOR */}
      {activeSection === "monitor" && (
        <AccountantAuditMonitor
          syncAgentStatus="online"
          lastSyncTime={new Date().toISOString()}
          dailyVelocity={{
            invoicesCount: 18,
            billsCount: 4,
            paymentsCount: 12,
            journalsCount: 6,
          }}
          backlogItems={backlogItems}
          vaultInfo={vaultInfo}
          onRefreshSync={loadFinanceCenterData}
        />
      )}

      {/* 5. FINANCIAL STATEMENTS */}
      {activeSection === "financials" && (
        canViewFullFinancials ? (
          <FinancialStatementsModule journalEntries={journalEntries} />
        ) : (
          <div className="py-16 text-center space-y-3 max-w-md mx-auto">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl w-fit mx-auto">
              <ShieldCheck className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="font-bold text-base text-foreground">Financial Statements Restricted</h3>
            <p className="text-xs text-muted-foreground">
              Balance sheet, Income Statements (P&L), and Chart of Accounts are strictly restricted to General Manager and Finance Admin roles.
            </p>
          </div>
        )
      )}

      {/* 6. BANKING & CASH ACCOUNTS */}
      {activeSection === "bank" && (
        <BankAccountsModule
          updatedBankAccounts={updatedBankAccounts}
          financePayments={financePayments}
          selectedBankView={selectedBankView}
          setSelectedBankView={setSelectedBankView}
          onAddBankAccount={async (form) => {
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
            }
          }}
        />
      )}

      {/* 7. CASH FLOW LEDGER */}
      {activeSection === "cashflow" && (
        <CashFlowModule
          allCashFlow={allCashFlow}
          cfIncome={cfIncome}
          cfExpense={cfExpense}
          canApprove={canApprove}
          onAddEntry={async (form) => {
            const record: CashFlowEntry = {
              id: crypto.randomUUID(),
              type: form.type,
              category: form.category,
              amount: toMoneyNumber(form.amount),
              description: form.description,
              date: new Date().toISOString().slice(0, 10),
              status: canApprove ? "approved" : "pending",
            };
            if (await financeCenterDB.save("cash-flow", record)) {
              setCashFlow((prev) => [record, ...prev]);
              toast.success("Cash flow entry added");
            }
          }}
          onApproveEntry={async (id) => {
            const entry = cashFlow.find((c) => c.id === id);
            if (!entry) return;
            const updated: CashFlowEntry = { ...entry, status: "approved" };
            if (await financeCenterDB.save("cash-flow", updated)) {
              setCashFlow((prev) => prev.map((c) => (c.id === id ? updated : c)));
              toast.success("Cash flow entry approved!");
            }
          }}
        />
      )}

      {/* 8. BANK RECONCILIATION */}
      {activeSection === "bank-reconciliation" && (
        <BankReconciliationModule
          bankReconciliations={bankReconciliations}
          selectedEntity={selectedEntity}
          onAddReconciliation={async (form) => {
            const record: BankReconciliationRecord = {
              id: crypto.randomUUID(),
              entity: selectedEntity,
              ...form,
              date: new Date().toISOString().slice(0, 10),
            };
            if (await financeCenterDB.add("bank-reconciliations", record)) {
              setBankReconciliations((prev) => [...prev, record]);
              toast.success("Bank reconciliation saved");
            }
          }}
        />
      )}

      {/* 9. PETTY CASH */}
      {activeSection === "petty-cash" && (
        <PettyCashModule
          pettyCashRecords={pettyCashRecords}
          selectedEntity={selectedEntity}
          onAddPettyCash={async (form) => {
            const record: PettyCashRecord = {
              id: crypto.randomUUID(),
              entity: selectedEntity,
              ...form,
              date: new Date().toISOString().slice(0, 10),
            };
            if (await financeCenterDB.add("petty-cash-records", record)) {
              setPettyCashRecords((prev) => [...prev, record]);
              toast.success("Petty cash settlement saved");
            }
          }}
        />
      )}

      {/* 10. BUILDING RENT */}
      {activeSection === "building-rent" && (
        <BuildingRentModule
          buildingRents={buildingRents}
          selectedEntity={selectedEntity}
          totalRentCollected={totalRentCollected}
          onAddRent={async (newRent) => {
            const record: BuildingRentRecord = {
              ...newRent,
              id: Date.now().toString(),
              entity: selectedEntity,
            };
            await financeCenterDB.add("building-rents", record);
            setBuildingRents((prev) => [...prev, record]);
            toast.success("Rent record saved");
          }}
        />
      )}

      {/* 11. LOANS & CREDIT */}
      {activeSection === "loans" && (
        <LoansModule
          loans={loans}
          selectedEntity={selectedEntity}
          canApprove={canApprove}
          onAddLoan={async (form) => {
            const record: LoanRecord = {
              id: crypto.randomUUID(),
              entity: selectedEntity,
              ...form,
              remainingBalance: Number(form.loanAmount) || 0,
              status: "active",
              payments: [],
            };
            if (await financeCenterDB.add("loans", record)) {
              setLoans((prev) => [...prev, record]);
              toast.success("Loan added");
            }
          }}
          onRecordPayment={async (form) => {
            const updatedLoan = loans.find((l) => l.id === form.loanId);
            if (!updatedLoan) return;
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
              toast.success("Loan payment recorded");
            }
          }}
        />
      )}

      {/* 12. BUDGET */}
      {activeSection === "budget" && (
        <BudgetModule
          budgets={budgets}
          selectedEntity={selectedEntity}
          onAddBudget={async (record) => {
            const newRecord: BudgetRecord = {
              ...record,
              id: crypto.randomUUID(),
              entity: selectedEntity,
              date: new Date().toISOString().slice(0, 10),
            };
            if (await financeCenterDB.save("budgets", newRecord)) {
              setBudgets((prev) => [...prev, newRecord]);
              toast.success("Budget added");
            }
          }}
        />
      )}

      {/* 13. VAT & TAXES */}
      {activeSection === "vat" && (
        <VatComplianceModule
          vatRecords={vatRecords}
          totalVAT={totalVAT}
        />
      )}

      {/* 14. PAYROLL */}
      {activeSection === "payroll" && (
        <PayrollModule
          payrollWorkers={payrollWorkers}
          canApprove={canApprove}
          onMarkPaid={async (workerId, entryId) => {
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
            toast.success("Payroll marked as paid.");
          }}
        />
      )}

      {/* 15. EXECUTIVE ANALYTICS */}
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
        </div>
      )}
    </div>
  );
}
