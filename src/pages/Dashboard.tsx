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
        const [dashboardData, queueStatus, cashFlowData, loansData, rentsData] = await Promise.all([
          analyticsDB.dashboard(financeEntity),
          getOfflineQueueStatus(),
          financeCenterDB.getAll("cash-flow"),
          financeCenterDB.getAll("loans"),
          financeCenterDB.getAll("building-rents")
        ]);

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
        const [presenceData, reportsData, peachtreeData] = await Promise.all([
          userPresenceDB.getAll(),
          eodReportsDB.getAll(),
          peachtreeDB.getImports(financeEntity)
        ]);
        if (mounted) {
          setUsersPresence(Array.isArray(presenceData) ? presenceData : []);
          setEodReports(Array.isArray(reportsData) ? reportsData : []);
          setPeachtreeImports(Array.isArray(peachtreeData) ? peachtreeData : []);
        }
      } catch (e) {
        console.error("Failed to load presence or EOD reports:", e);
      }
    }

    loadDashboardAnalytics().catch(() => undefined);
    loadPresenceAndEod().catch(() => undefined);

    const intervalTimer = setInterval(() => {
      loadPresenceAndEod().catch(() => undefined);
    }, 15000);

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

  if (currentUser?.department === "TECHNICAL") {
    const pendingJobs = fieldWorks.filter(f => f.status === "pending").length;
    const activeJobs = fieldWorks.filter(f => f.status === "in-progress").length;
    const completedJobs = fieldWorks.filter(f => f.status === "completed").length;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading">Technical Department Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {currentUser.displayName}! Track installations and pump sizing.</p>
          </div>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p className="text-sm font-bold font-heading">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Pending Field Jobs</p>
                <p className="text-2xl font-bold font-heading">{pendingJobs}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Wrench className="h-8 w-8 text-blue-600 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Active Installations</p>
                <p className="text-2xl font-bold font-heading">{activeJobs}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="h-8 w-8 text-green-600 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Completed Jobs</p>
                <p className="text-2xl font-bold font-heading">{completedJobs}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/fieldwork")}>
            <CardContent className="p-4 flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <PlusCircle className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Pump Sizing Toolkit</p>
                  <p className="text-xs text-muted-foreground">Open sizing calculator</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {renderEodSubmissionCard()}
        <ApprovalsInbox />
      </div>
    );
  }

  if (currentUser?.department === "MARKETING") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading">Marketing & Grant Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {currentUser.displayName}! Monitor campaigns and grant pipelines.</p>
          </div>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p className="text-sm font-bold font-heading">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Grants Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span>Opportunities Identified</span>
                  <strong className="font-semibold text-foreground">4</strong>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Proposals Under Review</span>
                  <strong className="font-semibold text-foreground text-yellow-600">2</strong>
                </div>
                <div className="flex justify-between">
                  <span>Grants Won</span>
                  <strong className="font-semibold text-green-600">1 ($15,000)</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Social Media Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span>Active Social Promos</span>
                  <strong className="font-semibold text-foreground">3</strong>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Draft Posts Pending Approval</span>
                  <strong className="font-semibold text-yellow-600">1</strong>
                </div>
                <div className="flex justify-between">
                  <span>Ad Spend (M-T-D)</span>
                  <strong className="font-semibold">$450.00</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center items-center p-6 text-center border-dashed">
            <Send className="h-8 w-8 text-primary mb-2" />
            <p className="text-sm font-bold">Marketing Campaigns</p>
            <p className="text-xs text-muted-foreground mt-1">Submit ad/campaign budgets directly to GM</p>
          </Card>
        </div>

        {renderEodSubmissionCard()}
        <ApprovalsInbox />
      </div>
    );
  }

  if (currentUser?.department === "INVENTORY") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading">Inventory & Stock Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {currentUser.displayName}! Manage warehouse stock and reorders.</p>
          </div>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p className="text-sm font-bold font-heading">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-8 w-8 text-primary opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold font-heading">{stats.totalProducts}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-600 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold font-heading">{lowStock.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold font-heading">{outOfStock.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/inventory")}>
            <CardContent className="p-4 flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <PlusCircle className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Manage Inventory</p>
                  <p className="text-xs text-muted-foreground">Go to inventory page</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {renderEodSubmissionCard()}
        <ApprovalsInbox />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back! Here's your business overview.</p>
        </div>
        <Card className="border-0 bg-muted/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              <p className="text-sm font-bold font-heading">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alerts */}
      {overdueFieldWorks.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-destructive text-sm">Overdue Field Work</p>
              {overdueFieldWorks.map((fw) => (
                <p key={fw.id} className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">{fw.id}</span> — {fw.workers.map((w) => w.name).join(", ")} at {fw.location} ({differenceInDays(new Date(), parseISO(fw.endDate))} days overdue)
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.key} className="space-y-0">
            <Card
              className={`${card.gradient} border-0 text-primary-foreground cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${expandedCard === card.key ? "ring-2 ring-ring" : ""}`}
              onClick={() => toggleCard(card.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium opacity-80">{card.label}</p>
                    <p className="text-xl font-bold font-heading mt-1">{card.value}</p>
                    <p className="text-[10px] opacity-60 mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" /> {card.change}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <card.icon className="h-8 w-8 opacity-30" />
                    <ChevronRight className={`h-3 w-3 opacity-50 transition-transform ${expandedCard === card.key ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Finance Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {financeCards.map((fc) => (
          <Card key={fc.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/finance")}>
            <CardContent className="p-3 flex items-center gap-3">
              <fc.icon className={`h-5 w-5 ${fc.color} opacity-70`} />
              <div>
                <p className="text-[10px] text-muted-foreground">{fc.label}</p>
                <p className={`text-sm font-bold ${fc.color}`}>{fc.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* POS Payment Method Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {paymentCards.map((pc) => (
          <Card key={pc.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pos")}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${pc.color} bg-current/10`} style={{backgroundColor: "color-mix(in srgb, currentColor 15%, transparent)"}}>
                <pc.icon className={`h-4 w-4 ${pc.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">{pc.label}</p>
                <p className={`text-sm font-bold ${pc.color} truncate`}>{pc.value}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{pc.count} txns</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Non-Manager EOD submission card */}
      {!hasAccess(["manager"]) && renderEodSubmissionCard()}

      {/* General Manager Live presence & EOD Timeline Panels */}
      {hasAccess(["manager"]) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* EOD Reports Deck */}
          <Card className="lg:col-span-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50/5 dark:bg-indigo-950/5">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Departmental End of Day (EOD) Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
              {eodReports.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No EOD reports submitted yet today.
                </p>
              ) : (
                <div className="relative border-l border-indigo-200 dark:border-indigo-900 pl-4 ml-2 space-y-4">
                  {eodReports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handleOpenEodComments(r)}
                      className="relative space-y-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40 p-1.5 rounded transition-all"
                    >
                      <div className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-background" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-foreground">{r.submittedBy?.displayName || r.submittedById}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-semibold">
                          {r.department}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.date}</p>
                      <p className="text-xs bg-muted/40 p-2 rounded text-foreground italic mt-1 border-l-2 border-indigo-500">
                        {r.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Presence Tracker */}
          <Card className="border-emerald-100 dark:border-emerald-900 bg-emerald-50/5 dark:bg-emerald-950/5">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Live User Presence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
              {usersPresence.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Loading presence data...</p>
              ) : (
                usersPresence.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${u.isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
                      <div>
                        <p className="font-bold text-foreground">{u.displayName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{u.role} · {u.department || "No Department"}</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      {u.isOnline ? (
                        <span className="text-emerald-600 font-medium">Online</span>
                      ) : u.lastSeen ? (
                        <span>Seen {new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span>Offline</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* General Manager Peachtree Integration Feed */}
      {hasAccess(["manager"]) && (
        <Card className="border-cyan-100 dark:border-cyan-900 bg-cyan-50/5 dark:bg-cyan-950/5">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileUp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Recent Peachtree Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {peachtreeImports.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No Peachtree imports recorded today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Customers Sync</th>
                      <th className="pb-2 font-medium">Vendors Sync</th>
                      <th className="pb-2 font-medium">Products Sync</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peachtreeImports.slice(0, 5).map((imp) => (
                      <tr key={imp.id} className="border-b last:border-0">
                        <td className="py-2">{new Date(imp.createdAt || imp.date).toLocaleString()}</td>
                        <td className="py-2 font-medium text-foreground">{imp.customerCount || 0}</td>
                        <td className="py-2 font-medium text-foreground">{imp.vendorCount || 0}</td>
                        <td className="py-2 font-medium text-foreground">{imp.productCount || 0}</td>
                        <td className="py-2 text-emerald-600 font-medium">Active Synced</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expanded Detail Panel */}
      {expandedCard && (
        <Card className="animate-fade-in">
          <CardContent className="p-5">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedCard(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {renderExpandedContent(expandedCard)}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-heading">Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outOfStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm rounded-md bg-destructive/10 px-3 py-2">
                <span className="truncate font-medium text-xs">{p.name}</span>
                <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">Out</Badge>
              </div>
            ))}
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm rounded-md bg-warning/10 px-3 py-2">
                <span className="truncate font-medium text-xs">{p.name}</span>
                <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] shrink-0 ml-2">{p.quantity} left</Badge>
              </div>
            ))}
            {outOfStock.length === 0 && lowStock.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">All stock levels healthy ✓</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Field Work Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Active Field Work
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate("/fieldwork")}>
              <Eye className="h-3 w-3 mr-1" /> View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeFieldWorks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeFieldWorks.map((fw) => {
                const isOverdue = isAfter(new Date(), parseISO(fw.endDate));
                return (
                  <div key={fw.id} className={`rounded-lg border p-3 space-y-2 ${isOverdue ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-heading">{fw.id}</span>
                      {isOverdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {fw.location}
                    </div>
                    <p className="text-xs font-medium">{fw.workers.map((w) => w.name).join(", ")}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{fw.pumpModel}</span>
                      <span>{fw.startDate} → {fw.endDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No active field work</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Transactions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={txFilter} onValueChange={setTxFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="telebirr">Telebirr</SelectItem>
                  <SelectItem value="vat">With VAT</SelectItem>
                  <SelectItem value="no-vat">No VAT</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => navigate("/pos")}>
                <Eye className="h-3 w-3 mr-1" /> POS
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium text-center">Method</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">Profit</th>
                  <th className="pb-2 font-medium text-center">VAT</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">{sale.id}</td>
                    <td className="py-3 text-muted-foreground">{sale.date}</td>
                    <td className="py-3 font-medium">{sale.customer.name}</td>
                    <td className="py-3 text-muted-foreground">{sale.customer.location}</td>
                    <td className="py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] ${
                        sale.paymentMethod === "Cash" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" :
                        sale.paymentMethod === "Bank" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" :
                        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
                      }`}>
                        {sale.paymentMethod}{sale.bankName ? ` · ${sale.bankName}` : ""}
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-medium">{formatCurrency(sale.totalSell)}</td>
                    <td className="py-3 text-right text-success font-medium">{formatCurrency(sale.profit)}</td>
                    <td className="py-3 text-center">
                      {sale.vatIncluded ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{formatCurrency(sale.vatAmount)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTx.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions found</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <ApprovalsInbox />
      </div>

      {/* EOD Comments Modal */}
      <Dialog open={!!selectedEod} onOpenChange={() => setSelectedEod(null)}>
        <DialogContent className="max-w-md flex flex-col h-[70vh]">
          {selectedEod && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      EOD Report Comments
                    </DialogTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Submitted by {selectedEod.submittedBy?.displayName || selectedEod.submittedById} ({selectedEod.department})
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                    {selectedEod.date}
                  </span>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border text-xs leading-relaxed italic text-muted-foreground border-l-4 border-indigo-500">
                  "{selectedEod.content}"
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Feedback / Comments</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {commentsLoading ? (
                      <div className="text-center text-xs text-muted-foreground py-4">Loading comments...</div>
                    ) : eodComments.map((c) => (
                      <div key={c.id} className="bg-muted/40 p-2 rounded border text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-[10px]">
                          <span>{c.author?.displayName}</span>
                          <span className="font-normal text-muted-foreground">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-normal">{c.content}</p>
                      </div>
                    ))}
                    {eodComments.length === 0 && !commentsLoading && (
                      <div className="text-center text-xs text-muted-foreground py-4 italic">No comments yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 flex flex-col gap-2">
                <div className="flex gap-2 items-start">
                  <Textarea
                    value={newEodComment}
                    onChange={(e) => setNewEodComment(e.target.value)}
                    placeholder="Provide feedback on this EOD report..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                  <Button onClick={handlePostEodComment} size="sm" className="h-9 px-3">
                    Post
                  </Button>
                </div>
                <DialogFooter className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedEod(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
