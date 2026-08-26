import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart3, Plus, Calendar, Clock, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { BudgetRecord } from "@/lib/finance-data";
import { toMoneyNumber } from "@/lib/finance-hub-store";

interface BudgetModuleProps {
  budgets: BudgetRecord[];
  selectedEntity: "FZ" | "MM";
  onAddBudget: (record: any) => Promise<void>;
}

export function BudgetModule({
  budgets,
  selectedEntity,
  onAddBudget,
}: BudgetModuleProps) {
  const [budgetDialog, setBudgetDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    type: "monthly" as BudgetRecord["type"],
    amount: "",
    label: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!budgetForm.amount || !budgetForm.label) return;
    setSubmitting(true);
    try {
      await onAddBudget({
        ...budgetForm,
        amount: Number(budgetForm.amount) || 0,
      });
      setBudgetDialog(false);
      setBudgetForm({ type: "monthly", amount: "", label: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const entityBudgets = budgets.filter((b) => !b.entity || b.entity === selectedEntity);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading">Budget Allocations & Cost Ceilings</h2>
          <p className="text-xs text-muted-foreground">Track daily, monthly, and annual expenditure budgets for {selectedEntity}</p>
        </div>
        <Button size="sm" onClick={() => setBudgetDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Budget Allocation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["daily", "monthly", "yearly"] as const).map((type) => {
          const typeBudgets = entityBudgets.filter((b) => b.type === type);
          const total = typeBudgets.reduce((s, b) => s + toMoneyNumber(b.amount), 0);

          return (
            <Card key={type} className="overflow-hidden border border-border/70 shadow-sm">
              <div className={`h-1.5 w-full ${type === "daily" ? "bg-blue-500" : type === "monthly" ? "bg-purple-500" : "bg-amber-500"}`} />
              <CardHeader className="pb-2 bg-muted/10">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
                  <span>{type} Budget</span>
                  {type === "daily" && <Clock className="h-4 w-4" />}
                  {type === "monthly" && <Calendar className="h-4 w-4" />}
                  {type === "yearly" && <CalendarClock className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-2xl font-black font-mono">{formatCurrency(total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{typeBudgets.length} active allocation items</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border border-border/70 shadow-sm overflow-hidden">
        <div className="bg-muted/20 p-3.5 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-bold text-xs flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Active Departmental & Project Allocations
          </h3>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="font-bold text-xs">Label / Description</TableHead>
                <TableHead className="font-bold text-xs">Period Type</TableHead>
                <TableHead className="text-right font-bold text-xs">Cap Amount</TableHead>
                <TableHead className="font-bold text-xs">Date Configured</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {entityBudgets.map((b) => (
                <TableRow key={b.id} className="hover:bg-muted/10">
                  <TableCell className="font-semibold">{b.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                      {b.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(b.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{b.date}</TableCell>
                </TableRow>
              ))}
              {entityBudgets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No budget allocations configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Budget Dialog */}
      <Dialog open={budgetDialog} onOpenChange={setBudgetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Budget Allocation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Period Type</Label>
              <Select value={budgetForm.type} onValueChange={(v) => setBudgetForm({ ...budgetForm, type: v as BudgetRecord["type"] })}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Operational Limit</SelectItem>
                  <SelectItem value="monthly">Monthly Allocation</SelectItem>
                  <SelectItem value="yearly">Yearly Capital Budget</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Label / Cost Center</Label>
              <Input value={budgetForm.label} onChange={(e) => setBudgetForm({ ...budgetForm, label: e.target.value })} placeholder="e.g. Fieldwork Fuel & Vehicle Maintenance" className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Amount (ETB)</Label>
              <Input type="number" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} className="text-xs font-mono font-bold" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBudgetDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting} className="font-bold">
              {submitting ? "Saving..." : "Add Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
