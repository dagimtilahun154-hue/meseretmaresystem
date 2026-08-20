import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/data";

export interface SalesTrendChartWidgetProps {
  chartData?: any[];
  title?: string;
  onViewReport?: () => void;
}

export function SalesTrendChartWidget({
  chartData = [],
  title = "Sales Revenue Trend",
  onViewReport,
}: SalesTrendChartWidgetProps) {
  return (
    <Card className="border border-border/80 shadow-sm bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          {onViewReport && (
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground h-7" onClick={onViewReport}>
              Full Reports <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {chartData && chartData.length > 0 ? (
          <div className="h-[200px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-10">No recent sales records available</p>
        )}
      </CardContent>
    </Card>
  );
}

