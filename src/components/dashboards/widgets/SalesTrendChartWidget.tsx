import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowUpRight, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/data";

function CustomFinancialPerformanceTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const revenue = payload.find((p: any) => p.dataKey === "revenue" || p.dataKey === "amount")?.value || 0;
    const expenses = payload.find((p: any) => p.dataKey === "expenses")?.value || 0;
    const netProfit = revenue - expenses;

    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-3.5 rounded-xl shadow-xl text-xs space-y-2 min-w-[220px] animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-bold">
          <span className="text-muted-foreground">Accounting Period</span>
          <span className="font-mono text-foreground">{label}</span>
        </div>
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
              Peachtree Gross Revenue
            </span>
            <span className="font-mono font-bold text-emerald-600">{formatCurrency(revenue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm" />
              Operating Costs (COGS & Admin)
            </span>
            <span className="font-mono font-bold text-rose-500">{formatCurrency(expenses)}</span>
          </div>
        </div>
        <div className="pt-2 border-t border-border/60 flex items-center justify-between font-bold">
          <span className="text-muted-foreground text-[11px]">Net Operating Profit</span>
          <span className={`font-mono text-xs font-black ${netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export interface SalesTrendChartWidgetProps {
  chartData?: any[];
  title?: string;
  onViewReport?: () => void;
}

export function SalesTrendChartWidget({
  chartData = [],
  title = "General Ledger Financial Performance",
  onViewReport,
}: SalesTrendChartWidgetProps) {
  const formattedData = chartData.map((d: any) => ({
    date: d.date || d.month || "",
    revenue: Number(d.revenue ?? d.amount ?? d.income ?? 0),
    expenses: Number(d.expenses ?? d.expense ?? 0),
  }));

  return (
    <Card className="border border-border/80 shadow-sm bg-card rounded-2xl">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              {title}
            </CardTitle>
            <p className="text-xs text-muted-foreground pt-0.5">
              Revenue, Operating Expenses (COGS & Admin) & Net Profit Trajectory
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono font-bold">Live Ledger</Badge>
            {onViewReport && (
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2" onClick={onViewReport}>
                Full Reports <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {formattedData && formattedData.length > 0 ? (
          <div className="h-[240px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmColorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gmColorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip content={<CustomFinancialPerformanceTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross Revenue (ETB)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gmColorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Operating Expenses (COGS & Admin ETB)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gmColorExp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-10">No recent sales or expense records available</p>
        )}
      </CardContent>
    </Card>
  );
}

