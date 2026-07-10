import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { financeStore as store, toMoneyNumber } from "@/lib/finance-hub-store";
import {
  Calculator,
  ArrowUpCircle,
  ArrowDownCircle,
  PieChart,
} from "lucide-react";
export default function VatManagement() {
  const invoices = store.getInvoices();
  const bills = store.getBills();
  const vatCollected = invoices.reduce((s, i) => s + toMoneyNumber(i.totalVat), 0);
  const vatPaid = bills.reduce((s, b) => s + toMoneyNumber(b.total) * 0.15, 0);
  const vatPayable = vatCollected - vatPaid;
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            VAT Management
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Compliance tracking for value-added tax
          </p>
        </div>
        <div className="bg-white border px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Standard Rate:
          </span>
          <span className="text-sm font-bold text-primary">15%</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center border border-green-100 shadow-sm">
              <ArrowDownCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                VAT Collected
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {vatCollected.toLocaleString()}
                <span className="text-xs font-medium text-slate-400">ETB</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
              <ArrowUpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                VAT Paid
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {vatPaid.toLocaleString()}
                <span className="text-xs font-medium text-slate-400">ETB</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow bg-slate-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Net Liability
              </p>
              <p className="text-2xl font-bold text-primary">
                {vatPayable.toLocaleString()}
                <span className="text-xs font-medium text-primary/60">ETB</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200 overflow-hidden shadow-sm">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="w-4 h-4" /> VAT Breakdown from Sales
          </CardTitle>
          <div className="text-[10px] font-medium text-slate-400 italic">
            Sorted by Date (Recent)
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Receipt / INV
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Customer Name
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Subtotal (Excl. VAT)
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-32 bg-primary/5 text-primary border-x border-primary/10">
                    VAT Amount (15%)
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Grand Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {i.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {i.customerName}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {i.date}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      {i.subtotal.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary bg-primary/5 border-x border-primary/10">
                      {i.totalVat.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {i.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400 italic"
                    >
                      No VAT-applicable transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-[10px] text-slate-400 text-center uppercase tracking-[0.2em] font-medium pt-4">
        Official Solarflow Accounting Compliance Module
      </p>
    </div>
  );
}
