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
      subtext: `Active buyer accounts`,
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
    { label: "Cash Sales", value: formatCurrency(props.stats?.cashSales || 0), icon: Banknote, color: "bg-emerald-500", text: "text-emerald-600" },
    { label: "Bank Transfer", value: formatCurrency(props.stats?.bankSales || 0), icon: Building, color: "bg-blue-500", text: "text-blue-600" },
    { label: "Telebirr", value: formatCurrency(props.stats?.telebirrSales || 0), icon: Smartphone, color: "bg-purple-500", text: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Standardized Header Banner Widget */}
      <DashboardHeaderBanner
        roleBadge="Executive Command Center"
        title="General Manager Workspace"
        description="Unified command dashboard combining POS sales, Peachtree financial sync, trip budget sign-offs, and department supervision."
        gradientClass="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700"
        actions={[
          {
            label: "Approvals",
            onClick: () => navigate("/inbox"),
            icon: Crown,
            badgeCount: pendingApprovals.length,
            className: "bg-white text-amber-900 hover:bg-amber-50 font-bold shadow-md text-xs h-9",
          },
          {
            label: "Pump Sizing",
            onClick: () => navigate("/fieldwork/sizing"),
            icon: Droplets,
            className: "bg-amber-900/60 hover:bg-amber-900 text-white font-bold border border-white/20 text-xs h-9",
          },
          {
            label: "Reports",
            onClick: () => navigate("/reports"),
            icon: BarChart3,
            className: "bg-amber-900/60 hover:bg-amber-900 text-white font-bold border border-white/20 text-xs h-9",
          },
        ]}
      />

      {/* 2. Signature Stat Cards Grid Widget */}
      <StatCardGrid
        cards={topKpiCards}
        expandedCard={expandedCard}
        onToggleCard={toggleCard}
        gridColsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
      />

      {/* Drill-down expanded content modal/panel */}
      {expandedCard && props.renderExpandedContent && (
        <Card className="border border-amber-500/30 shadow-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" /> Drill-down Analysis: {expandedCard}
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

      {/* 3. Financial Channels & Operations Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {paymentBreakdown.map((channel, i) => {
          const Icon = channel.icon;
          return (
            <Card key={i} className="border border-border/60 shadow-sm bg-card">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">{channel.label}</span>
                  <h4 className={`text-base font-extrabold ${channel.text} mt-0.5`}>{channel.value}</h4>
                </div>
                <div className={`p-2.5 rounded-xl ${channel.color} text-white shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card className="border border-border/60 shadow-sm bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Loan & Liabilities</span>
              <h4 className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(props.stats?.loanOutstanding || 0)}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm">
              <Landmark className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Revenue Chart, Recent Transactions Table, & EOD Activity Widget */}
        <div className="lg:col-span-2 space-y-6">
          <SalesTrendChartWidget chartData={props.chartData} onViewReport={() => navigate("/reports")} />

          {/* Unified Peachtree Financial Sync Summary Widget */}
          <Card className="border border-border/60 shadow-sm bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-emerald-500" />
                  Unified Peachtree 2010 Financial Sync Summary
                </CardTitle>

                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
                  Peachtree Sync Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Peachtree Revenue</span>
                  <p className="text-sm font-bold font-heading mt-0.5">{formatCurrency(peachtreeSummary?.peachtreeTotal || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  <span className="text-[10px] uppercase font-bold block">Balanced POS Sales</span>
                  <p className="text-sm font-bold font-heading mt-0.5">{peachtreeSummary?.balanced || 0} Matches</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400">
                  <span className="text-[10px] uppercase font-bold block">Peachtree Invoices</span>
                  <p className="text-sm font-bold font-heading mt-0.5">{peachtreeSummary?.invoiceCount || 0} Synced</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400">
                  <span className="text-[10px] uppercase font-bold block">Peachtree Clients</span>
                  <p className="text-sm font-bold font-heading mt-0.5">{peachtreeSummary?.customerCount || 0} Accounts</p>
                </div>
              </div>

              {peachtreeSummary?.recentInvoices && peachtreeSummary.recentInvoices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Peachtree Synced Invoices</h4>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                          <th className="p-2 font-medium">Invoice ID</th>
                          <th className="p-2 font-medium">Customer</th>
                          <th className="p-2 font-medium">Date</th>
                          <th className="p-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {peachtreeSummary.recentInvoices.map((inv: any) => (
                          <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-2 font-medium text-primary">{inv.id}</td>
                            <td className="p-2">{inv.customerName || inv.customerId || "N/A"}</td>
                            <td className="p-2 text-muted-foreground">{inv.date ? new Date(inv.date).toLocaleDateString() : "—"}</td>
                            <td className="p-2 text-right font-bold">{formatCurrency(inv.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <RecentTransactionsWidget
            transactions={filteredTx}
            txFilter={txFilter}
            onFilterChange={setTxFilter}
          />

          <EodActivityWidget
            eodReports={props.eodReports}
            onOpenComments={props.handleOpenEodComments}
          />
        </div>

        {/* Right Column (1/3): Quick Alerts, Approvals Inbox, Inventory Alerts, & Presence */}
        <div className="space-y-6">
          {/* Quick Access Daily Tasks & Alerts */}
          <QuickAlertsTasksWidget />

          {/* Executive Approvals Hub */}
          <Card className="p-4 space-y-3 border-amber-500/30 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-xs flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" /> Executive Approvals Hub
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => navigate("/inbox")}>
                Inbox <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <ApprovalsInbox />
          </Card>

          {/* Inventory Stock Warnings */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Inventory Stock Warnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {outOfStock.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                  <div className="flex items-center justify-between font-bold text-xs mb-1">
                    <span>Out of Stock ({outOfStock.length})</span>
                  </div>
                  <p className="text-[11px] opacity-90 line-clamp-2">
                    {outOfStock.map((p: any) => p.name).join(", ")}
                  </p>
                </div>
              )}

              {lowStock.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center justify-between font-bold text-xs mb-1">
                    <span>Low Stock Alert ({lowStock.length})</span>
                  </div>
                  <p className="text-[11px] opacity-90 line-clamp-2">
                    {lowStock.map((p: any) => p.name).join(", ")}
                  </p>
                </div>
              )}

              {outOfStock.length === 0 && lowStock.length === 0 && (
                <div className="p-3 text-center text-muted-foreground text-xs">
                  <Check className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  All stock items are healthy
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Field Operations */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500" /> Active Field Operations
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {activeFieldWorks.length} Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeFieldWorks.length > 0 ? (
                activeFieldWorks.slice(0, 3).map((fw: any) => (
                  <div key={fw.id} className="p-2.5 rounded-lg border bg-muted/30 text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>{fw.pumpModel || "Field Operation"}</span>
                      <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                        {fw.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {fw.location || "Site location"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No field work active at the moment</p>
              )}
            </CardContent>
          </Card>

          {/* Online Staff Presence */}
          {props.usersPresence && props.usersPresence.length > 0 && (
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" /> Online Staff Presence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {props.usersPresence.slice(0, 6).map((u: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-medium text-foreground">{u.displayName || u.username}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase">{u.role || u.department}</span>
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
