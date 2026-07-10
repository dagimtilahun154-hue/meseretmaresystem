import { useMemo, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { formatCurrency } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Printer, Star } from "lucide-react";
import { BEHAVIOR_LABELS } from "@/lib/fieldwork-data";
import { differenceInDays, differenceInCalendarDays, parseISO } from "date-fns";

const PIE_COLORS = ["hsl(28,85%,52%)", "hsl(210,80%,52%)", "hsl(142,60%,40%)", "hsl(270,60%,55%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(180,60%,45%)"];

export default function ReportsPage() {
  const { sales, products, fieldWorks } = useStore();
  const [period, setPeriod] = useState("all");

  const filteredSales = useMemo(() => {
    if (period === "all") return sales;
    const now = new Date();
    return sales.filter((s) => {
      const d = new Date(s.date);
      if (period === "today") return d.toDateString() === now.toDateString();
      if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "year") return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [sales, period]);

  const totalSales = filteredSales.reduce((s, sale) => s + sale.totalSell, 0);
  const totalProfit = filteredSales.reduce((s, sale) => s + sale.profit, 0);
  const totalCost = filteredSales.reduce((s, sale) => s + sale.totalCost, 0);
  const totalVat = filteredSales.reduce((s, sale) => s + sale.vatAmount, 0);

  const salesByDate = useMemo(() => {
    const map: Record<string, { sales: number; profit: number }> = {};
    filteredSales.forEach((s) => {
      if (!map[s.date]) map[s.date] = { sales: 0, profit: 0 };
      map[s.date].sales += s.totalSell;
      map[s.date].profit += s.profit;
    });
    return Object.entries(map).map(([date, v]) => ({ date: date.slice(5), ...v }));
  }, [filteredSales]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => { map[p.category] = (map[p.category] || 0) + p.quantity; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [products]);

  const totalPerDiem = fieldWorks.reduce((s, fw) => {
    const days = Math.max(1, differenceInCalendarDays(parseISO(fw.endDate), parseISO(fw.startDate)) + 1);
    return s + fw.workers.reduce((ws, w) => ws + w.perDiem * days, 0);
  }, 0);
  const totalPayment = fieldWorks.reduce((s, fw) => s + fw.workers.reduce((ws, w) => ws + w.payment, 0), 0);

  const paymentStats = useMemo(() => {
    const groups: Record<string, { count: number; total: number; banks: Record<string, number> }> = {
      Cash: { count: 0, total: 0, banks: {} },
      Bank: { count: 0, total: 0, banks: {} },
      Telebirr: { count: 0, total: 0, banks: {} },
    };
    filteredSales.forEach(s => {
      const m = s.paymentMethod;
      groups[m].count++;
      groups[m].total += s.totalSell;
      if (s.bankName) {
        groups[m].banks[s.bankName] = (groups[m].banks[s.bankName] || 0) + s.totalSell;
      }
    });
    return groups;
  }, [filteredSales]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Reports</h1>
          <p className="text-sm text-muted-foreground">Business performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="fieldwork">Field Work</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(totalSales)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(totalCost)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Profit</p><p className="text-xl font-bold font-heading mt-1 text-success">{formatCurrency(totalProfit)}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Sales & Profit</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Sales Details</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Customer</th>
                      <th className="pb-2 font-medium">Phone</th>
                      <th className="pb-2 font-medium">Location</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="py-3 font-medium text-xs font-mono">{s.id}</td>
                        <td className="py-3 text-xs">{s.date}</td>
                        <td className="py-3 font-medium">{s.customer.name}</td>
                        <td className="py-3 text-xs text-muted-foreground">{s.customer.phone || "—"}</td>
                        <td className="py-3 text-xs text-muted-foreground max-w-[150px] truncate">{s.customer.location || "—"}</td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {s.paymentMethod}{s.bankName ? ` (${s.bankName})` : ""}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-medium">{formatCurrency(s.totalSell)}</td>
                        <td className="py-3 text-right text-success font-medium">{formatCurrency(s.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-6 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["Cash", "Bank", "Telebirr"] as const).map((method) => (
              <Card key={method} className={`border-l-4 ${
                method === "Cash" ? "border-l-green-500" :
                method === "Bank" ? "border-l-blue-500" : "border-l-purple-500"
              }`}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">{method}</p>
                  <p className="text-xl font-bold font-heading mt-1">{formatCurrency(paymentStats[method].total)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{paymentStats[method].count} transaction{paymentStats[method].count !== 1 ? "s" : ""}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bank breakdown */}
          {Object.keys(paymentStats["Bank"].banks).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-heading">Bank Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Bank Name</th>
                        <th className="pb-2 font-medium text-right">Total Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(paymentStats["Bank"].banks).sort((a,b) => b[1]-a[1]).map(([bank, amount]) => (
                        <tr key={bank} className="border-b last:border-0">
                          <td className="py-2 font-medium">{bank}</td>
                          <td className="py-2 text-right text-primary font-bold">{formatCurrency(amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full transaction list by payment */}
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">All Transactions by Method</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Customer</th>
                      <th className="pb-2 font-medium text-center">Method</th>
                      <th className="pb-2 font-medium">Bank</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 font-mono text-xs">{s.id}</td>
                        <td className="py-2 text-xs">{s.date}</td>
                        <td className="py-2 font-medium">{s.customer.name}</td>
                        <td className="py-2 text-center">
                          <Badge variant="outline" className={`text-[10px] ${
                            s.paymentMethod === "Cash" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" :
                            s.paymentMethod === "Bank" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" :
                            "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
                          }`}>{s.paymentMethod}</Badge>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">{s.bankName || "—"}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(s.totalSell)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Inventory by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} fontSize={10}>
                      {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Full Inventory</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium text-center">Qty</th>
                      <th className="pb-2 font-medium text-right">Cost</th>
                      <th className="pb-2 font-medium text-right">Price</th>
                      <th className="pb-2 font-medium text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 text-muted-foreground">{p.category}</td>
                        <td className={`py-2 text-center ${p.quantity === 0 ? "text-destructive" : p.quantity < 5 ? "text-warning" : ""}`}>{p.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(p.costPrice)}</td>
                        <td className="py-2 text-right">{formatCurrency(p.sellPrice)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(p.sellPrice * p.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={5} className="py-2 font-bold text-right">Total Inventory Value</td>
                      <td className="py-2 text-right font-bold text-primary">{formatCurrency(products.reduce((s, p) => s + p.sellPrice * p.quantity, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vat" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total VAT Collected</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(totalVat)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">VAT Payable to Government</p><p className="text-xl font-bold font-heading mt-1 text-destructive">{formatCurrency(totalVat)}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">VAT Transactions</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Customer</th>
                      <th className="pb-2 font-medium text-right">Sale</th>
                      <th className="pb-2 font-medium text-right">VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.filter((s) => s.vatIncluded).map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{s.id}</td>
                        <td className="py-2">{s.date}</td>
                        <td className="py-2">{s.customer.name}</td>
                        <td className="py-2 text-right">{formatCurrency(s.totalSell)}</td>
                        <td className="py-2 text-right text-destructive">{formatCurrency(s.vatAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fieldwork" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Field Works</p><p className="text-xl font-bold font-heading mt-1">{fieldWorks.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-xl font-bold font-heading mt-1 text-success">{fieldWorks.filter((fw) => fw.status === "completed").length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Per Diem</p><p className="text-xl font-bold font-heading mt-1">{totalPerDiem.toLocaleString()} ETB</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Payments</p><p className="text-xl font-bold font-heading mt-1">{totalPayment.toLocaleString()} ETB</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Field Work Activity Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Workers</th>
                      <th className="pb-2 font-medium">Model</th>
                      <th className="pb-2 font-medium">Location</th>
                      <th className="pb-2 font-medium">Duration</th>
                      <th className="pb-2 font-medium text-center">Status</th>
                      <th className="pb-2 font-medium text-center">Returns</th>
                      <th className="pb-2 font-medium text-right">Per Diem</th>
                      <th className="pb-2 font-medium text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldWorks.map((fw) => {
                      const duration = differenceInDays(parseISO(fw.endDate), parseISO(fw.startDate));
                      const fwPerDiem = fw.workers.reduce((s, w) => s + w.perDiem, 0);
                      const fwPayment = fw.workers.reduce((s, w) => s + w.payment, 0);
                      const returnCount = fw.returnForms?.length || 0;
                      return (
                        <tr key={fw.id} className="border-b last:border-0">
                          <td className="py-2 font-medium">{fw.id}</td>
                          <td className="py-2">
                            {fw.workers.map((w, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span>{w.name}</span>
                                <span className="text-xs text-muted-foreground">({w.id})</span>
                                <div className="flex ml-1">
                                  {Array.from({ length: 5 }, (_, si) => (
                                    <Star key={si} className={`h-2.5 w-2.5 ${si < w.behaviorRating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </td>
                          <td className="py-2 text-xs">{fw.pumpModel}</td>
                          <td className="py-2">{fw.location}</td>
                          <td className="py-2">{duration} days<br /><span className="text-xs text-muted-foreground">{fw.startDate} → {fw.endDate}</span></td>
                          <td className="py-2 text-center">
                            <Badge className={fw.status === "completed" ? "bg-success/15 text-success border-success/20" : "bg-warning/15 text-warning border-warning/20"}>
                              {fw.status === "completed" ? "Done" : "Active"}
                            </Badge>
                          </td>
                          <td className="py-2 text-center">
                            {returnCount > 0 ? (
                              <Badge variant="outline">{returnCount} form(s)</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 text-right">{fwPerDiem.toLocaleString()} ETB</td>
                          <td className="py-2 text-right">{fwPayment.toLocaleString()} ETB</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {/* Equipment Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Equipment Usage Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Field Work</th>
                      <th className="pb-2 font-medium">Equipment</th>
                      <th className="pb-2 font-medium text-center">Taken</th>
                      <th className="pb-2 font-medium text-center">Returned</th>
                      <th className="pb-2 font-medium text-center">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldWorks.flatMap((fw) =>
                      fw.equipment.map((eq, i) => (
                        <tr key={`${fw.id}-${i}`} className="border-b last:border-0">
                          {i === 0 && <td className="py-2 font-medium" rowSpan={fw.equipment.length}>{fw.id} — {fw.location}</td>}
                          <td className="py-2">{eq.name}</td>
                          <td className="py-2 text-center">{eq.quantityTaken}</td>
                          <td className="py-2 text-center text-primary">{eq.quantityReturned}</td>
                          <td className="py-2 text-center text-success">{eq.quantityUsed}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
