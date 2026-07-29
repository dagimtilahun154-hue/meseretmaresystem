import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { financeStore as store, Expense, toMoneyNumber } from "@/lib/finance-hub-store";
import { Plus, Trash2, Wallet, TrendingDown } from "lucide-react";
const categories = [
  "Salaries",
  "Rent",
  "Utilities",
  "Transport",
  "Office Supplies",
  "Marketing",
  "Maintenance",
  "Other",
];
const methods = ["Cash", "Bank Transfer", "Check", "Mobile Money"] as const;
export default function Expenses() {
  const [expenses, setExpenses] = useState(store.getExpenses());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Expense>>({
    date: new Date().toISOString().split("T")[0],
    method: "Cash",
    category: "Other",
  });
  const save = async () => {
    const entry: Expense = {
      id: `EXP-${String(expenses.length + 1).padStart(3, "0")}`,
      category: form.category || "Other",
      description: form.description || "",
      amount: toMoneyNumber(form.amount),
      date: form.date || "",
      method: (form.method as Expense["method"]) || "Cash",
    };
    await store.saveExpense(entry);
    const updated = store.getExpenses();
    setExpenses(updated);
    setOpen(false);
    setForm({
      date: new Date().toISOString().split("T")[0],
      method: "Cash",
      category: "Other",
    });
  };
  const remove = async (id: string) => {
    await store.deleteExpense(id);
    const u = store.getExpenses();
    setExpenses(u);
  };
  const total = expenses.reduce((s, e) => s + toMoneyNumber(e.amount), 0);
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Expenses
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Log and categorize business expenditures
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Add New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-destructive" /> Record
                Business Expense
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid gap-1.5">
                <Label>Expense Category</Label>
                <Select
                  value={form.category || "Other"}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="border-slate-200 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="exp-desc">Description / Reference</Label>
                <Input
                  id="exp-desc"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="What was this for?"
                  className="border-slate-200 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="exp-amt">Amount (ETB)</Label>
                  <Input
                    id="exp-amt"
                    type="number"
                    value={form.amount || ""}
                    onChange={(e) =>
                      setForm({ ...form, amount: +e.target.value })
                    }
                    className="font-bold border-slate-200 shadow-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Payment Method</Label>
                  <Select
                    value={form.method || "Cash"}
                    onValueChange={(v) =>
                      setForm({ ...form, method: v as Expense["method"] })
                    }
                  >
                    <SelectTrigger className="border-slate-200 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Date of Expense</Label>
                <Input
                  type="date"
                  value={form.date || ""}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="border-slate-200 shadow-sm"
                />
              </div>
              <Button onClick={save} className="w-full font-bold h-11">
                Register Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden md:col-span-1">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Expenditures
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {total.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-slate-400 mb-1">ETB</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">
              * Sum of all recorded expense entries
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-20">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Description
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Amount
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-32 border-l border-slate-50/50">
                    Method
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-16"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {e.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">
                      {e.description}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-600 tracking-tight">
                      - {e.amount.toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-slate-500 font-mono italic">
                      {e.date}
                    </td>
                    <td className="py-3 px-4 border-l border-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {e.method}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(e.id)}
                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400 italic"
                    >
                      No business expenses recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
