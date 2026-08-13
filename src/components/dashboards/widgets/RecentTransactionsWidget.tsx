import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";
import { formatCurrency } from "@/lib/data";

export interface RecentTransactionsWidgetProps {
  transactions: any[];
  txFilter: string;
  onFilterChange: (filter: string) => void;
  onNavigatePos?: () => void;
  limit?: number;
}

export function RecentTransactionsWidget({
  transactions,
  txFilter,
  onFilterChange,
  onNavigatePos,
  limit = 8,
}: RecentTransactionsWidgetProps) {
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Recent Sales & Invoices
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={txFilter} onValueChange={onFilterChange}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="telebirr">Telebirr</SelectItem>
                <SelectItem value="vat">VAT Invoices</SelectItem>
                <SelectItem value="no-vat">Non-VAT</SelectItem>
              </SelectContent>
            </Select>
            {onNavigatePos && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onNavigatePos}>
                POS Center
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Ref ID</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium text-center">Payment</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Profit</th>
                <th className="pb-2 font-medium text-center">VAT</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, limit).map((sale: any) => (
                <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 font-medium">{sale.id}</td>
                  <td className="py-2.5 text-muted-foreground">{sale.date}</td>
                  <td className="py-2.5 font-medium">{sale.customer?.name || "Customer"}</td>
                  <td className="py-2.5 text-muted-foreground">{sale.customer?.location || "—"}</td>
                  <td className="py-2.5 text-center">
                    <Badge variant="outline" className={`text-[10px] ${
                      sale.paymentMethod === "Cash" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400" :
                      sale.paymentMethod === "Bank" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" :
                      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400"
                    }`}>
                      {sale.paymentMethod}{sale.bankName ? ` · ${sale.bankName}` : ""}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right font-bold">{formatCurrency(sale.totalSell || sale.totalAmount)}</td>
                  <td className="py-2.5 text-right text-emerald-600 font-medium">{formatCurrency(sale.profit || 0)}</td>
                  <td className="py-2.5 text-center">
                    {sale.vatIncluded ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        {formatCurrency(sale.vatAmount || 0)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No matching transactions found</p>
        )}
      </CardContent>
    </Card>
  );
}
