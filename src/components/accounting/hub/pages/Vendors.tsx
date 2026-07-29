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
import { financeStore as store, Vendor } from "@/lib/finance-hub-store";
import { Plus, Pencil, Trash2, Search, Truck } from "lucide-react";
export default function Vendors() {
  const [vendors, setVendors] = useState(store.getVendors());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<Partial<Vendor>>({});
  const [search, setSearch] = useState("");
  const save = async () => {
    const entry: Vendor = {
      id: form.id || `V${String(vendors.length + 1).padStart(3, "0")}`,
      name: form.name || "",
      phone: form.phone || "",
      address: form.address || "",
      tin: form.tin || "",
      balance: Number(form.balance) || 0,
    };
    await store.saveVendor(entry);
    const updated = store.getVendors();
    setVendors(updated);
    setOpen(false);
    setEditing(null);
    setForm({});
  };
  const remove = async (id: string) => {
    await store.deleteVendor(id);
    const u = store.getVendors();
    setVendors(u);
  };
  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Vendors
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Manage your supplier and vendor records
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
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                {editing ? "Edit" : "New"} Vendor
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid gap-1.5">
                <Label htmlFor="vend-id">Vendor ID</Label>
                <Input
                  id="vend-id"
                  value={form.id || ""}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  disabled={!!editing}
                  placeholder="e.g. V001"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vend-name">Vendor Name</Label>
                <Input
                  id="vend-name"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vend-phone">Phone Number</Label>
                <Input
                  id="vend-phone"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vend-addr">Office Address</Label>
                <Input
                  id="vend-addr"
                  value={form.address || ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vend-tin">TIN Number</Label>
                <Input
                  id="vend-tin"
                  value={form.tin || ""}
                  onChange={(e) => setForm({ ...form, tin: e.target.value })}
                />
              </div>
              <Button onClick={save} className="w-full font-bold">
                Save Vendor Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search vendors..."
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
                    Phone
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Address
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    TIN
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter text-right font-medium text-muted-foreground">
                    Balance
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {v.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {v.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {v.phone}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {v.address}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {v.tin}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      ETB {v.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-white hover:text-blue-600 border border-transparent hover:border-blue-100"
                        onClick={() => {
                          setEditing(v);
                          setForm(v);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-white hover:text-destructive border border-transparent hover:border-red-100"
                        onClick={() => remove(v.id)}
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
