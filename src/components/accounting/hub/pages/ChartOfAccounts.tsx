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
import { financeStore as store, Account } from "@/lib/finance-hub-store";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";

const accountTypes = [
  "Assets",
  "Liabilities",
  "Equity",
  "Revenue",
  "Expenses",
] as const;

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState(store.getAccounts());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<Partial<Account>>({});
  const [filterType, setFilterType] = useState<string>("All");

  const save = () => {
    const entry: Account = {
      id: form.id || `${Date.now()}`,
      name: form.name || "",
      type: (form.type as Account["type"]) || "Assets",
      description: form.description || "",
      openingBalance: Number(form.openingBalance) || 0,
    };
    let updated;
    if (editing) {
      updated = accounts.map((a) => (a.id === editing.id ? entry : a));
    } else {
      updated = [...accounts, entry];
    }
    store.setAccounts(updated);
    setAccounts(updated);
    setOpen(false);
    setEditing(null);
    setForm({});
  };

  const remove = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    store.setAccounts(updated);
    setAccounts(updated);
  };

  const edit = (a: Account) => {
    setEditing(a);
    setForm(a);
    setOpen(true);
  };

  const filtered =
    filterType === "All"
      ? accounts
      : accounts.filter((a) => a.type === filterType);

  const grouped = accountTypes.reduce(
    (acc, type) => {
      acc[type] = filtered.filter((a) => a.type === type);
      return acc;
    },
    {} as Record<string, Account[]>,
  );

  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Chart of Accounts
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Manage your financial account structure
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {accountTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditing(null);
                setForm({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="font-bold">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  {editing ? "Edit" : "New"} Account
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-id">Account ID</Label>
                  <Input
                    id="acc-id"
                    value={form.id || ""}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    placeholder="e.g. 1000"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-name">Account Name</Label>
                  <Input
                    id="acc-name"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Cash"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Account Type</Label>
                  <Select
                    value={form.type || "Assets"}
                    onValueChange={(v) =>
                      setForm({ ...form, type: v as Account["type"] })
                    }
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-desc">Description</Label>
                  <Input
                    id="acc-desc"
                    value={form.description || ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-bal">Opening Balance</Label>
                  <Input
                    id="acc-bal"
                    type="number"
                    value={form.openingBalance || ""}
                    onChange={(e) =>
                      setForm({ ...form, openingBalance: +e.target.value })
                    }
                  />
                </div>
                <Button onClick={save} className="w-full font-bold">
                  Save Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {accountTypes.map((type) => {
          const items = grouped[type];
          if (!items || items.length === 0) return null;
          return (
            <Card key={type} className="border-slate-200 overflow-hidden">
              <CardHeader className="py-2.5 px-4 bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {type}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30">
                      <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        ID
                      </th>
                      <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Description
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                        Balance
                      </th>
                      <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                          {a.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          {a.name}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {a.description}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          {a.openingBalance.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-white hover:text-blue-600 border border-transparent hover:border-blue-100"
                            onClick={() => edit(a)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-white hover:text-destructive border border-transparent hover:border-red-100"
                            onClick={() => remove(a.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
