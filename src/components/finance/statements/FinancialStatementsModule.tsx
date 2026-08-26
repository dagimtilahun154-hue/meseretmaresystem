import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data";
import { JournalEntry, generateIncomeStatement, generateBalanceSheet } from "@/lib/accounting-system";
import { financeStore } from "@/lib/finance-hub-store";
import { PieChart, Landmark } from "lucide-react";

interface FinancialStatementsModuleProps {
  journalEntries: JournalEntry[];
}

export function FinancialStatementsModule({
  journalEntries,
}: FinancialStatementsModuleProps) {
  const pl = generateIncomeStatement(journalEntries, financeStore.getAccounts());
  const bs = generateBalanceSheet(journalEntries, financeStore.getAccounts());

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Statement */}
        <Card className="border shadow-sm">
          <CardHeader className="bg-muted/15 border-b pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" /> Income Statement (Profit & Loss)
            </CardTitle>
            <CardDescription className="text-xs">
              Summary of all ledger recognized revenues minus operating expenses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Revenue Accounts</p>
              {pl.revenue.map((r, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-foreground">{r.name}</span>
                  <span className="font-mono font-semibold text-emerald-600">{formatCurrency(r.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1.5 border-t">
                <span>Total Gross Revenue</span>
                <span className="font-mono text-emerald-600 font-black">{formatCurrency(pl.totalRevenue)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Operating Expenses</p>
              {pl.expenses.map((e, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-foreground">{e.name}</span>
                  <span className="font-mono text-destructive">({formatCurrency(e.balance)})</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1.5 border-t">
                <span>Total Operating Expenses</span>
                <span className="font-mono text-destructive font-black">({formatCurrency(pl.totalExpenses)})</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-black bg-primary/5 p-3 rounded-xl border border-primary/20 mt-4">
              <span>Net Net Operating Income</span>
              <span className={`font-mono text-base ${pl.netIncome >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {formatCurrency(pl.netIncome)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Balance Sheet */}
        <Card className="border shadow-sm">
          <CardHeader className="bg-muted/15 border-b pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" /> Balance Sheet (Financial Position)
            </CardTitle>
            <CardDescription className="text-xs">
              Assets = Liabilities + Equity double-entry validation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Assets</p>
              {bs.assets.map((a, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-border/40">
                  <span>{a.name}</span>
                  <span className="font-mono font-semibold">{formatCurrency(a.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1.5 border-t">
                <span>Total Assets</span>
                <span className="font-mono text-primary font-black">{formatCurrency(bs.totalAssets)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Liabilities</p>
              {bs.liabilities.map((l, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-border/40">
                  <span>{l.name}</span>
                  <span className="font-mono text-warning">{formatCurrency(l.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1.5 border-t">
                <span>Total Liabilities</span>
                <span className="font-mono text-warning font-black">{formatCurrency(bs.totalLiabilities)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Equity</p>
              {bs.equity.map((e, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-border/40">
                  <span>{e.name}</span>
                  <span className="font-mono">{formatCurrency(e.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1.5 border-t">
                <span>Total Equity</span>
                <span className="font-mono font-black">{formatCurrency(bs.totalEquity)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3 italic">
              <span>Total Liabilities + Equity:</span>
              <span className="font-mono font-bold text-foreground">{formatCurrency(bs.totalLiabilities + bs.totalEquity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
