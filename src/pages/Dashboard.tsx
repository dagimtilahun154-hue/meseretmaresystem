import { useMemo, useState, useEffect } from "react";
import { differenceInCalendarDays, differenceInDays, parseISO, isAfter } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/data";
import { analyticsDB, financeCenterDB, userPresenceDB, eodReportsDB, peachtreeDB } from "@/lib/db-service";
import { normalizePayment, toMoneyNumber } from "@/lib/finance-hub-store";
import { getOfflineQueueStatus } from "@/lib/offline-queue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DollarSign, Package, Users, TrendingUp, Receipt, AlertTriangle, Clock,
  Wrench, ChevronRight, Eye, X, ArrowUpRight, Activity, MapPin,
  Landmark, Building, Send, Banknote, Smartphone, PlusCircle, ClipboardList, FileUp, Check
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BEHAVIOR_LABELS } from "@/lib/fieldwork-data";
import ApprovalsInbox from "@/components/ApprovalsInbox";
import { toast } from "sonner";
import { getComments, addComment } from "@/lib/api/communication";

import { SalesHubDashboard } from "@/components/dashboards/SalesHubDashboard";
import { TechHubDashboard } from "@/components/dashboards/TechHubDashboard";
import { TTLHubDashboard } from "@/components/dashboards/TTLHubDashboard";
import { FinanceHubDashboard } from "@/components/dashboards/FinanceHubDashboard";
import { GMHubDashboard } from "@/components/dashboards/GMHubDashboard";
import { AdminHubDashboard } from "@/components/dashboards/AdminHubDashboard";

