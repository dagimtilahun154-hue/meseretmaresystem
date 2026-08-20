import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { financeStore as store, toMoneyNumber } from "@/lib/finance-hub-store";
import {
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
export default function Reports() {
  const invoices = store.getInvoices();
  const expenses = store.getExpenses();
  const accounts = store.getAccounts();
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");
  const totalRevenue = invoices.reduce((s, i) => s + toMoneyNumber(i.total), 0);
  const totalExpenses = expenses.reduce((s, e) => s + toMoneyNumber(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const assets = accounts
    .filter((a) => a.type === "Assets")
    .reduce((s, a) => s + toMoneyNumber(a.openingBalance), 0);
  const liabilities = accounts
    .filter((a) => a.type === "Liabilities")
    .reduce((s, a) => s + toMoneyNumber(a.openingBalance), 0);
  const equity = accounts
    .filter((a) => a.type === "Equity")
    .reduce((s, a) => s + toMoneyNumber(a.openingBalance), 0);
  const expenseByCategory = expenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + toMoneyNumber(e.amount);
      return acc;
    },
    {} as Record<string, number>,
  );
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Financial Reports
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Comprehensive business performance analysis
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> AUDITED &
          VERIFIED
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-end">
        <div className="grid gap-1.5">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Report From
          </Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 text-xs border-slate-200"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Report To
          </Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 text-xs border-slate-200"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-bold px-4 border-slate-200 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 mr-2" /> PDF Export
          </Button>
          <Button
            variant="outline"
            className="h-9 text-xs font-bold px-4 border-slate-200 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 mr-2" /> Excel
          </Button>
        </div>
      </div>
      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-11 w-full max-w-2xl border border-slate-200/50">
          <TabsTrigger
            value="pnl"
            className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger
            value="balance"
            className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger
            value="sales"
            className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            Sales Analysis
          </TabsTrigger>
          <TabsTrigger
            value="expenses"
            className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            Expense Analysis
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pnl" className="mt-6">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Profit & Loss
                Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Operating Revenue
                  </h3>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm font-medium text-slate-600">
                      Total Sales Turnover
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {totalRevenue.toLocaleString()} ETB
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                    Operating Expenses
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(expenseByCategory).map(([cat, amt]) => (
                      <div
                        key={cat}
                        className="flex justify-between items-center py-1"
                      >
                        <span className="text-sm text-slate-600 italic">
                          {cat}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {amt.toLocaleString()} ETB
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center font-bold pt-4 border-t border-slate-100 mt-2">
                    <span className="text-sm text-slate-900">
                      Total Operating Expenses
                    </span>
                    <span className="text-sm text-red-600">
                      ({totalExpenses.toLocaleString()}) ETB
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-2xl p-6 text-white flex justify-between items-center shadow-xl shadow-slate-200 mt-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Net Operating Income
                    </p>
                    <h2 className="text-2xl font-bold">Comprehensive Profit</h2>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-3xl font-black ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {netProfit.toLocaleString()}
                      <span className="text-sm font-bold opacity-60">ETB</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="balance" className="mt-6">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Balance Sheet
                Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 w-fit uppercase tracking-wider">
                    Current Assets
                  </h3>
                  <div className="space-y-3">
                    {accounts
                      .filter((a) => a.type === "Assets")
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between items-center py-1 border-b border-slate-50"
                        >
                          <span className="text-sm text-slate-600">
                            {a.name}
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {a.openingBalance.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="flex justify-between items-center font-bold pt-4 border-t-2 border-slate-100 bg-slate-50 p-3 rounded-xl mt-4">
                    <span className="text-sm text-slate-900">
                      Total Asset Value
                    </span>
                    <span className="text-lg text-blue-700 underline underline-offset-4 decoration-blue-200">
                      {assets.toLocaleString()} ETB
                    </span>
                  </div>
                </div>
                <div className="space-y-10">
                  <div className="space-y-6">
                    <h3 className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 w-fit uppercase tracking-wider">
                      Current Liabilities
                    </h3>
                    <div className="space-y-3">
                      {accounts
                        .filter((a) => a.type === "Liabilities")
                        .map((a) => (
                          <div
                            key={a.id}
                            className="flex justify-between items-center py-1 border-b border-slate-50"
                          >
                            <span className="text-sm text-slate-600">
                              {a.name}
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {a.openingBalance.toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center font-bold pt-4 border-t-2 border-slate-100 bg-slate-50 p-3 rounded-xl mt-4">
                      <span className="text-sm text-slate-900">
                        Total Liabilities
                      </span>
                      <span className="text-lg text-orange-700">
                        {liabilities.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                  <div className="space-y-6 pt-4">
                    <h3 className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 w-fit uppercase tracking-wider">
                      Owner's Equity
                    </h3>
                    <div className="space-y-3">
                      {accounts
                        .filter((a) => a.type === "Equity")
                        .map((a) => (
                          <div
                            key={a.id}
                            className="flex justify-between items-center py-1 border-b border-slate-50"
                          >
                            <span className="text-sm text-slate-600">
                              {a.name}
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {a.openingBalance.toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center font-bold pt-4 border-t-2 border-slate-100 bg-slate-50 p-3 rounded-xl mt-4">
                      <span className="text-sm text-slate-900">
                        Retained Earnings
                      </span>
                      <span className="text-lg text-green-700">
                        {equity.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sales" className="mt-6">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50/30 border-b border-slate-100">
              <CardTitle className="text-sm font-bold">
                Transaction History (Sales Breakdown)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Document #
                      </th>
                      <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Entity Name
                      </th>
                      <th className="text-center py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                        Date
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Gross Amount
                      </th>
                      <th className="text-center py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr
                        key={i.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400 font-bold">
                          {i.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          {i.customerName}
                        </td>
                        <td className="py-3 px-4 text-center text-[10px] text-slate-500">
                          {i.date}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          {i.total.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${i.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                          >
                            {i.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses" className="mt-6">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50/30 border-b border-slate-100">
              <CardTitle className="text-sm font-bold">
                Expense Distribution Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Business Vertical
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Expenditure (ETB)
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        % Contribution
                      </th>
                      <th className="px-4 w-48"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(expenseByCategory).map(([cat, amt]) => (
                      <tr
                        key={cat}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-slate-600 uppercase text-[10px]">
                          {cat}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {amt.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 font-bold">
                          {((amt / totalExpenses) * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{
                                width: `${(amt / totalExpenses) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="pt-8 border-t border-slate-100">
        <div className="flex items-center gap-6 justify-center grayscale opacity-30">
          <div className="text-xs font-black tracking-tighter">MESERET MARE</div>
          <div className="text-xs font-black tracking-tighter text-primary italic">
            FINANCE HUB
          </div>
          <div className="text-xs font-black tracking-tighter">CORE v2</div>
        </div>
      </div>
    </div>
  );
}
