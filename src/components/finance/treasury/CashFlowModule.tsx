import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownRight, Plus, FileText, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { CashFlowEntry } from "@/lib/finance-data";
import { downloadCSV, generateCashFlowExport } from "@/lib/export-utils";

interface CashFlowModuleProps {
  allCashFlow: CashFlowEntry[];
  cfIncome: number;
  cfExpense: number;
  canApprove: boolean;
  onAddEntry: (entry: { type: "income" | "expense"; category: string; amount: string; description: string }) => Promise<void>;
  onApproveEntry: (id: string) => Promise<void>;
}

export function CashFlowModule({
  allCashFlow,
  cfIncome,
  cfExpense,
  canApprove,
  onAddEntry,
  onApproveEntry,
}: CashFlowModuleProps) {
  const [cfDialog, setCfDialog] = useState(false);
  const [cfForm, setCfForm] = useState({
    type: "income" as "income" | "expense",
    category: "",
    amount: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onAddEntry(cfForm);
      setCfDialog(false);
      setCfForm({ type: "income", category: "", amount: "", description: "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="grid grid-cols-2 gap-3 flex-1 w-full sm:w-auto">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Total Income</p>
                <p className="text-lg font-black text-emerald-600 font-mono">{formatCurrency(cfIncome)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800/40 bg-destructive/5">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Total Expense</p>
                <p className="text-lg font-black text-destructive font-mono">{formatCurrency(cfExpense)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-2 self-end sm:self-center">
          <Button variant="outline" size="sm" onClick={() => downloadCSV("cashflow_export.csv", generateCashFlowExport(allCashFlow))}>
            <FileText className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => { setCfForm({ type: "income", category: "", amount: "", description: "" }); setCfDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="font-bold">Description</TableHead>
                <TableHead className="text-right font-bold">Amount</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCashFlow.map((cf) => (
                <TableRow key={cf.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs font-medium">{cf.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cf.type === "income" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-destructive/10 text-destructive border-destructive/30"}>
                      {cf.type === "income" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}{cf.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{cf.category}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{cf.description}</TableCell>
                  <TableCell className={`text-right font-mono font-bold text-xs ${cf.type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                    {cf.type === "income" ? "+" : "-"}{formatCurrency(cf.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cf.status === "pending" ? "bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px]" : "bg-green-100 text-green-700 border-green-200 text-[10px]"}>
                      {cf.status || "approved"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {cf.status === "pending" && canApprove && (
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white border-0" onClick={() => onApproveEntry(cf.id)}>
                        Approve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {allCashFlow.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No cash flow entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={cfDialog} onOpenChange={setCfDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Cash Flow Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Type</Label>
              <Select value={cfForm.type} onValueChange={(v) => setCfForm({ ...cfForm, type: v as "income" | "expense" })}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income (Inflow)</SelectItem>
                  <SelectItem value="expense">Expense (Outflow)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Category</Label>
              <Input value={cfForm.category} onChange={(e) => setCfForm({ ...cfForm, category: e.target.value })} placeholder="Sales, Payroll, Equipment, Fuel..." className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Amount (ETB)</Label>
              <Input type="number" value={cfForm.amount} onChange={(e) => setCfForm({ ...cfForm, amount: e.target.value })} className="text-xs font-mono font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description / Reference Note</Label>
              <Textarea value={cfForm.description} onChange={(e) => setCfForm({ ...cfForm, description: e.target.value })} className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCfDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="font-bold">
              {submitting ? "Saving..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
