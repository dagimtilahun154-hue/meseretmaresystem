import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  TrendingUp,
  Inbox,
  Users,
  ArrowRight,
  DollarSign,
  Package,
  Receipt,
  AlertTriangle,
  Wrench,
  Eye,
  X,
  Landmark,
  Building,
  Banknote,
  Smartphone,
  MapPin,
  Check,
  ShoppingCart,
  Wallet,
  Droplets,
  BarChart3,
  RefreshCcw,
  FileText,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Calendar,
  ChevronRight,
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
import { PeachtreeWorkMonitorWidget } from "./widgets/PeachtreeWorkMonitorWidget";

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

  // Unified Top KPI Cards with signature stat-gradient colors
  const topKpiCards = [
    {
      key: "finance",
      label: "Liquid Treasury (11-x)",
      value: formatCurrency(2450000),
      subtext: "Across 6 Banks & Telebirr",
      icon: Wallet,
      gradientClass: "stat-gradient-profit",
      badge: "Treasury",
    },
    {
      key: "sales",
      label: "Peachtree Gross Revenue",
      value: formatCurrency(totalPosRevenue || 6840000),
      subtext: "Sales & Pump Projects",
      icon: DollarSign,
      gradientClass: "stat-gradient-sales",
      badge: "Revenue",
    },
    {
      key: "ar",
      label: "Customer Debtors (AR)",
      value: formatCurrency(782000),
      subtext: "94 Open Customer Ledgers",
      icon: Users,
      gradientClass: "stat-gradient-customers",
      badge: "Receivables",
    },
    {
      key: "products",
      label: "Warehouse Stock",
      value: `${products.length} Products`,
      subtext: outOfStock.length > 0 ? `${outOfStock.length} out of stock!` : `${lowStock.length} low stock`,
      icon: Package,
      gradientClass: "stat-gradient-products",
      badge: outOfStock.length > 0 ? "Alert" : "Stock",
    },
    {
      key: "fieldwork",
      label: "Active Field Missions",
      value: `${activeFieldWorks.length} Sites`,
      subtext: "Solar Pump Installations",
      icon: Droplets,
      gradientClass: "stat-gradient-vat",
      badge: "Fieldwork",
    },
  ];

  // Payment Channels Breakdown
  const paymentBreakdown = [
    { label: "CBE Birr Account (11-2-001)", value: formatCurrency(840000), icon: Landmark, color: "bg-purple-600", text: "text-purple-600 dark:text-purple-400" },
    { label: "Development Bank (11-2-002)", value: formatCurrency(320000), icon: Building, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
    { label: "Telebirr Merchant (11-3-001)", value: formatCurrency(380000), icon: Smartphone, color: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
    { label: "Office Safe Cash (11-1-002)", value: formatCurrency(90000), icon: Banknote, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* 1. Executive Header Banner */}
      <DashboardHeaderBanner
        roleBadge="Executive General Manager Cockpit"
        title="General Manager Command Center"
        description="Complete operational overview: Peachtree general ledger, accountant productivity audit, field pump dispatch, and department supervision."
        gradientClass="bg-gradient-to-r from-[#2cb563] via-[#15803d] to-[#14532d]"
        actions={[
          {
            label: "Executive Approvals",
            onClick: () => navigate("/inbox"),
            icon: Crown,
            badgeCount: pendingApprovals.length,
            className: "bg-white text-emerald-950 hover:bg-emerald-50 font-bold shadow-md text-xs h-8 sm:h-9",
          },
          {
            label: "Finance Executive Hub",
            onClick: () => navigate("/finance/dashboard"),
            icon: DollarSign,
            className: "bg-emerald-950/70 hover:bg-emerald-950 text-white font-bold border border-white/20 text-xs h-8 sm:h-9",
          },
          {
            label: "Accountant Audit & Backlog",
            onClick: () => navigate("/finance/monitor"),
            icon: Activity,
            className: "bg-emerald-950/70 hover:bg-emerald-950 text-white font-bold border border-white/20 text-xs h-8 sm:h-9",
          },
          {
            label: "Pump Sizing Engine",
            onClick: () => navigate("/fieldwork/sizing"),
            icon: Droplets,
            className: "bg-emerald-950/70 hover:bg-emerald-950 text-white font-bold border border-white/20 text-xs h-8 sm:h-9",
          },
        ]}
      />

      {/* 2. Signature KPI Cards Grid */}
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

      {/* 3. Liquid Treasury & Ethiopian Banking Distribution */}
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

      {/* 4. Structured Main Workspace Grid */}
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

        {/* Right Column (40% Desktop / 100% Mobile): Accountant Surveillance, Approvals & Operations */}
        <div className="lg:col-span-5 space-y-5">
          {/* Real-time Accounting Activity & Workstation Surveillance */}
          <PeachtreeWorkMonitorWidget />

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
                  {activeFieldWorks.length} Active Sites
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2 text-xs">
              {activeFieldWorks.slice(0, 3).map((fw: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/fieldwork`)}
                  className="p-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-foreground truncate">{fw.title || fw.customerName || "Solar Pump Installation"}</p>
                    <p className="text-[10px] text-muted-foreground">{fw.location || "Oromia Region"}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-mono capitalize">
                    {fw.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
