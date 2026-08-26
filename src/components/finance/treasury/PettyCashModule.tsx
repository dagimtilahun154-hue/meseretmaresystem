import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Coins, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { PettyCashRecord, PettyCashEntry } from "@/lib/finance-data";
import { toMoneyNumber } from "@/lib/finance-hub-store";

interface PettyCashModuleProps {
  pettyCashRecords: PettyCashRecord[];
  selectedEntity: "FZ" | "MM";
  onAddPettyCash: (record: any) => Promise<void>;
}

export function PettyCashModule({
  pettyCashRecords,
  selectedEntity,
  onAddPettyCash,
}: PettyCashModuleProps) {
  const [pettyCashDialog, setPettyCashDialog] = useState(false);
  const [pettyCashForm, setPettyCashForm] = useState({
    beginningBalance: "",
    chequeNo: "",
    period: "",
    preparedBy: "",
    checkedBy: "",
    approvedBy: "",
    entries: [] as Omit<PettyCashEntry, "id">[],
  });
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    voucherNo: "",
    description: "",
    amount: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const addVoucherEntry = () => {
    if (!newEntry.voucherNo || !newEntry.amount) return;
    setPettyCashForm((prev) => ({
      ...prev,
      entries: [
        ...prev.entries,
        {
          date: newEntry.date,
          voucherNo: newEntry.voucherNo,
          description: newEntry.description,
          amount: Number(newEntry.amount) || 0,
        },
      ],
    }));
    setNewEntry({
      date: new Date().toISOString().slice(0, 10),
      voucherNo: "",
      description: "",
      amount: "",
    });
  };

  const removeVoucherEntry = (idx: number) => {
    setPettyCashForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onAddPettyCash(pettyCashForm);
      setPettyCashDialog(false);
      setPettyCashForm({
        beginningBalance: "",
        chequeNo: "",
        period: "",
        preparedBy: "",
        checkedBy: "",
        approvedBy: "",
        entries: [],
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = pettyCashRecords.filter((r) => r.entity === selectedEntity);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" /> Petty Cash Settlement & Disbursements
          </h2>
          <p className="text-xs text-muted-foreground">Log daily office expenses, field petty cash vouchers, and imprest replenishments</p>
        </div>
        <Button size="sm" onClick={() => setPettyCashDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Settlement
        </Button>
      </div>

      {filteredRecords.map((record) => (
        <Card key={record.id} className="overflow-hidden shadow-sm border border-border/70">
          <div className="bg-primary/5 p-4 border-b border-border">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Beginning Imprest Balance</p>
                <p className="text-xl font-black text-primary font-mono">{formatCurrency(record.beginningBalance)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Cheque / Voucher No.</p>
                <p className="text-sm font-mono font-bold">{record.chequeNo}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Period</p>
                <p className="text-sm font-semibold">{record.period}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Settlement Date</p>
                <p className="text-sm font-mono">{record.date}</p>
              </div>
            </div>
          </div>

          <div className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[50px] text-center font-bold text-xs">#</TableHead>
                  <TableHead className="font-bold text-xs">Date</TableHead>
                  <TableHead className="font-bold text-xs">Voucher No.</TableHead>
                  <TableHead className="font-bold text-xs">Expense Description</TableHead>
                  <TableHead className="text-right font-bold text-xs">Amount</TableHead>
                  <TableHead className="text-right font-bold text-xs w-[160px]">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {record.entries.map((entry, index) => {
                  const totalSpentSoFar = record.entries.slice(0, index + 1).reduce((sum, e) => sum + toMoneyNumber(e.amount), 0);
                  const currentBalance = record.beginningBalance - totalSpentSoFar;

                  return (
                    <TableRow key={entry.id || index} className="hover:bg-muted/20">
                      <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{entry.date}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.voucherNo}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{entry.description}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-destructive">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`font-mono text-xs ${currentBalance < 500 ? "text-red-500 border-red-200" : "text-primary border-primary/20"}`}>
                          {formatCurrency(currentBalance)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableRow className="bg-muted/20 border-t-2">
                  <TableCell colSpan={4} className="text-right font-bold uppercase text-xs text-muted-foreground">
                    Total Disbursed Expenses
                  </TableCell>
                  <TableCell className="text-right font-mono font-black text-sm text-destructive">
                    {formatCurrency(record.entries.reduce((sum, e) => sum + toMoneyNumber(e.amount), 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <p className="text-[9px] font-bold uppercase text-muted-foreground">Remaining Petty Cash</p>
                      <p className="text-base font-black text-primary font-mono">
                        {formatCurrency(toMoneyNumber(record.beginningBalance) - record.entries.reduce((sum, e) => sum + toMoneyNumber(e.amount), 0))}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="bg-muted/5 p-3.5 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="text-center border-r border-border last:border-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Prepared By</p>
              <p className="font-medium mt-0.5">{record.preparedBy}</p>
            </div>
            <div className="text-center border-r border-border last:border-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Checked By</p>
              <p className="font-medium mt-0.5">{record.checkedBy}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Approved By</p>
              <p className="font-semibold text-primary mt-0.5">{record.approvedBy}</p>
            </div>
          </div>
        </Card>
      ))}

      {filteredRecords.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p>No petty cash settlements logged for {selectedEntity}.</p>
        </Card>
      )}

      {/* New Settlement Dialog */}
      <Dialog open={pettyCashDialog} onOpenChange={setPettyCashDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Petty Cash Settlement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Period</Label>
                <Input value={pettyCashForm.period} onChange={(e) => setPettyCashForm({ ...pettyCashForm, period: e.target.value })} placeholder="e.g. Week 1 May 2026" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Cheque No.</Label>
                <Input value={pettyCashForm.chequeNo} onChange={(e) => setPettyCashForm({ ...pettyCashForm, chequeNo: e.target.value })} className="text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Beginning Balance (ETB)</Label>
                <Input type="number" value={pettyCashForm.beginningBalance} onChange={(e) => setPettyCashForm({ ...pettyCashForm, beginningBalance: e.target.value })} className="text-xs font-mono font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Prepared By</Label>
                <Input value={pettyCashForm.preparedBy} onChange={(e) => setPettyCashForm({ ...pettyCashForm, preparedBy: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Checked By</Label>
                <Input value={pettyCashForm.checkedBy} onChange={(e) => setPettyCashForm({ ...pettyCashForm, checkedBy: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Approved By</Label>
                <Input value={pettyCashForm.approvedBy} onChange={(e) => setPettyCashForm({ ...pettyCashForm, approvedBy: e.target.value })} className="text-xs" />
              </div>
            </div>

            {/* Voucher Sub-Entries */}
            <div className="p-3 bg-muted/20 border rounded-xl space-y-3">
              <span className="font-bold text-xs text-primary block">Add Petty Cash Vouchers</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} className="text-xs" />
                <Input placeholder="Voucher #" value={newEntry.voucherNo} onChange={(e) => setNewEntry({ ...newEntry, voucherNo: e.target.value })} className="text-xs font-mono" />
                <Input placeholder="Description" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} className="text-xs" />
                <div className="flex gap-1.5">
                  <Input type="number" placeholder="Amount" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })} className="text-xs font-mono" />
                  <Button type="button" size="sm" onClick={addVoucherEntry} className="shrink-0 h-9">
                    Add
                  </Button>
                </div>
              </div>

              {pettyCashForm.entries.length > 0 && (
                <div className="space-y-1 pt-2">
                  {pettyCashForm.entries.map((ent, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-card p-2 rounded border text-xs">
                      <span>{ent.date} · #{ent.voucherNo} ({ent.description})</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-destructive">{formatCurrency(ent.amount)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeVoucherEntry(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPettyCashDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting} className="font-bold">
              {submitting ? "Saving..." : "Save Settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
