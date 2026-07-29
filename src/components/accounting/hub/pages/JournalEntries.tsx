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
import { financeStore as store, JournalEntry } from "@/lib/finance-hub-store";
import { Plus, BookMarked, ArrowRightLeft } from "lucide-react";
export default function JournalEntries() {
  const accounts = store.getAccounts();
  const [entries, setEntries] = useState(store.getJournalEntries());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split("T")[0],
  });
  const save = async () => {
    const entry: JournalEntry = {
      id: `JE-${String(entries.length + 1).padStart(3, "0")}`,
      date: form.date || "",
      description: form.description || "",
      debitAccount: form.debitAccount || "",
      creditAccount: form.creditAccount || "",
      amount: Number(form.amount) || 0,
    };
    await store.saveJournalEntry(entry);
    const updated = store.getJournalEntries();
    setEntries(updated);
    setOpen(false);
    setForm({ date: new Date().toISOString().split("T")[0] });
  };
  return (
    <div className="p-6 space-y-8 animate-fade-in bg-slate-50/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Journal Entries
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Post manual adjustments and ledger transfers
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold">
              <Plus className="w-4 h-4 mr-2" />
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 tracking-tight">
                <BookMarked className="w-5 h-5 text-primary" /> Create Journal
                Entry
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label>Entry Date</Label>
                  <Input
                    type="date"
                    value={form.date || ""}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="border-slate-200 shadow-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="je-amt">Amount (ETB)</Label>
                  <Input
                    id="je-amt"
                    type="number"
                    value={form.amount || ""}
                    onChange={(e) =>
                      setForm({ ...form, amount: +e.target.value })
                    }
                    className="font-bold border-slate-200 shadow-sm"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="je-desc">Narration / Description</Label>
                <Input
                  id="je-desc"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Enter entry narration..."
                  className="border-slate-200 shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                <div className="grid gap-1.5">
                  <Label className="text-blue-700 font-bold">
                    Debit Account (Dr)
                  </Label>
                  <Select
                    value={form.debitAccount || ""}
                    onValueChange={(v) => setForm({ ...form, debitAccount: v })}
                  >
                    <SelectTrigger className="border-slate-200 shadow-sm bg-white">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.id} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-orange-700 font-bold">
                    Credit Account (Cr)
                  </Label>
                  <Select
                    value={form.creditAccount || ""}
                    onValueChange={(v) =>
                      setForm({ ...form, creditAccount: v })
                    }
                  >
                    <SelectTrigger className="border-slate-200 shadow-sm bg-white">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.id} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={save} className="w-full font-bold h-11">
                Post to General Ledger
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
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-20">
                    JE #
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-24">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Narration
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter w-48">
                    Accounts Impacted
                  </th>
                  <th className="text-right py-3 px-4 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono text-[10px] text-slate-500">
                      {e.id}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-slate-600 font-mono tracking-tighter">
                      {e.date}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-800">
                      {e.description}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 text-[9px] font-bold text-blue-600">
                            Dr
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">
                            {e.debitAccount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-4">
                          <span className="w-4 text-[9px] font-bold text-orange-600">
                            Cr
                          </span>
                          <span className="text-[11px] font-medium text-slate-600">
                            {e.creditAccount}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        <span className="text-sm font-bold text-slate-900">
                          {e.amount.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          ETB
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-slate-400 italic"
                    >
                      No manual journal entries recorded yet
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