export default function Dashboard() {
  const { currentUser, hasAccess } = useAuth();
  const { products, sales, fieldWorks, financePayments, financeEntity } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState("all");
  const [analytics, setAnalytics] = useState<any>(null);
  const [offlineQueue, setOfflineQueue] = useState({ queued: 0, failed: 0 });
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [buildingRents, setBuildingRents] = useState<any[]>([]);
  const [usersPresence, setUsersPresence] = useState<any[]>([]);
  const [eodReports, setEodReports] = useState<any[]>([]);
  const [peachtreeImports, setPeachtreeImports] = useState<any[]>([]);
  const [peachtreeSyncedData, setPeachtreeSyncedData] = useState<any>(null);
  const [eodContent, setEodContent] = useState("");
  const [eodSubmitOpen, setEodSubmitOpen] = useState(false);

  // EOD Comments State
  const [selectedEod, setSelectedEod] = useState<any | null>(null);
  const [eodComments, setEodComments] = useState<any[]>([]);
  const [newEodComment, setNewEodComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;

    async function loadDashboardAnalytics() {
      try {
        const canViewFinance = hasAccess(["finance", "admin", "manager"]);
        const [dashboardData, queueStatus] = await Promise.all([
          analyticsDB.dashboard(financeEntity).catch(() => ({})),
          getOfflineQueueStatus().catch(() => ({ queued: 0, failed: 0 })),
        ]);

        let cashFlowData: any[] = [];
        let loansData: any[] = [];
        let rentsData: any[] = [];

        if (canViewFinance) {
          [cashFlowData, loansData, rentsData] = await Promise.all([
            financeCenterDB.getAll("cash-flow").catch(() => []),
            financeCenterDB.getAll("loans").catch(() => []),
            financeCenterDB.getAll("building-rents").catch(() => []),
          ]);
        }

        if (mounted) {
          setAnalytics(dashboardData);
          setOfflineQueue({ queued: queueStatus.queued, failed: queueStatus.failed });
          setCashFlow(Array.isArray(cashFlowData) ? cashFlowData : []);
          setLoans(Array.isArray(loansData) ? loansData : []);
          setBuildingRents(Array.isArray(rentsData) ? rentsData : []);
        }
      } catch (e) {
        console.error("Failed to load dashboard analytics:", e);
      }
    }

    async function loadPresenceAndEod() {
      try {
        const [presenceData, reportsData, peachtreeData, syncedPeachtreeData] = await Promise.all([
          userPresenceDB.getAll(),
          eodReportsDB.getAll(),
          peachtreeDB.getImports(financeEntity),
          peachtreeDB.getSyncedData()
        ]);
        if (mounted) {
          setUsersPresence(Array.isArray(presenceData) ? presenceData : []);
          setEodReports(Array.isArray(reportsData) ? reportsData : []);
          setPeachtreeImports(Array.isArray(peachtreeData) ? peachtreeData : []);
          setPeachtreeSyncedData(syncedPeachtreeData);
        }
      } catch (e) {
        console.error("Failed to load presence or EOD reports:", e);
      }
    }

    loadDashboardAnalytics().catch(() => undefined);
    loadPresenceAndEod().catch(() => undefined);

    const intervalTimer = setInterval(() => {
      loadPresenceAndEod().catch(() => undefined);
    }, 60000);

    const onQueueChange = () => getOfflineQueueStatus().then((status) => {
      if (mounted) setOfflineQueue({ queued: status.queued, failed: status.failed });
    });
    window.addEventListener("offline-queue-change", onQueueChange);

    return () => {
      mounted = false;
      clearInterval(intervalTimer);
      window.removeEventListener("offline-queue-change", onQueueChange);
    };
  }, [currentUser, financeEntity]);

  const handleEodSubmit = async () => {
    if (!eodContent.trim()) {
      toast.error("Please fill in your EOD report content");
      return;
    }
    try {
      await eodReportsDB.create({
        content: eodContent,
        date: new Date().toISOString().slice(0, 10)
      });
      toast.success("EOD report submitted successfully!");
      setEodContent("");
      setEodSubmitOpen(false);
      const reportsData = await eodReportsDB.getAll();
      setEodReports(reportsData);
    } catch (e) {
      toast.error("Failed to submit EOD report");
    }
  };

  const handleOpenEodComments = async (report: any) => {
    setSelectedEod(report);
    setCommentsLoading(true);
    try {
      const data = await getComments("EOD", report.id);
      setEodComments(data);
    } catch (e) {
      toast.error("Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostEodComment = async () => {
    if (!newEodComment.trim() || !selectedEod) return;
    try {
      const added = await addComment({
        entityType: "EOD",
        entityId: selectedEod.id,
        content: newEodComment,
      });
      setEodComments((prev) => [...prev, added]);
      setNewEodComment("");
      toast.success("Comment added to EOD report");
    } catch (e) {
      toast.error("Failed to add comment");
    }
  };

  const renderEodSubmissionCard = () => {
    return (
      <Card className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            End of Day (EOD) Daily Activity Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Please register your daily progress, accomplishments, field status, and any tasks done before signing off today.
          </p>
          <Textarea 
            placeholder="Today I worked on cash book matching, registered 2 new sales invoices, updated stock counts, and reconciled the Telebirr ledger..."
            value={eodContent}
            onChange={(e) => setEodContent(e.target.value)}
            className="text-xs focus-visible:ring-indigo-500"
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleEodSubmit} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">
              Submit EOD Log
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const stats = useMemo(() => {
    const normalizedFinancePayments = Array.isArray(financePayments) ? financePayments.map(normalizePayment) : [];
    const totalSales = sales.reduce((s, sale) => s + toMoneyNumber(sale.totalSell), 0);
    const totalProfit = sales.reduce((s, sale) => s + toMoneyNumber(sale.profit), 0);
    const totalVat = sales.reduce((s, sale) => s + toMoneyNumber(sale.vatAmount), 0);
    const uniqueCustomers = new Set(sales.map((s) => s.customer.id)).size;

    // Payment method breakdown from POS sales
    const cashSales = sales.filter(s => s.paymentMethod === "Cash").reduce((t, s) => t + toMoneyNumber(s.totalSell), 0);
    const bankSales = sales.filter(s => s.paymentMethod === "Bank").reduce((t, s) => t + toMoneyNumber(s.totalSell), 0);
    const telebirrSales = sales.filter(s => s.paymentMethod === "Telebirr").reduce((t, s) => t + toMoneyNumber(s.totalSell), 0);

    // Field Work total per-diem cost
    const fieldWorkExpense = fieldWorks.reduce((sum, fw) => {
      const days = Math.max(1, differenceInCalendarDays(
        new Date(fw.endDate), new Date(fw.startDate)
      ) + 1);
      return sum + fw.workers.reduce((ws, w) => ws + toMoneyNumber(w.perDiem) * days, 0);
    }, 0);
    
    // Add real POS payments to the bank and cash aggregates
    const posBankTotal = normalizedFinancePayments
      .filter(p => p.type === "received" && (p.method === "Bank Transfer" || p.method === "Mobile Money"))
      .reduce((s, p) => s + toMoneyNumber(p.amount), 0);
      
    const posCashTotal = normalizedFinancePayments
      .filter(p => p.type === "received" && p.method === "Cash")
      .reduce((s, p) => s + toMoneyNumber(p.amount), 0);

    const manualCashFlowIncome = cashFlow.filter(c => c.type === "income").reduce((s, c) => s + toMoneyNumber(c.amount), 0);
    const manualCashFlowExpense = cashFlow.filter(c => c.type === "expense").reduce((s, c) => s + toMoneyNumber(c.amount), 0);
    const rentIncome = buildingRents.filter(r => r.status === "paid" && r.entity === financeEntity).reduce((s, r) => s + toMoneyNumber(r.amount), 0);
    const totalLoans = loans.filter(l => l.entity === financeEntity).reduce((s, l) => s + toMoneyNumber(l.remainingBalance), 0);

    const bankBalance = toMoneyNumber(analytics?.stats?.bankBalance ?? posBankTotal) + rentIncome;
    const cfIncome = posBankTotal + posCashTotal + manualCashFlowIncome + rentIncome;
    const cfExpense = fieldWorkExpense + manualCashFlowExpense;

    const pendingRequests = analytics?.stats?.pendingRequests ?? 0;
    const loanOutstanding = totalLoans || (analytics?.stats?.loanOutstanding ?? 0);
    
    return { 
      totalSales, 
      totalProfit, 
      totalVat, 
      uniqueCustomers, 
      totalProducts: products.length, 
      bankBalance, 
      netCashFlow: cfIncome - cfExpense, 
      pendingRequests, 
      loanOutstanding,
      cashSales,
      bankSales,
      telebirrSales,
      fieldWorkExpense: analytics?.stats?.fieldWorkExpense ?? fieldWorkExpense,
    };
  }, [sales, products, financePayments, fieldWorks, analytics, cashFlow, buildingRents, loans, financeEntity]);

  const lowStock = useMemo(() => products.filter((p) => p.quantity <= 2 && p.quantity > 0), [products]);
  const outOfStock = useMemo(() => products.filter((p) => p.quantity === 0), [products]);

  const chartData = useMemo(() => {
    if (analytics?.charts?.salesTrend?.length) return analytics.charts.salesTrend;
    const byDate: Record<string, number> = {};
    sales.forEach((s) => { byDate[s.date] = (byDate[s.date] || 0) + toMoneyNumber(s.totalSell); });
    return Object.entries(byDate).map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [sales, analytics]);

  const filteredTx = useMemo(() => {
    if (txFilter === "all") return sales;
    if (txFilter === "vat") return sales.filter((s) => s.vatIncluded);
    if (txFilter === "no-vat") return sales.filter((s) => !s.vatIncluded);
    if (txFilter === "cash") return sales.filter((s) => s.paymentMethod === "Cash");
    if (txFilter === "bank") return sales.filter((s) => s.paymentMethod === "Bank");
    if (txFilter === "telebirr") return sales.filter((s) => s.paymentMethod === "Telebirr");
    return sales;
  }, [sales, txFilter]);

  const activeFieldWorks = fieldWorks.filter((fw) => fw.status === "in-progress");
  const overdueFieldWorks = fieldWorks.filter(
    (fw) => fw.status === "in-progress" && isAfter(new Date(), parseISO(fw.endDate))
  );

  const toggleCard = (key: string) => {
    setExpandedCard(expandedCard === key ? null : key);
  };

  const statCards = [
    { key: "sales", label: "Total Sales", value: formatCurrency(stats.totalSales), icon: DollarSign, gradient: "stat-gradient-sales", change: `${sales.length} transactions` },
    { key: "products", label: "Total Products", value: stats.totalProducts, icon: Package, gradient: "stat-gradient-products", change: `${outOfStock.length} out of stock` },
    { key: "customers", label: "Total Customers", value: stats.uniqueCustomers, icon: Users, gradient: "stat-gradient-customers", change: "Unique buyers" },
    { key: "profit", label: "Total Profit", value: formatCurrency(stats.totalProfit), icon: TrendingUp, gradient: "stat-gradient-profit", change: `${stats.totalSales > 0 ? ((stats.totalProfit / stats.totalSales) * 100).toFixed(1) : 0}% margin` },
    { key: "vat", label: "VAT Payable", value: formatCurrency(stats.totalVat), icon: Receipt, gradient: "stat-gradient-vat", change: `${sales.filter((s) => s.vatIncluded).length} VAT sales` },
  ];

  const financeCards = [
    { label: "Bank Balance", value: formatCurrency(stats.bankBalance), icon: Building, color: "text-primary" },
    { label: "Cash Flow (Net)", value: formatCurrency(stats.netCashFlow), icon: TrendingUp, color: stats.netCashFlow >= 0 ? "text-green-600" : "text-destructive" },
    { label: "Field Work Cost", value: formatCurrency(stats.fieldWorkExpense), icon: Wrench, color: "text-orange-500" },
    { label: "Loan Outstanding", value: formatCurrency(stats.loanOutstanding), icon: Landmark, color: "text-warning" },
    { label: "Offline Queue", value: offlineQueue.queued, icon: Activity, color: offlineQueue.failed > 0 ? "text-destructive" : "text-primary" },
  ];

  const paymentCards = [
    { label: "Cash Sales", value: formatCurrency(stats.cashSales), icon: Banknote, color: "text-green-600", count: sales.filter(s => s.paymentMethod === "Cash").length },
    { label: "Bank Transfer", value: formatCurrency(stats.bankSales), icon: Building, color: "text-primary", count: sales.filter(s => s.paymentMethod === "Bank").length },
    { label: "Telebirr", value: formatCurrency(stats.telebirrSales), icon: Smartphone, color: "text-purple-500", count: sales.filter(s => s.paymentMethod === "Telebirr").length },
  ];

  const renderExpandedContent = (key: string) => {
    switch (key) {
      case "sales":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm">All Sales Records</h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/reports")}>
                <Eye className="h-3 w-3 mr-1" /> Full Report
              </Button>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">ID</th>
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Customer</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 15).map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-1.5 font-medium">{s.id}</td>
                      <td className="py-1.5 text-muted-foreground">{s.date}</td>
                      <td className="py-1.5">{s.customer.name}</td>
                      <td className="py-1.5 text-right font-medium">{formatCurrency(s.totalSell)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "products":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm">Product List</h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/inventory")}>
                <Eye className="h-3 w-3 mr-1" /> Inventory
              </Button>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Name</th>
                    <th className="pb-2 text-left font-medium">Category</th>
                    <th className="pb-2 text-center font-medium">Stock</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-1.5 font-medium">{p.name}</td>
                      <td className="py-1.5 text-muted-foreground">{p.category}</td>
                      <td className={`py-1.5 text-center font-medium ${p.quantity === 0 ? "text-destructive" : p.quantity <= 2 ? "text-warning" : ""}`}>{p.quantity}</td>
                      <td className="py-1.5 text-right">{formatCurrency(p.sellPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "customers":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm">Customer List</h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/reports")}>
                <Eye className="h-3 w-3 mr-1" /> Reports
              </Button>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Name</th>
                    <th className="pb-2 text-left font-medium">Phone</th>
                    <th className="pb-2 text-left font-medium">Location</th>
                    <th className="pb-2 text-right font-medium">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Map(sales.map((s) => [s.customer.id, s.customer])).values()).map((c) => {
                    const totalSpent = sales.filter((s) => s.customer.id === c.id).reduce((sum, s) => sum + s.totalSell, 0);
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-1.5 font-medium">{c.name}</td>
                        <td className="py-1.5 text-muted-foreground">{c.phone}</td>
                        <td className="py-1.5">{c.location}</td>
                        <td className="py-1.5 text-right font-medium">{formatCurrency(totalSpent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "profit":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm">Profit Details</h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/reports")}>
                <Eye className="h-3 w-3 mr-1" /> Full Report
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-sm font-bold font-heading mt-1">{formatCurrency(stats.totalSales)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-sm font-bold font-heading mt-1">{formatCurrency(sales.reduce((s, sale) => s + sale.totalCost, 0))}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className="text-sm font-bold font-heading mt-1 text-success">{formatCurrency(stats.totalProfit)}</p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Sale</th>
                    <th className="pb-2 text-right font-medium">Revenue</th>
                    <th className="pb-2 text-right font-medium">Cost</th>
                    <th className="pb-2 text-right font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-1.5 font-medium">{s.id} — {s.customer.name}</td>
                      <td className="py-1.5 text-right">{formatCurrency(s.totalSell)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{formatCurrency(s.totalCost)}</td>
                      <td className="py-1.5 text-right font-medium text-success">{formatCurrency(s.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "vat":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm">VAT Details</h3>
              <Button size="sm" variant="outline" onClick={() => navigate("/vat")}>
                <Eye className="h-3 w-3 mr-1" /> VAT History
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">VAT Collected</p>
                <p className="text-sm font-bold font-heading mt-1">{formatCurrency(stats.totalVat)}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Payable to Gov</p>
                <p className="text-sm font-bold font-heading mt-1 text-destructive">{formatCurrency(stats.totalVat)}</p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Sale</th>
                    <th className="pb-2 text-left font-medium">Customer</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 text-right font-medium">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.filter((s) => s.vatIncluded).map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-1.5 font-medium">{s.id}</td>
                      <td className="py-1.5">{s.customer.name}</td>
                      <td className="py-1.5 text-right">{formatCurrency(s.totalSell)}</td>
                      <td className="py-1.5 text-right text-destructive font-medium">{formatCurrency(s.vatAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Role-Based Tailored Workspace Rendering
  const userRole = (currentUser?.role || (currentUser?.roles && currentUser?.roles[0]) || "").toLowerCase();
  const userDept = (currentUser?.department || "").toLowerCase();
  const username = (currentUser?.username || "").toLowerCase();

  if (userRole === "sales" || userRole === "storekeeper" || userRole === "store" || userDept === "sales" || username === "store") {
    return <SalesHubDashboard />;
  }
  if (userRole === "ttl" || username === "ttl" || username === "tech_leader") {
    return <TTLHubDashboard />;
  }
  if (userRole === "finance" || userDept === "finance" || username === "finance") {
    return <FinanceHubDashboard />;
  }
  if (userRole === "admin" || userRole === "administrator" || username === "admin") {
    return <AdminHubDashboard />;
  }
  if (userRole === "fieldwork" || userRole === "field" || userRole === "tech" || userDept === "technical" || username === "field") {
    return <TechHubDashboard />;
  }


  
  return (
    <GMHubDashboard
      stats={stats}
      statCards={statCards}
      financeCards={financeCards}
      paymentCards={paymentCards}
      chartData={chartData}
      filteredTx={filteredTx}
      txFilter={txFilter}
      setTxFilter={setTxFilter}
      expandedCard={expandedCard}
      toggleCard={toggleCard}
      renderExpandedContent={renderExpandedContent}
      lowStock={lowStock}
      outOfStock={outOfStock}
      activeFieldWorks={activeFieldWorks}
      overdueFieldWorks={overdueFieldWorks}
      renderEodSubmissionCard={renderEodSubmissionCard}
      eodReports={eodReports}
      usersPresence={usersPresence}
      peachtreeImports={peachtreeImports}
      peachtreeSyncedData={peachtreeSyncedData}
      handleOpenEodComments={handleOpenEodComments}
    />
  );
}

