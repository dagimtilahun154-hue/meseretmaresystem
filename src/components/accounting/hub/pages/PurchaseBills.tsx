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
import { financeStore as store, Bill, toMoneyNumber } from "@/lib/finance-hub-store";
import { Plus, Trash2, CheckCircle, Receipt } from "lucide-react";
export default function PurchaseBills() {
  const [bills, setBills] = useState(store.getBills());
  const vendors = store.getVendors();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vendorId: "",
    date: new Date().toISOString().split("T")[0],
    items: [{ product: "", quantity: 1, costPrice: 0, total: 0 }],
  });
  const updateItem = (i: number, field: string, value: string | number) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    items[i].total = toMoneyNumber(items[i].quantity) * toMoneyNumber(items[i].costPrice);
    setForm({ ...form, items });
  };
  const save = () => {
    const vendor = vendors.find((v) => v.id === form.vendorId);
    const bill: Bill = {
      id: `BILL-${String(bills.length + 1).padStart(3, "0")}`,
      vendorId: form.vendorId,
      vendorName: vendor?.name || "",
      date: form.date,
      items: form.items,
      total: form.items.reduce((s, i) => s + toMoneyNumber(i.total), 0),
      status: "Pending",
    };
    const updated = [...bills, bill];
    store.setBills(updated);
    setBills(updated);
    setOpen(false);
    setForm({
      vendorId: "",
      date: new Date().toISOString().split("T")[0],
      items: [{ product: "", quantity: 1, costPrice: 0, total: 0 }],
    });
  };
  const markPaid = (id: string) => {
    const u = bills.map((b) =>
      b.id === id ? { ...b, status: "Paid" as const } : b,
    );
    store.setBills(u);
    setBills(u);
  };
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Purchase Bills
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Manage accounts payable and vendor bills
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold">
              <Plus className="w-4 h-4 mr-2" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Record Purchase
                Bill
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="grid gap-1.5">
                  <Label>Vendor / Supplier</Label>
                  <Select
                    value={form.vendorId}
                    onValueChange={(v) => setForm({ ...form, vendorId: v })}
                  >
                    <SelectTrigger className="border-slate-200 shadow-sm">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Bill Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="border-slate-200 shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Purchased Items
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        items: [
                          ...form.items,
                          { product: "", quantity: 1, costPrice: 0, total: 0 },
                        ],
                      })
                    }
                    className="h-8 text-[10px] font-bold uppercase"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                          Product / Expense
                        </th>
                        <th className="text-right py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-20">
                          Qty
                        </th>
                        <th className="text-right py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-28">
                          Cost Price
                        </th>
                        <th className="text-right py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-28">
                          Total
                        </th>
                        <th className="p-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="p-2">
                            <Input
                              value={item.product}
                              onChange={(e) =>
                                updateItem(i, "product", e.target.value)
                              }
                              className="h-8 text-xs border-transparent focus:border-slate-200 bg-transparent hover:bg-slate-50 transition-colors"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(i, "quantity", +e.target.value)
                              }
                              className="h-8 text-xs text-right border-transparent focus:border-slate-200 bg-transparent hover:bg-slate-50 transition-colors"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.costPrice}
                              onChange={(e) =>
                                updateItem(i, "costPrice", +e.target.value)
                              }
                              className="h-8 text-xs text-right border-transparent focus:border-slate-200 bg-transparent hover:bg-slate-50 transition-colors"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800">
                            {item.total.toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  items: form.items.filter(
                                    (_, idx) => idx !== i,
                                  ),
                                })
                              }
                              className="h-7 w-7 p-0 hover:bg-red-50 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 border-t border-slate-100">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 w-full md:w-64 space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-slate-800">Total payable:</span>
                    <span className="text-primary">
                      {form.items
                        .reduce((s, i) => s + toMoneyNumber(i.total), 0)
                        .toLocaleString()}
                      ETB
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="flex-1 md:flex-none font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={save}
                    className="flex-1 md:flex-none font-bold px-8"
                  >
                    Save Bill
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border-slate-200 overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Bill #
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Vendor / Supplier
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-32 text-center">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Amount
                  </th>
                  <th className="text-center py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {b.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {b.vendorName}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-600">
                      {b.date}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      ETB {b.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${b.status === "Paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700 border border-amber-200"}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status !== "Paid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markPaid(b.id)}
                          title="Mark as Paid"
                          className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400 italic font-medium"
                    >
                      No purchase bills recorded yet
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
