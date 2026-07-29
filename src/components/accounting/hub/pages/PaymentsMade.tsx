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
import { financeStore as store, Payment } from "@/lib/finance-hub-store";
import { Plus, ArrowUpCircle, Wallet } from "lucide-react";
const methods = ["Cash", "Bank Transfer", "Check", "Mobile Money"] as const;
export default function PaymentsMade() {
  const allPayments = store.getPayments();
  const [payments, setPayments] = useState(
    allPayments.filter((p) => p.type === "made"),
  );
  const vendors = store.getVendors();
  const bills = store.getBills();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Payment>>({
    date: new Date().toISOString().split("T")[0],
    method: "Cash",
  });
  const save = async () => {
    const vendor = vendors.find((v) => v.id === form.entityId);
    const entry: Payment = {
      id: `PM-${String(payments.length + 1).padStart(3, "0")}`,
      reference: form.reference || "",
      entityId: form.entityId || "",
      entityName: vendor?.name || "",
      invoiceOrBillId: form.invoiceOrBillId || "",
      amount: Number(form.amount) || 0,
      method: (form.method as Payment["method"]) || "Cash",
      date: form.date || "",
      type: "made",
    };
    await store.savePayment(entry);
    const allUpdated = store.getPayments();
    setPayments(allUpdated.filter((p) => p.type === "made"));
    setOpen(false);
    setForm({ date: new Date().toISOString().split("T")[0], method: "Cash" });
  };
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Payments Made
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Log payments and settlements to vendors
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Record Outgoing Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 tracking-tight">
                <ArrowUpCircle className="w-5 h-5 text-destructive" /> Record
                Vendor Payment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid gap-1.5">
                <Label htmlFor="pay-ref">
                  Payment Reference / Transaction ID
                </Label>
                <Input
                  id="pay-ref"
                  value={form.reference || ""}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  placeholder="e.g. TXN-98765"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Destination Vendor</Label>
                <Select
                  value={form.entityId || ""}
                  onValueChange={(v) => setForm({ ...form, entityId: v })}
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
                <Label>Linked Bill</Label>
                <Select
                  value={form.invoiceOrBillId || ""}
                  onValueChange={(v) =>
                    setForm({ ...form, invoiceOrBillId: v })
                  }
                >
                  <SelectTrigger className="border-slate-200 shadow-sm">
                    <SelectValue placeholder="Optional: Link to bill" />
                  </SelectTrigger>
                  <SelectContent>
                    {bills
                      .filter((b) => b.status !== "Paid")
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.id} - {b.total.toLocaleString()} ETB
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="pay-amt">Amount Paid (ETB)</Label>
                  <Input
                    id="pay-amt"
                    type="number"
                    value={form.amount || ""}
                    onChange={(e) =>
                      setForm({ ...form, amount: +e.target.value })
                    }
                    className="font-bold text-destructive border-slate-200 shadow-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Payment Method</Label>
                  <Select
                    value={form.method || "Cash"}
                    onValueChange={(v) =>
                      setForm({ ...form, method: v as Payment["method"] })
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
                <Label>Date of Payment</Label>
                <Input
                  type="date"
                  value={form.date || ""}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="border-slate-200 shadow-sm"
                />
              </div>
              <Button onClick={save} className="w-full font-bold h-11">
                Register Outgoing Payment
              </Button>
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
                    Reference
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Vendor Name
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24 text-center">
                    Bill ID
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Amount Paid
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-32 border-l border-slate-50/50">
                    Method
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {p.reference}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {p.entityName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {p.invoiceOrBillId || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-600 tracking-tight">
                      - {p.amount.toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4 border-l border-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-600 font-medium">
                          {p.method}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500">
                      {p.date}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400 italic"
                    >
                      No payments made yet
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
