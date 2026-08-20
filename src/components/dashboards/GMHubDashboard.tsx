import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown, TrendingUp, Inbox, Users, ArrowRight, DollarSign, Package, Receipt,
  AlertTriangle, Wrench, Eye, X, Landmark, Building, Banknote, Smartphone,
  MapPin, Check, ShoppingCart, Wallet, Droplets, BarChart3, RefreshCcw, FileText, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { formatCurrency } from "@/lib/data";
import ApprovalsInbox from "@/components/ApprovalsInbox";

import { DashboardHeaderBanner } from "./widgets/DashboardHeaderBanner";
import { StatCardGrid } from "./widgets/StatCardGrid";
import { SalesTrendChartWidget } from "./widgets/SalesTrendChartWidget";
import { RecentTransactionsWidget } from "./widgets/RecentTransactionsWidget";
import { EodActivityWidget } from "./widgets/EodActivityWidget";
import { QuickAlertsTasksWidget } from "./widgets/QuickAlertsTasksWidget";

export interface GMHubDashboardProps {
  stats?: any;
  statCards?: any[];
  financeCards?: any[];
  paymentCards?: any[];
  chartData?: any[];
  filteredTx?: any[];
  txFilter?: string;
  setTxFilter?: (filter: string) => void;
  expandedCard?: string | null;
  toggleCard?: (key: string) => void;
  renderExpandedContent?: (key: string) => React.ReactNode;
  lowStock?: any[];
  outOfStock?: any[];
  activeFieldWorks?: any[];
  overdueFieldWorks?: any[];
  renderEodSubmissionCard?: () => React.ReactNode;
  eodReports?: any[];
  usersPresence?: any[];
  peachtreeImports?: any[];
  peachtreeSyncedData?: any;
  handleOpenEodComments?: (report: any) => void;
}

