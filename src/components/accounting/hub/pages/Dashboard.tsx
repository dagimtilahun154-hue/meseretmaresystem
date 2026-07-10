import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { financeStore as store, toMoneyNumber } from "@/lib/finance-hub-store";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

export default function Dashboard() {
  const invoices = store.getInvoices();
  const expenses = store.getExpenses();
  const payments = store.getPayments();

  const totalRevenue = useMemo(
    () => invoices.reduce((s, i) => s + toMoneyNumber(i.total), 0),
    [invoices],
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + toMoneyNumber(e.amount), 0),
    [expenses],
  );
  const totalProfit = totalRevenue - totalExpenses;
  const vatPayable = useMemo(
    () => invoices.reduce((s, i) => s + toMoneyNumber(i.totalVat), 0),
    [invoices],
  );
  const accountsReceivable = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== "Paid")
        .reduce((s, i) => s + toMoneyNumber(i.total), 0),
    [invoices],
  );
  const paymentsReceived = useMemo(
    () =>
      payments
        .filter((p) => p.type === "received")
        .reduce((s, p) => s + toMoneyNumber(p.amount), 0),
    [payments],
  );
  const paymentsMade = useMemo(
    () =>
      payments
        .filter((p) => p.type === "made")
        .reduce((s, p) => s + toMoneyNumber(p.amount), 0),
    [payments],
  );

  const summaryCards = [
    {
      title: "Total Revenue",
      value: totalRevenue,
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Total Expenses",
      value: totalExpenses,
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      title: "Total Profit",
      value: totalProfit,
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      title: "VAT Payable",
      value: vatPayable,
      icon: Calculator,
      color: "text-warning",
    },
    {
      title: "Accounts Receivable",
      value: accountsReceivable,
      icon: ArrowDownCircle,
      color: "text-info",
    },
    {
      title: "Payments Received",
      value: paymentsReceived,
      icon: ArrowUpCircle,
      color: "text-success",
    },
    {
      title: "Cash Balance",
      value: 50000,
      icon: Banknote,
      color: "text-primary",
    },
    {
      title: "Bank Balance",
      value: 250000,
      icon: Building,
      color: "text-info",
    },
  ];

  const monthlyData = [
    { month: "Oct", sales: 65000, expenses: 42000 },
    { month: "Nov", sales: 78000, expenses: 45000 },
    { month: "Dec", sales: 92000, expenses: 51000 },
    { month: "Jan", sales: 85000, expenses: 48000 },
    { month: "Feb", sales: 98000, expenses: 52000 },
    { month: "Mar", sales: totalRevenue, expenses: totalExpenses },
  ];

  const expenseDistribution = [
    { name: "Salaries", value: 45000 },
    { name: "Rent", value: 12000 },
    { name: "Transport", value: 3500 },
    { name: "Utilities", value: 2800 },
    { name: "Other", value: 1500 },
  ];

  const profitTrend = monthlyData.map((m) => ({
    ...m,
    profit: m.sales - m.expenses,
  }));

  const recentTransactions = [
    ...invoices.map((i) => ({
      date: i.date,
      ref: i.id,
      entity: i.customerName,
      amount: i.total,
      status: i.status,
    })),
    ...expenses.map((e) => ({
      date: e.date,
      ref: e.id,
      entity: e.category,
      amount: -e.amount,
      status: "Paid",
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
          Finance Dashboard
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Overview of your financial performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card
            key={card.title}
            className="hover:shadow-md transition-all duration-300 border-slate-200/60 bg-white/80 backdrop-blur-sm group"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-transform group-hover:scale-110 ${card.color}`}
              >
                <card.icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {card.title}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    ETB
                  </span>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {card.value < 0 ? "-" : ""}
                    {Math.abs(card.value).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Monthly Sales vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="sales"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(var(--info))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Expense Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expenseDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  fontSize={11}
                >
                  {expenseDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={profitTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--success))" }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                    Reference
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                    Customer/Supplier
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-2">{t.date}</td>
                    <td className="py-3 px-2 font-mono text-[10px] text-slate-500">
                      {t.ref}
                    </td>
                    <td className="py-3 px-2 font-medium">{t.entity}</td>
                    <td
                      className={`py-3 px-2 text-right font-bold ${t.amount >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {t.amount.toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : t.status === "Sent"
                              ? "bg-blue-100 text-blue-700"
                              : t.status === "Draft"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
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
