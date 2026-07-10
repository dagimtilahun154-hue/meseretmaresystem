import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { financeStore as store, Customer } from "@/lib/finance-hub-store";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
export default function Customers() {
  const [customers, setCustomers] = useState(store.getCustomers());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [search, setSearch] = useState("");
  const save = () => {
    const entry: Customer = {
      id: form.id || `C${String(customers.length + 1).padStart(3, "0")}`,
      name: form.name || "",
      phone: form.phone || "",
      email: form.email || "",
      address: form.address || "",
      tin: form.tin || "",
      creditLimit: Number(form.creditLimit) || 0,
      balance: Number(form.balance) || 0,
    };
    let updated;
    if (editing) {
      updated = customers.map((c) => (c.id === editing.id ? entry : c));
    } else {
      updated = [...customers, entry];
    }
    store.setCustomers(updated);
    setCustomers(updated);
    setOpen(false);
    setEditing(null);
    setForm({});
  };
  const remove = (id: string) => {
    const updated = customers.filter((c) => c.id !== id);
    store.setCustomers(updated);
    setCustomers(updated);
  };
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Manage your customer database
          </p>
        </div>
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
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {editing ? "Edit" : "New"} Customer
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cust-id">Customer ID</Label>
                <Input
                  id="cust-id"
                  value={form.id || ""}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  disabled={!!editing}
                  placeholder="e.g. C001"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-name">Full Name</Label>
                <Input
                  id="cust-name"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-phone">Phone Number</Label>
                <Input
                  id="cust-phone"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+251..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-email">Email Address</Label>
                <Input
                  id="cust-email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="cust-addr">Physical Address</Label>
                <Input
                  id="cust-addr"
                  value={form.address || ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-tin">TIN Number</Label>
                <Input
                  id="cust-tin"
                  value={form.tin || ""}
                  onChange={(e) => setForm({ ...form, tin: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-limit">Credit Limit (ETB)</Label>
                <Input
                  id="cust-limit"
                  type="number"
                  value={form.creditLimit || ""}
                  onChange={(e) =>
                    setForm({ ...form, creditLimit: +e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 pt-2">
                <Button onClick={save} className="w-full font-bold">
                  Save Customer Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search customers..."
            className="pl-9 border-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <Card className="border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter font-medium text-muted-foreground">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    TIN
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Limit
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
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {c.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {c.name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-slate-600">
                        {c.phone}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {c.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {c.tin}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-600">
                      {c.creditLimit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      ETB {c.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-white hover:text-blue-600 border border-transparent hover:border-blue-100"
                        onClick={() => {
                          setEditing(c);
                          setForm(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-white hover:text-destructive border border-transparent hover:border-red-100"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
