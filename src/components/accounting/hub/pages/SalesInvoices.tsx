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
import {
  financeStore as store,
  Invoice,
  InvoiceItem,
  toMoneyNumber,
} from "@/lib/finance-hub-store";
import { Plus, Trash2, CheckCircle, Search, FileText } from "lucide-react";
const VAT_RATE = 0.15;
export default function SalesInvoices() {
  const [invoices, setInvoices] = useState(store.getInvoices());
  const customers = store.getCustomers();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    items: [
      { product: "", quantity: 1, unitPrice: 0, discount: 0, tax: 0, total: 0 },
    ] as InvoiceItem[],
  });
  const calcItem = (item: InvoiceItem): InvoiceItem => {
    const subtotal = toMoneyNumber(item.quantity) * toMoneyNumber(item.unitPrice) - toMoneyNumber(item.discount);
    const tax = subtotal * VAT_RATE;
    return { ...item, tax, total: subtotal + tax };
  };
  const updateItem = (i: number, field: string, value: string | number) => {
    const items = [...form.items];
    items[i] = calcItem({ ...items[i], [field]: value });
    setForm({ ...form, items });
  };
  const addItem = () =>
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          product: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          tax: 0,
          total: 0,
        },
      ],
    });
  const removeItem = (i: number) =>
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const save = async () => {
    const customer = customers.find((c) => c.id === form.customerId);
    const items = form.items.map(calcItem);
    const subtotal = items.reduce(
      (s, i) => s + toMoneyNumber(i.quantity) * toMoneyNumber(i.unitPrice) - toMoneyNumber(i.discount),
      0,
    );
    const totalVat = items.reduce((s, i) => s + toMoneyNumber(i.tax), 0);
    const invoice: Invoice = {
      id: `INV-${String(invoices.length + 1).padStart(3, "0")}`,
      customerId: form.customerId,
      customerName: customer?.name || "",
      date: form.date,
      dueDate: form.dueDate,
      items,
      subtotal,
      totalVat,
      total: subtotal + totalVat,
      status: "Draft",
    };
    await store.saveInvoice(invoice);
    const updated = store.getInvoices();
    setInvoices(updated);
    setOpen(false);
    setForm({
      customerId: "",
      date: new Date().toISOString().split("T")[0],
      dueDate: "",
      items: [
        {
          product: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          tax: 0,
          total: 0,
        },
      ],
    });
  };
  const markPaid = async (id: string) => {
    const target = invoices.find((i) => i.id === id);
    if (!target) return;
    const updatedInvoice = { ...target, status: "Paid" as const };
    await store.saveInvoice(updatedInvoice);
    const updated = store.getInvoices();
    setInvoices(updated);
  };
  const filtered = invoices.filter(
    (i) =>
      i.customerName.toLowerCase().includes(search.toLowerCase()) ||
      i.id.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Sales Invoices
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Manage your billing and receivables
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 tracking-tight">
                <FileText className="w-5 h-5 text-primary" /> Create Sales
                Invoice
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="grid gap-1.5">
                  <Label>Customer</Label>
                  <Select
                    value={form.customerId}
                    onValueChange={(v) => setForm({ ...form, customerId: v })}
                  >
                    <SelectTrigger className="border-slate-200 shadow-sm">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="border-slate-200 shadow-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    className="border-slate-200 shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Line Items
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addItem}
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
                          Product / Service
                        </th>
                        <th className="text-right py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-20">
                          Qty
                        </th>
                        <th className="text-right py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-28">
                          Price
                        </th>
                        <th className="text-right py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-24">
                          Discount
                        </th>
                        <th className="text-right py-2.5 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-24">
                          VAT (15%)
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
                              placeholder="Enter details..."
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
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItem(i, "unitPrice", +e.target.value)
                              }
                              className="h-8 text-xs text-right border-transparent focus:border-slate-200 bg-transparent hover:bg-slate-50 transition-colors"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) =>
                                updateItem(i, "discount", +e.target.value)
                              }
                              className="h-8 text-xs text-right border-transparent focus:border-slate-200 bg-transparent hover:bg-slate-50 transition-colors"
                            />
                          </td>
                          <td className="p-2 text-right text-[11px] font-medium text-slate-500">
                            {item.tax.toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800">
                            {item.total.toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(i)}
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
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-700">
                      {form.items
                        .reduce(
                          (s, i) => s + i.quantity * i.unitPrice - i.discount,
                          0,
                        )
                        .toLocaleString()}
                      ETB
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>VAT (15%):</span>
                    <span className="font-bold text-slate-700">
                      {form.items
                        .reduce((s, i) => s + i.tax, 0)
                        .toLocaleString()}
                      ETB
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                    <span className="text-slate-800">Total:</span>
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
                    Discard
                  </Button>
                  <Button
                    onClick={save}
                    className="flex-1 md:flex-none font-bold px-8"
                  >
                    Create Invoice
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Find by invoice # or customer..."
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
                    Invoice #
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Customer Name
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-32 text-center">
                    Dates
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Amount Due
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
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {inv.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {inv.customerName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[10px] text-slate-500">
                        Issued: {inv.date}
                      </div>
                      <div className="text-[10px] font-bold text-orange-600">
                        Due: {inv.dueDate}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      ETB {inv.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${inv.status === "Paid" ? "bg-green-100 text-green-700" : inv.status === "Sent" ? "bg-blue-100 text-blue-700" : inv.status === "Overdue" ? "bg-red-100 text-red-700 border border-red-200" : "bg-slate-100 text-slate-600"}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.status !== "Paid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markPaid(inv.id)}
                          title="Mark as Paid"
                          className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
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
