import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight, ArrowDownRight, Droplets, Package, Building,
  TrendingUp, FileUp, CheckCircle2, DollarSign, Wallet,
  Landmark, ArrowUp, ArrowDown, Activity, Layers, BarChart2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/data";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line
} from "recharts";

interface FinanceOverviewWorkspaceProps {
  selectedEntity?: "FZ" | "MM";
  totalAssets: number;
  totalBankBalance: number;
  cashBalance: number;
  telebirrBalance: number;
  bankMoneyOnly: number;
  cfIncome: number;
  cfExpense: number;
  totalVAT: number;
  totalLoans: number;
  totalRentCollected?: number;
  pendingInvCount: number;
  pendingSizingCount: number;
  dashboardAnalytics: any;
  cashflowChartData: Array<{ date: string; fullDate?: string; income: number; expense: number; net?: number }>;
  dualSourceRevenueData: Array<{ month: string; solarflow: number; peachtree: number; total: number }>;
  bankDistributionData: Array<{ name: string; balance: number; color: string }>;
}

// Custom Glassmorphism Tooltip for 14-day Cash Flow
function CustomCashflowTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const income = payload.find((p: any) => p.dataKey === "income")?.value || 0;
    const expense = payload.find((p: any) => p.dataKey === "expense")?.value || 0;
    const net = income - expense;

    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-3.5 rounded-xl shadow-xl text-xs space-y-2 min-w-[210px] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-bold">
          <span className="text-muted-foreground">Timeline</span>
          <span className="font-mono text-foreground">{label}</span>
        </div>
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
              Cash Inflow
            </span>
            <span className="font-mono font-bold text-emerald-600">{formatCurrency(income)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm" />
              Cash Outflow
            </span>
            <span className="font-mono font-bold text-rose-500">{formatCurrency(expense)}</span>
          </div>
        </div>
        <div className="pt-2 border-t border-border/60 flex items-center justify-between font-bold">
          <span className="text-muted-foreground text-[11px]">Daily Net Delta</span>
          <span className={`font-mono text-xs ${net >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {net >= 0 ? "+" : ""}{formatCurrency(net)}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

// Custom Glassmorphism Tooltip for Dual-Source Revenue Bar Chart
function CustomRevenueTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const solarflow = payload.find((p: any) => p.dataKey === "solarflow")?.value || 0;
    const peachtree = payload.find((p: any) => p.dataKey === "peachtree")?.value || 0;
    const total = solarflow + peachtree;

    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-3.5 rounded-xl shadow-xl text-xs space-y-2 min-w-[210px] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-bold">
          <span className="text-muted-foreground">Month</span>
          <span className="font-mono text-foreground">{label}</span>
        </div>
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sky-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Pump Projects
            </span>
            <span className="font-mono font-bold text-sky-500">{formatCurrency(solarflow)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-violet-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Peachtree Retail
            </span>
            <span className="font-mono font-bold text-violet-500">{formatCurrency(peachtree)}</span>
          </div>
        </div>
        <div className="pt-2 border-t border-border/60 flex items-center justify-between font-bold">
          <span className="text-foreground text-[11px]">Total Revenue</span>
          <span className="font-mono text-xs text-primary font-black">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function FinanceOverviewWorkspace({
  selectedEntity = "MM",
  totalAssets,
  cashBalance,
  telebirrBalance,
  bankMoneyOnly,
  cfIncome,
  cfExpense,
  totalVAT,
  totalLoans,
  totalRentCollected = 0,
  pendingInvCount,
  pendingSizingCount,
  dashboardAnalytics,
  cashflowChartData,
  dualSourceRevenueData,
  bankDistributionData,
}: FinanceOverviewWorkspaceProps) {
  const navigate = useNavigate();
  const [chartViewMode, setChartViewMode] = useState<"area" | "bar" | "net">("area");

  // 14-day chart aggregates
  const chartTotals = useMemo(() => {
    const totalIn = cashflowChartData.reduce((acc, d) => acc + (d.income || 0), 0);
    const totalOut = cashflowChartData.reduce((acc, d) => acc + (d.expense || 0), 0);
    const net14 = totalIn - totalOut;
    return { totalIn, totalOut, net14 };
  }, [cashflowChartData]);

  const totalBankLiquidity = useMemo(() => {
    return bankDistributionData.reduce((acc, b) => acc + b.balance, 0) || 1;
  }, [bankDistributionData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 Top Executive Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-10 pointer-events-none">
            <Landmark className="h-24 w-24 text-primary" />
          </div>
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Liquid Assets</p>
            <p className="text-2xl font-black text-primary font-mono">{formatCurrency(totalAssets)}</p>
            <div className="mt-2.5 pt-2 border-t border-primary/15 flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank Balances:</span>
                <span className="font-mono font-semibold">{formatCurrency(bankMoneyOnly)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Office Safe / Cash:</span>
                <span className="font-mono font-semibold">{formatCurrency(cashBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telebirr Wallet:</span>
                <span className="font-mono font-semibold text-secondary">{formatCurrency(telebirrBalance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/70 relative overflow-hidden">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Net Cash Flow</p>
              <p className={`text-2xl font-black font-mono ${cfIncome - cfExpense >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {cfIncome - cfExpense >= 0 ? "+" : ""}{formatCurrency(cfIncome - cfExpense)}
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1 text-emerald-600 font-semibold">
                <ArrowUp className="h-3 w-3" /> {formatCurrency(cfIncome)}
              </span>
              <span className="text-muted-foreground flex items-center gap-1 text-rose-500 font-semibold">
                <ArrowDown className="h-3 w-3" /> {formatCurrency(cfExpense)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/70 relative overflow-hidden">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total VAT (15%)</p>
              <p className="text-2xl font-black text-destructive font-mono">{formatCurrency(totalVAT)}</p>
            </div>
            <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Output VAT Liability</span>
              <Button variant="link" size="sm" onClick={() => navigate("/finance/vat")} className="h-auto p-0 text-xs font-bold">
                Tax Ledger →
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/70 relative overflow-hidden">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Outstanding Loans</p>
              <p className="text-2xl font-black text-amber-500 font-mono">{formatCurrency(totalLoans)}</p>
            </div>
            <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Bank Credit Facilities</span>
              <Button variant="link" size="sm" onClick={() => navigate("/finance/loans")} className="h-auto p-0 text-xs font-bold text-amber-600">
                Amortization →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meseret Mare Solar Primary Action & KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="shadow-xs border-primary/20 bg-primary/5">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Recognized Sales</p>
              <p className="text-xl font-black text-primary font-mono mt-0.5">
                {formatCurrency(dashboardAnalytics?.stats?.totalSales || 0)}
              </p>
              <span className="text-[10px] text-muted-foreground">{dashboardAnalytics?.stats?.uniqueCustomers || 0} active clients</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-xs border-amber-500/20 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-all"
          onClick={() => navigate("/finance/inventory")}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Stock Requisitions</p>
              <p className="text-xl font-black text-amber-600 font-mono mt-0.5">{pendingInvCount}</p>
              <span className="text-[10px] text-amber-600/80 font-medium">Pending price review</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-xs border-blue-500/20 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-all"
          onClick={() => navigate("/finance/sizing-proposals")}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Pump Proposals</p>
              <p className="text-xl font-black text-blue-600 font-mono mt-0.5">{pendingSizingCount}</p>
              <span className="text-[10px] text-blue-600/80 font-medium">Awaiting deposit slip</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-600">
              <Droplets className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-xs border-border/70 cursor-pointer hover:bg-muted/40 transition-all"
          onClick={() => navigate("/finance/petty-cash")}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Office Cash & Safe</p>
              <p className="text-xl font-black font-mono mt-0.5 text-foreground">
                {formatCurrency(cashBalance)}
              </p>
              <span className="text-[10px] text-muted-foreground truncate block">
                Petty Cash Vouchers
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-muted border flex items-center justify-center text-muted-foreground shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row: 14-Day Cash Flow Trend & Bank Liquidity Distribution */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
        {/* Elegant 14-Day Cash Flow Trend Area Chart */}
        <Card className="shadow-sm border-border/70 overflow-hidden">
          <CardHeader className="bg-muted/15 border-b pb-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  Cash Flow Trend (14-Day Running Horizon)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  14 consecutive calendar days running timeline & cash variance
                </CardDescription>
              </div>

              {/* View Switcher & 14-Day Aggregates */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/50 text-xs">
                  <Button
                    variant={chartViewMode === "area" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[10px] font-bold rounded-md"
                    onClick={() => setChartViewMode("area")}
                  >
                    Wave
                  </Button>
                  <Button
                    variant={chartViewMode === "bar" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[10px] font-bold rounded-md"
                    onClick={() => setChartViewMode("bar")}
                  >
                    Bars
                  </Button>
                  <Button
                    variant={chartViewMode === "net" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-[10px] font-bold rounded-md"
                    onClick={() => setChartViewMode("net")}
                  >
                    Net Trajectory
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-mono font-bold text-[10px]">
                    <ArrowUp className="h-2.5 w-2.5" /> {formatCurrency(chartTotals.totalIn)}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 font-mono font-bold text-[10px]">
                    <ArrowDown className="h-2.5 w-2.5" /> {formatCurrency(chartTotals.totalOut)}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-5">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartViewMode === "area" ? (
                  <AreaChart
                    data={cashflowChartData}
                    margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="proIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="60%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="proExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.38} />
                        <stop offset="60%" stopColor="#f43f5e" stopOpacity={0.10} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="currentColor"
                      className="text-border/40"
                    />

                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                      dy={8}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return `${val}`;
                      }}
                      dx={-4}
                    />

                    <Tooltip content={<CustomCashflowTooltip />} />

                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Inflow"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#proIncomeGradient)"
                      dot={{ r: 3, fill: "#10b981", strokeWidth: 1, stroke: "#fff" }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 2,
                        stroke: "#ffffff",
                        className: "shadow-md drop-shadow",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Outflow"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#proExpenseGradient)"
                      dot={{ r: 3, fill: "#f43f5e", strokeWidth: 1, stroke: "#fff" }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 2,
                        stroke: "#ffffff",
                        className: "shadow-md drop-shadow",
                      }}
                    />
                  </AreaChart>
                ) : chartViewMode === "bar" ? (
                  <BarChart
                    data={cashflowChartData}
                    margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                    barGap={4}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="currentColor"
                      className="text-border/40"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return `${val}`;
                      }}
                      dx={-4}
                    />
                    <Tooltip content={<CustomCashflowTooltip />} />
                    <Bar
                      dataKey="income"
                      name="Inflow"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Outflow"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={cashflowChartData}
                    margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="currentColor"
                      className="text-border/40"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                        return `${val}`;
                      }}
                      dx={-4}
                    />
                    <Tooltip content={<CustomCashflowTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Daily Net"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 1.5, stroke: "#fff" }}
                      activeDot={{ r: 7, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Bottom Legend with Interactive Status */}
            <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-2 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] shadow-xs" />
                  <span className="font-semibold text-muted-foreground">Inflow</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e] shadow-xs" />
                  <span className="font-semibold text-muted-foreground">Outflow</span>
                </div>
                {chartViewMode === "net" && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6] shadow-xs" />
                    <span className="font-semibold text-muted-foreground">Daily Net</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/finance/cashflow")}
                className="h-7 text-xs font-semibold text-primary hover:text-primary gap-1"
              >
                Cash Flow Ledger <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ethiopian Bank Liquidity Distribution Panel */}
        <Card className="shadow-sm border-border/70 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/15 border-b pb-3.5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-secondary/15 flex items-center justify-center text-secondary">
                    <Building className="h-3.5 w-3.5" />
                  </div>
                  Bank Liquidity Distribution
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Ethiopian Banking reserves & mobile wallets
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/finance/bank")}
                className="h-7 text-xs font-semibold"
              >
                Banks →
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3 pt-1">
              {bankDistributionData.map((b) => {
                const percentage = Math.round((b.balance / totalBankLiquidity) * 100) || 0;
                return (
                  <div key={b.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                        <span className="font-medium text-foreground truncate">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-mono font-bold">
                          {percentage}%
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {formatCurrency(b.balance)}
                        </span>
                      </div>
                    </div>
                    {/* Percentage Progress Bar */}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: b.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Total Liquid Reserve:</span>
              <span className="font-mono font-black text-sm text-primary">
                {formatCurrency(totalAssets)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dual Source Revenue Chart: Solar Pump Projects vs Peachtree Retail */}
      <Card className="shadow-sm border-border/70 overflow-hidden">
        <CardHeader className="bg-muted/15 border-b pb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                Revenue Stream Comparison: Commercial Solar Projects vs Peachtree Store Retail
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monthly revenue distribution between large-scale agricultural pump installations and retail counter merchandise
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 bg-background border-border/80">
              FY 2026 Monthly Breakdown
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-5">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dualSourceRevenueData}
                margin={{ top: 10, right: 15, left: -5, bottom: 0 }}
                barGap={6}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="currentColor"
                  className="text-border/40"
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-muted-foreground font-semibold"
                  dy={6}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground font-mono"
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return `${val}`;
                  }}
                  dx={-4}
                />

                <Tooltip content={<CustomRevenueTooltip />} />

                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                  formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
                />

                <Bar
                  dataKey="solarflow"
                  name="Commercial Solar Pump Projects"
                  fill="#0ea5e9"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />

                <Bar
                  dataKey="peachtree"
                  name="Peachtree Store / POS Retail"
                  fill="#8b5cf6"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
