import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building, Plus, ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { BankAccount } from "@/lib/finance-data";
import { toMoneyNumber } from "@/lib/finance-hub-store";

interface BankAccountsModuleProps {
  updatedBankAccounts: BankAccount[];
  financePayments: any[];
  selectedBankView: string | null;
  setSelectedBankView: (bank: string | null) => void;
  onAddBankAccount: (account: { bankName: string; accountNumber: string; initialBalance: string }) => Promise<void>;
}

export function BankAccountsModule({
  updatedBankAccounts,
  financePayments,
  selectedBankView,
  setSelectedBankView,
  onAddBankAccount,
}: BankAccountsModuleProps) {
  const [bankAccountDialog, setBankAccountDialog] = useState(false);
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: "",
    accountNumber: "",
    initialBalance: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedBankTransactions = React.useMemo(() => {
    if (!selectedBankView) return [];
    return financePayments.filter((p) => p.bankName === selectedBankView);
  }, [selectedBankView, financePayments]);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onAddBankAccount(bankAccountForm);
      setBankAccountDialog(false);
      setBankAccountForm({ bankName: "", accountNumber: "", initialBalance: "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {selectedBankView ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBankView(null)}>
              <ArrowDownRight className="h-4 w-4 mr-2 rotate-90" /> Back to all banks
            </Button>
            <Badge variant="outline" className="text-primary font-bold px-3 py-1 text-xs">
              {selectedBankView} Details
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-bold">Total Inflow</p>
                <p className="text-2xl font-bold text-primary font-mono">
                  {formatCurrency(selectedBankTransactions.reduce((s, t) => s + toMoneyNumber(t.amount), 0))}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-200/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-bold">Transactions</p>
                <p className="text-2xl font-bold text-green-600">{selectedBankTransactions.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase font-bold">Latest Entry</p>
                <p className="text-2xl font-bold">
                  {selectedBankTransactions.length > 0
                    ? [...selectedBankTransactions].sort((a, b) => b.date.localeCompare(a.date))[0].date
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Bank Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Sale/Txn Ref</TableHead>
                    <TableHead className="font-bold">Customer / Entity</TableHead>
                    <TableHead className="text-right font-bold">Amount</TableHead>
                    <TableHead className="font-bold">Method</TableHead>
                    <TableHead className="font-bold">Bank Name</TableHead>
                    <TableHead className="font-bold">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBankTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs">{t.date}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{t.reference || "—"}</TableCell>
                      <TableCell className="font-medium text-xs">{t.entityName || "Walk-in Customer"}</TableCell>
                      <TableCell className="text-right font-bold font-mono text-xs text-green-600">
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{t.method}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{t.bankName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground italic max-w-[200px] truncate">
                        {t.note || "POS Sale"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedBankTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">
                        No transactions found for this bank.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground font-medium">Select a bank account below to inspect ledger deposits & transfers</div>
            <Button size="sm" onClick={() => setBankAccountDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Bank Account
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {updatedBankAccounts.map((acc) => (
              <Card
                key={acc.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group border shadow-sm"
                onClick={() => setSelectedBankView(acc.bankName)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors">{acc.bankName}</CardTitle>
                        <CardDescription className="text-xs">Acc: {acc.accountNumber}</CardDescription>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-black text-primary font-mono">{formatCurrency(acc.balance)}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs">
                    <p className="text-muted-foreground text-[11px] italic">Last activity: {acc.lastUpdated || "N/A"}</p>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {financePayments.filter((p) => p.bankName === acc.bankName).length} Txns
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Bank Account Dialog */}
      <Dialog open={bankAccountDialog} onOpenChange={setBankAccountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add New Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Bank Name</Label>
              <Input
                value={bankAccountForm.bankName}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                placeholder="e.g. Commercial Bank of Ethiopia"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Account Number</Label>
              <Input
                value={bankAccountForm.accountNumber}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                placeholder="e.g. 1000123456789"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Initial Balance (ETB)</Label>
              <Input
                type="number"
                value={bankAccountForm.initialBalance}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, initialBalance: e.target.value })}
                placeholder="0.00"
                className="text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBankAccountDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting} className="font-bold">
              {submitting ? "Saving..." : "Save Bank Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
