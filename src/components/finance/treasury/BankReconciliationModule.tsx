import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { BankReconciliationRecord } from "@/lib/finance-data";

interface BankReconciliationModuleProps {
  bankReconciliations: BankReconciliationRecord[];
  selectedEntity: "FZ" | "MM";
  onAddReconciliation: (rec: any) => Promise<void>;
}

export function BankReconciliationModule({
  bankReconciliations,
  selectedEntity,
  onAddReconciliation,
}: BankReconciliationModuleProps) {
  const [bankRecDialog, setBankRecDialog] = useState(false);
  const [bankRecForm, setBankRecForm] = useState({
    bankName: "",
    accountNo: "",
    currency: "ETB",
    reconciliationPeriod: "",
    preparedBy: "",
    reviewedBy: "",
    bankStatementBalance: "",
    depositInTransit: "",
    outstandingCheque: "",
    companyCashBook: "",
    bankCredits: "",
    bankCharges: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onAddReconciliation(bankRecForm);
      setBankRecDialog(false);
      setBankRecForm({
        bankName: "",
        accountNo: "",
        currency: "ETB",
        reconciliationPeriod: "",
        preparedBy: "",
        reviewedBy: "",
        bankStatementBalance: "",
        depositInTransit: "",
        outstandingCheque: "",
        companyCashBook: "",
        bankCredits: "",
        bankCharges: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecs = bankReconciliations.filter((r) => r.entity === selectedEntity);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading">Bank Reconciliation Ledger</h2>
          <p className="text-xs text-muted-foreground">Match company cash books with bank statement records for {selectedEntity}</p>
        </div>
        <Button size="sm" onClick={() => setBankRecDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Reconciliation
        </Button>
      </div>

      {filteredRecs.map((rec) => {
        const adjustedBankBalance = Number(rec.bankStatementBalance || 0) + Number(rec.depositInTransit || 0) - Number(rec.outstandingCheque || 0);
        const adjustedCompanyCash = Number(rec.companyCashBook || 0) + Number(rec.bankCredits || 0) - Number(rec.bankCharges || 0);
        const difference = adjustedBankBalance - adjustedCompanyCash;
        const isBalanced = difference === 0;

        return (
          <Card key={rec.id} className="overflow-hidden shadow-sm border border-border/70">
            <div className={`h-2 w-full ${isBalanced ? "bg-emerald-500" : "bg-destructive"}`} />
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Header Info Left */}
              <div className="p-6 border-b lg:border-b-0 lg:border-r border-border bg-muted/10">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" /> Bank & Account Metadata
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Bank Name:</span>
                    <span className="font-semibold">{rec.bankName}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Account No:</span>
                    <span className="font-mono font-semibold">{rec.accountNo}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground font-medium">Currency:</span>
                    <span className="font-semibold">{rec.currency}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-muted-foreground font-medium">Period:</span>
                    <span className="font-bold text-primary">{rec.reconciliationPeriod}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-2 bg-background p-3.5 rounded-xl border border-border text-xs">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-muted-foreground uppercase font-bold">Prepared By:</span>
                    <span className="font-medium">{rec.preparedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-muted-foreground uppercase font-bold">Reviewed By:</span>
                    <span className="font-medium">{rec.reviewedBy}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground uppercase font-bold">Date:</span>
                    <span className="font-bold">{rec.date}</span>
                  </div>
                </div>
              </div>

              {/* Details Table Right */}
              <div className="p-0">
                <Table>
                  <TableHeader className="bg-primary/5">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Description</TableHead>
                      <TableHead className="text-right font-bold text-xs w-[140px]">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    <TableRow>
                      <TableCell className="text-muted-foreground">Bank Statement Balance</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(rec.bankStatementBalance)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground pl-6">+ Deposit In Transit</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(rec.depositInTransit)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground pl-6">- Outstanding Cheque</TableCell>
                      <TableCell className="text-right font-mono text-destructive">-{formatCurrency(rec.outstandingCheque)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell>Adjusted Bank Balance</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(adjustedBankBalance)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="text-muted-foreground pt-4">Company Cash Book</TableCell>
                      <TableCell className="text-right font-mono font-semibold pt-4">{formatCurrency(rec.companyCashBook)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground pl-6">+ Bank Credits</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(rec.bankCredits)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground pl-6">- Bank Charges</TableCell>
                      <TableCell className="text-right font-mono text-destructive">-{formatCurrency(rec.bankCharges)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell>Adjusted Company Cash</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(adjustedCompanyCash)}</TableCell>
                    </TableRow>

                    <TableRow className={isBalanced ? "bg-emerald-500/10" : "bg-destructive/10"}>
                      <TableCell className="font-black text-sm py-3">Difference</TableCell>
                      <TableCell className={`text-right font-black font-mono text-sm py-3 ${isBalanced ? "text-emerald-600" : "text-destructive"}`}>
                        {formatCurrency(difference)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        );
      })}

      {filteredRecs.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p>No bank reconciliations found for {selectedEntity}.</p>
        </Card>
      )}

      {/* New Reconciliation Dialog */}
      <Dialog open={bankRecDialog} onOpenChange={setBankRecDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Bank Reconciliation</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Bank Name</Label>
              <Input value={bankRecForm.bankName} onChange={(e) => setBankRecForm({ ...bankRecForm, bankName: e.target.value })} className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Account No</Label>
              <Input value={bankRecForm.accountNo} onChange={(e) => setBankRecForm({ ...bankRecForm, accountNo: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Reconciliation Period</Label>
              <Input value={bankRecForm.reconciliationPeriod} onChange={(e) => setBankRecForm({ ...bankRecForm, reconciliationPeriod: e.target.value })} placeholder="e.g. May 2026" className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Bank Statement Balance</Label>
              <Input type="number" value={bankRecForm.bankStatementBalance} onChange={(e) => setBankRecForm({ ...bankRecForm, bankStatementBalance: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Deposit In Transit</Label>
              <Input type="number" value={bankRecForm.depositInTransit} onChange={(e) => setBankRecForm({ ...bankRecForm, depositInTransit: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Outstanding Cheque</Label>
              <Input type="number" value={bankRecForm.outstandingCheque} onChange={(e) => setBankRecForm({ ...bankRecForm, outstandingCheque: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Company Cash Book Balance</Label>
              <Input type="number" value={bankRecForm.companyCashBook} onChange={(e) => setBankRecForm({ ...bankRecForm, companyCashBook: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Bank Credits (Not in CB)</Label>
              <Input type="number" value={bankRecForm.bankCredits} onChange={(e) => setBankRecForm({ ...bankRecForm, bankCredits: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Bank Charges (Not in CB)</Label>
              <Input type="number" value={bankRecForm.bankCharges} onChange={(e) => setBankRecForm({ ...bankRecForm, bankCharges: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Prepared By</Label>
              <Input value={bankRecForm.preparedBy} onChange={(e) => setBankRecForm({ ...bankRecForm, preparedBy: e.target.value })} className="text-xs" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px] font-bold">Reviewed By</Label>
              <Input value={bankRecForm.reviewedBy} onChange={(e) => setBankRecForm({ ...bankRecForm, reviewedBy: e.target.value })} className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBankRecDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting} className="font-bold">
              {submitting ? "Saving..." : "Save Reconciliation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
