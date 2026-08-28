import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Landmark, Plus, CreditCard, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { LoanRecord } from "@/lib/finance-data";

interface LoansModuleProps {
  loans: LoanRecord[];
  selectedEntity: "FZ" | "MM";
  canApprove: boolean;
  onAddLoan: (loan: any) => Promise<void>;
  onRecordPayment: (payment: { loanId: string; amount: string; note: string }) => Promise<void>;
}

export function LoansModule({
  loans,
  selectedEntity,
  canApprove,
  onAddLoan,
  onRecordPayment,
}: LoansModuleProps) {
  const [newLoanDialog, setNewLoanDialog] = useState(false);
  const [newLoanForm, setNewLoanForm] = useState({
    bankName: "",
    loanAmount: "",
    interestRate: "",
    monthlyPayment: "",
    startDate: "",
    endDate: "",
  });

  const [loanPayDialog, setLoanPayDialog] = useState(false);
  const [loanPayForm, setLoanPayForm] = useState({
    loanId: "",
    amount: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSaveLoan = async () => {
    if (!newLoanForm.bankName || !newLoanForm.loanAmount) return;
    setSubmitting(true);
    try {
      await onAddLoan(newLoanForm);
      setNewLoanDialog(false);
      setNewLoanForm({
        bankName: "",
        loanAmount: "",
        interestRate: "",
        monthlyPayment: "",
        startDate: "",
        endDate: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePayment = async () => {
    if (!loanPayForm.amount || !loanPayForm.loanId) return;
    setSubmitting(true);
    try {
      await onRecordPayment(loanPayForm);
      setLoanPayDialog(false);
      setLoanPayForm({ loanId: "", amount: "", note: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const entityLoans = loans.filter((l) => !l.entity || l.entity === "MM" || l.entity === selectedEntity);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading">Loans, Credit Facilities & Amortization</h2>
          <p className="text-xs text-muted-foreground">Manage active debt obligations, repayment schedules, and interest for Meseret Mare Solar</p>
        </div>
        <Button size="sm" onClick={() => setNewLoanDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Loan Facility
        </Button>
      </div>

      <div className="space-y-4">
        {entityLoans.map((loan) => {
          const progress = ((loan.loanAmount - loan.remainingBalance) / loan.loanAmount) * 100;
          const isPastDue = loan.status === "past_due";

          return (
            <div key={loan.id} className="relative overflow-hidden rounded-2xl border bg-background p-1 shadow-sm transition-all hover:shadow-md">
              <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${isPastDue ? "from-red-500 to-orange-500" : "from-primary to-secondary"}`} />
              <div className="relative rounded-xl bg-background/80 backdrop-blur-xl p-5 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-3.5 rounded-xl flex items-center justify-center ${isPastDue ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                      <Landmark className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                        {loan.bankName}
                        <Badge variant="outline" className={
                          loan.status === "active" ? "border-green-500/30 text-green-600 bg-green-500/10 text-xs" :
                          loan.status === "past_due" ? "border-red-500/30 text-red-600 bg-red-500/10 animate-pulse text-xs" :
                          "border-slate-500/30 text-slate-600 bg-slate-500/10 text-xs"
                        }>
                          {loan.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center"><CalendarClock className="h-3.5 w-3.5 mr-1" />{loan.startDate} to {loan.endDate}</span>
                        <span>•</span>
                        <span>Interest Rate: <strong className="text-foreground">{loan.interestRate}%</strong></span>
                      </div>
                    </div>
                  </div>

                  {loan.amountDue ? (
                    <div className="text-right bg-red-50/50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                      <p className="text-[10px] font-bold uppercase text-red-600/80 dark:text-red-400 mb-0.5">Amount Due</p>
                      <p className={`text-xl font-black font-mono ${isPastDue ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
                        {formatCurrency(loan.amountDue)}
                      </p>
                      {loan.remark && <p className="text-[11px] font-medium text-red-500 mt-1 max-w-[200px] leading-tight">{loan.remark}</p>}
                    </div>
                  ) : (
                    <div className="text-right p-2">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">Monthly Payment</p>
                      <p className="text-lg font-bold text-primary font-mono">{formatCurrency(loan.monthlyPayment)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Next Due: {loan.nextPaymentDate}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Loan Principal</p>
                    <p className="text-sm font-bold font-mono">{formatCurrency(loan.loanAmount)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Remaining Principal</p>
                    <p className="text-sm font-bold text-warning font-mono">{formatCurrency(loan.remainingBalance)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Accrual Interest</p>
                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                      {loan.remainingAccrualInterest ? formatCurrency(loan.remainingAccrualInterest) : "—"}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Repayment Schedule</p>
                    <p className="text-xs font-bold truncate">{loan.repaymentScheduleDate || loan.nextPaymentDate}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{formatCurrency(loan.monthlyPayment)}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Repayment Progress</span>
                    <span className={`font-bold ${progress >= 100 ? "text-emerald-600" : "text-primary"}`}>{progress.toFixed(1)}% Completed</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full transition-all duration-500 ease-in-out ${isPastDue ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    {(loan.status === "active" || loan.status === "past_due") && canApprove && (
                      <Button
                        size="sm"
                        className={`h-8 font-bold gap-1 text-xs shadow-sm ${isPastDue ? "bg-destructive hover:bg-destructive/90 text-white" : ""}`}
                        onClick={() => {
                          setLoanPayForm({
                            loanId: loan.id,
                            amount: String(loan.amountDue || loan.monthlyPayment),
                            note: "",
                          });
                          setLoanPayDialog(true);
                        }}
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Make Repayment
                      </Button>
                    )}
                    {loan.followUp && (
                      <Badge variant="secondary" className="px-2.5 py-0.5 text-[11px]">
                        Follow up: {loan.followUp}
                      </Badge>
                    )}
                  </div>

                  {loan.payments && loan.payments.length > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground">Last Payment: </span>
                      <span className="font-mono font-bold text-emerald-600">{formatCurrency(loan.payments[0].amount)}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({loan.payments[0].date})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {entityLoans.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p>No active loan facilities found for {selectedEntity}.</p>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={loanPayDialog} onOpenChange={setLoanPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CreditCard className="h-5 w-5 text-primary" /> Record Loan Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter payment details to deduct from loan balance and post repayment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Payment Amount (ETB)</Label>
              <Input
                type="number"
                value={loanPayForm.amount}
                onChange={(e) => setLoanPayForm({ ...loanPayForm, amount: e.target.value })}
                className="font-mono text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Reference / Note</Label>
              <Input
                value={loanPayForm.note}
                onChange={(e) => setLoanPayForm({ ...loanPayForm, note: e.target.value })}
                placeholder="e.g. Monthly installment via CBE transfer"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLoanPayDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={submitting} className="font-bold">
              {submitting ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record New Loan Dialog */}
      <Dialog open={newLoanDialog} onOpenChange={setNewLoanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Record New Loan Facility</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px] font-bold">Bank Name / Lender</Label>
              <Input value={newLoanForm.bankName} onChange={(e) => setNewLoanForm({ ...newLoanForm, bankName: e.target.value })} className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Loan Amount (ETB)</Label>
              <Input type="number" value={newLoanForm.loanAmount} onChange={(e) => setNewLoanForm({ ...newLoanForm, loanAmount: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Interest Rate (%)</Label>
              <Input type="number" value={newLoanForm.interestRate} onChange={(e) => setNewLoanForm({ ...newLoanForm, interestRate: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Monthly Payment (ETB)</Label>
              <Input type="number" value={newLoanForm.monthlyPayment} onChange={(e) => setNewLoanForm({ ...newLoanForm, monthlyPayment: e.target.value })} className="text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Start Date</Label>
              <Input type="date" value={newLoanForm.startDate} onChange={(e) => setNewLoanForm({ ...newLoanForm, startDate: e.target.value })} className="text-xs" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px] font-bold">End Date</Label>
              <Input type="date" value={newLoanForm.endDate} onChange={(e) => setNewLoanForm({ ...newLoanForm, endDate: e.target.value })} className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNewLoanDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSaveLoan} disabled={submitting} className="font-bold">
              {submitting ? "Saving..." : "Save Loan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
