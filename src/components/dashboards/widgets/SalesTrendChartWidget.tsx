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
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            {title}
          </CardTitle>
          {onViewReport && (
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={onViewReport}>
              Full Reports <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData && chartData.length > 0 ? (
          <div className="h-[220px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                <Tooltip formatter={(value: any) => [formatCurrency(value), "Revenue"]} />
                <Bar dataKey="amount" fill="#d97706" radius={[4, 4, 0, 0]} />
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
