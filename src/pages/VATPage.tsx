import { useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { formatCurrency, VAT_RATE } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, TrendingUp, DollarSign } from "lucide-react";

export default function VATPage() {
  const { sales } = useStore();

  const vatSales = useMemo(() => sales.filter((s) => s.vatIncluded), [sales]);
  const totalSalesWithVat = vatSales.reduce((s, sale) => s + sale.totalSell, 0);
  const totalVatCollected = vatSales.reduce((s, sale) => s + sale.vatAmount, 0);

  const byMonth = useMemo(() => {
    const map: Record<string, { sales: number; vat: number }> = {};
    vatSales.forEach((s) => {
      const month = s.date.slice(0, 7);
      if (!map[month]) map[month] = { sales: 0, vat: 0 };
      map[month].sales += s.totalSell;
      map[month].vat += s.vatAmount;
    });
    return Object.entries(map).map(([month, v]) => ({ month, ...v }));
  }, [vatSales]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-heading">VAT History</h1>
        <p className="text-sm text-muted-foreground">Track VAT payments and tax obligations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-gradient-sales border-0 text-primary-foreground">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 opacity-30" />
            <div>
              <p className="text-xs opacity-80">Total Sales (with VAT)</p>
              <p className="text-xl font-bold font-heading">{formatCurrency(totalSalesWithVat)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-gradient-products border-0 text-primary-foreground">
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-8 w-8 opacity-30" />
            <div>
              <p className="text-xs opacity-80">VAT Collected (15%)</p>
              <p className="text-xl font-bold font-heading">{formatCurrency(totalVatCollected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-gradient-vat border-0 text-primary-foreground">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 opacity-30" />
            <div>
              <p className="text-xs opacity-80">VAT Payable</p>
              <p className="text-xl font-bold font-heading">{formatCurrency(totalVatCollected)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base font-heading">VAT Breakdown by Month</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium text-right">Total Sales</th>
                  <th className="pb-2 font-medium text-right">VAT Collected</th>
                  <th className="pb-2 font-medium text-right">VAT Payable</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map((row) => (
                  <tr key={row.month} className="border-b last:border-0">
                    <td className="py-3 font-medium">{row.month}</td>
                    <td className="py-3 text-right">{formatCurrency(row.sales)}</td>
                    <td className="py-3 text-right">{formatCurrency(row.vat)}</td>
                    <td className="py-3 text-right font-medium text-destructive">{formatCurrency(row.vat)}</td>
                  </tr>
                ))}
                {byMonth.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No VAT transactions recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base font-heading">VAT Transaction Details</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Sale ID</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium text-right">Sale Amount</th>
                  <th className="pb-2 font-medium text-right">VAT (15%)</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {vatSales.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{s.id}</td>
                    <td className="py-3">{s.date}</td>
                    <td className="py-3">{s.customer.name}</td>
                    <td className="py-3 text-right">{formatCurrency(s.totalSell)}</td>
                    <td className="py-3 text-right">{formatCurrency(s.vatAmount)}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(s.totalSell + s.vatAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