export function GMHubDashboard(props: GMHubDashboardProps) {
  const navigate = useNavigate();
  const { sales = [], fieldWorks = [], hierarchyRequests = [], products = [] } = useStore() as any;

  // Local state fallbacks
  const [localTxFilter, setLocalTxFilter] = useState("all");
  const [localExpandedCard, setLocalExpandedCard] = useState<string | null>(null);

  const pendingApprovals = hierarchyRequests.filter(
    (r: any) => r.status === "PENDING" || r.status === "FORWARDED_TO_GM"
  );
  const totalPosRevenue = sales.reduce(
    (sum: number, s: any) => sum + Number(s.totalAmount || s.totalSell || s.total || 0),
    0
  );
  const totalProfit = sales.reduce((s: number, sale: any) => s + Number(sale.profit || 0), 0);
  const totalVat = sales.reduce((s: number, sale: any) => s + Number(sale.vatAmount || 0), 0);

  const txFilter = props.txFilter ?? localTxFilter;
  const setTxFilter = props.setTxFilter ?? setLocalTxFilter;
  const expandedCard = props.expandedCard !== undefined ? props.expandedCard : localExpandedCard;
  const toggleCard = props.toggleCard ?? ((key: string) => setLocalExpandedCard(localExpandedCard === key ? null : key));

  const lowStock = props.lowStock ?? products.filter((p: any) => p.quantity <= 2 && p.quantity > 0);
  const outOfStock = props.outOfStock ?? products.filter((p: any) => p.quantity === 0);
  const activeFieldWorks = props.activeFieldWorks ?? fieldWorks.filter((fw: any) => fw.status === "in-progress" || fw.status === "pending");
  const filteredTx = props.filteredTx ?? sales;

  // Unified Peachtree Financial Sync Summary calculation
  const peachtreeSummary = useMemo(() => {
    const data = props.peachtreeSyncedData;
    if (!data) return null;

    const invoices = data.invoices || [];
    const localSales = sales || [];

    let balanced = 0;
    let discrepancy = 0;
    let missingInPeachtree = 0;

    localSales.forEach((s: any) => {
      const match = invoices.find(
        (inv: any) =>
          String(inv.id).toLowerCase() === String(s.id).toLowerCase() ||
          (inv.customerName?.toLowerCase().includes(s.customer?.name?.toLowerCase()) &&
            Math.abs(Number(inv.total) - Number(s.totalSell || s.totalAmount || 0)) < 1.0)
      );

      if (match) {
        if (Math.abs(Number(match.total) - Number(s.totalSell || s.totalAmount || 0)) < 0.01) {
          balanced++;
        } else {
          discrepancy++;
        }
      } else {
        missingInPeachtree++;
      }
    });

    const peachtreeTotal = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);

    return {
      balanced,
      discrepancy,
      missingInPeachtree,
      peachtreeTotal,
      invoiceCount: invoices.length,
      customerCount: data.customers?.length || 0,
      vendorCount: data.vendors?.length || 0,
      recentInvoices: invoices.slice(0, 5),
    };
  }, [props.peachtreeSyncedData, sales]);

  // Unified Top KPI Cards with signature stat-gradient colors
  // Unified Top KPI Cards with signature stat-gradient colors
  const topKpiCards = [
    {
      key: "sales",
      label: "360° Total Sales",
      value: formatCurrency(totalPosRevenue),
      subtext: `${sales.length} POS transactions`,
      icon: DollarSign,
      gradientClass: "stat-gradient-sales",
      badge: "Revenue",
    },
    {
      key: "products",
      label: "Inventory Status",
      value: `${products.length} Products`,
      subtext: outOfStock.length > 0 ? `${outOfStock.length} out of stock!` : `${lowStock.length} low stock`,
      icon: Package,
      gradientClass: "stat-gradient-products",
      badge: outOfStock.length > 0 ? "Alert" : "Stock",
    },
    {
      key: "customers",
      label: "Total Customers",
      value: `${new Set(sales.map((s: any) => s.customer?.id)).size} Buyers`,
      subtext: "Active buyer accounts",
      icon: Users,
      gradientClass: "stat-gradient-customers",
      badge: "Clients",
    },
    {
      key: "profit",
      label: "Net Profit",
      value: formatCurrency(totalProfit),
      subtext: `${totalPosRevenue > 0 ? ((totalProfit / totalPosRevenue) * 100).toFixed(1) : 0}% profit margin`,
      icon: TrendingUp,
      gradientClass: "stat-gradient-profit",
      badge: "Margin",
    },
    {
      key: "vat",
      label: "VAT Payable",
      value: formatCurrency(totalVat),
      subtext: `${sales.filter((s: any) => s.vatIncluded).length} VAT invoices`,
      icon: Receipt,
      gradientClass: "stat-gradient-vat",
      badge: "Tax",
    },
  ];

  // Payment Channels Breakdown
  const paymentBreakdown = [
    { label: "Cash Sales", value: formatCurrency(props.stats?.cashSales || 0), icon: Banknote, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    { label: "Bank Transfer", value: formatCurrency(props.stats?.bankSales || 0), icon: Building, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { label: "Telebirr", value: formatCurrency(props.stats?.telebirrSales || 0), icon: Smartphone, color: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
    { label: "Loan & Liabilities", value: formatCurrency(props.stats?.loanOutstanding || 0), icon: Landmark, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Executive Header Banner - Responsive wrapping */}
      <DashboardHeaderBanner
        roleBadge="Executive Command Center"
        title="General Manager Command Center"
        description="Unified command dashboard combining POS sales, trip budget sign-offs, fieldwork dispatch, and department supervision."
        gradientClass="bg-gradient-to-r from-[#2cb563] via-[#15803d] to-[#14532d]"
        actions={[
          {
            label: "Approvals",
            onClick: () => navigate("/inbox"),
            icon: Crown,
            badgeCount: pendingApprovals.length,
            className: "bg-white text-emerald-950 hover:bg-emerald-50 font-bold shadow-md text-xs h-8 sm:h-9",
          },
          {
            label: "Pump Sizing",
            onClick: () => navigate("/fieldwork/sizing"),
            icon: Droplets,
            className: "bg-emerald-950/70 hover:bg-emerald-950 text-white font-bold border border-white/20 text-xs h-8 sm:h-9",
          },
          {
            label: "Reports",
            onClick: () => navigate("/reports"),
            icon: BarChart3,
            className: "bg-emerald-950/70 hover:bg-emerald-950 text-white font-bold border border-white/20 text-xs h-8 sm:h-9",
          },
        ]}
      />

      {/* 2. Signature KPI Cards Grid - Responsive (2-cols on mobile, 5 on desktop) */}
      <StatCardGrid
        cards={topKpiCards}
        expandedCard={expandedCard}
        onToggleCard={toggleCard}
        gridColsClass="grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      />

      {/* Drill-down expanded content panel */}
      {expandedCard && props.renderExpandedContent && (
        <Card className="border border-emerald-500/30 shadow-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-500" /> Drill-down Analysis: {expandedCard}
            </CardTitle>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleCard(expandedCard)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {props.renderExpandedContent(expandedCard)}
          </CardContent>
        </Card>
      )}

      {/* 3. Financial Channels & Operations Bar - Responsive (2-cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {paymentBreakdown.map((channel, i) => {
          const Icon = channel.icon;
          return (
            <Card key={i} className="border border-border/70 shadow-sm bg-card">
              <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">{channel.label}</span>
                  <h4 className={`text-sm sm:text-base font-extrabold ${channel.text} mt-0.5 font-mono truncate`}>{channel.value}</h4>
                </div>
                <div className={`p-2 sm:p-2.5 rounded-xl ${channel.color} text-white shadow-sm shrink-0`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 4. Structured Main Workspace Grid - Responsive (1-col on mobile, 2-col on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (60% Desktop / 100% Mobile): Sales & Financial Flow */}
        <div className="lg:col-span-7 space-y-5">
          {/* Revenue Trend Chart */}
          <SalesTrendChartWidget chartData={props.chartData} onViewReport={() => navigate("/reports")} />

          {/* Recent Transactions Table */}
          <RecentTransactionsWidget
            transactions={filteredTx}
            txFilter={txFilter}
            onFilterChange={setTxFilter}
          />

          {/* EOD Activity Logs & Submissions */}
          <EodActivityWidget
            eodReports={props.eodReports}
            onOpenComments={props.handleOpenEodComments}
          />
        </div>

        {/* Right Column (40% Desktop / 100% Mobile): Approvals, Alerts & Field Operations */}
        <div className="lg:col-span-5 space-y-5">
          {/* Executive Approvals Hub */}
          <Card className="p-3.5 sm:p-4 space-y-3 border-emerald-500/30 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
                <Crown className="h-4 w-4 text-emerald-500" /> Executive Approvals Hub
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs px-2" onClick={() => navigate("/inbox")}>
                Inbox <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <ApprovalsInbox />
          </Card>

          {/* Daily Tasks & System Alerts */}
          <QuickAlertsTasksWidget />

          {/* Inventory Stock Warnings */}
          <Card className="border border-border/70 shadow-sm bg-card">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                Inventory Stock Warnings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2.5 text-xs">
              {outOfStock.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                  <div className="font-bold text-xs mb-0.5">
                    Out of Stock ({outOfStock.length})
                  </div>
                  <p className="text-[11px] opacity-90 line-clamp-2">
                    {outOfStock.map((p: any) => p.name).join(", ")}
                  </p>
                </div>
              )}

              {lowStock.length > 0 && (
                <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-800 dark:text-yellow-300">
                  <div className="font-bold text-xs mb-0.5">
                    Low Stock Alert ({lowStock.length})
                  </div>
                  <p className="text-[11px] opacity-90 line-clamp-2">
                    {lowStock.map((p: any) => p.name).join(", ")}
                  </p>
                </div>
              )}

              {outOfStock.length === 0 && lowStock.length === 0 && (
                <div className="p-3 text-center text-muted-foreground text-xs flex items-center justify-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>All warehouse stock items healthy</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Field Operations Dispatch */}
          <Card className="border border-border/70 shadow-sm bg-card">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-blue-500" /> Active Field Dispatch
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {activeFieldWorks.length} Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {activeFieldWorks.length > 0 ? (
                activeFieldWorks.slice(0, 3).map((fw: any) => (
                  <div key={fw.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-foreground">{fw.pumpModel || "Field Installation"}</span>
                      <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 font-mono">
                        {fw.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" /> <span className="truncate">{fw.location || "Site location"}</span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-3">No field work active at the moment</p>
              )}
            </CardContent>
          </Card>

          {/* Online Staff Presence */}
          {props.usersPresence && props.usersPresence.length > 0 && (
            <Card className="border border-border/70 shadow-sm bg-card">
              <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-emerald-500" /> Online Staff Presence
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {props.usersPresence.slice(0, 5).map((u: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-0 border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="font-medium text-foreground truncate">{u.displayName || u.username}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">{u.role || u.department}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

