import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileText, Check } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { PayrollWorker } from "@/lib/finance-data";
import { downloadCSV, generatePayrollExport } from "@/lib/export-utils";

interface PayrollModuleProps {
  payrollWorkers: PayrollWorker[];
  canApprove: boolean;
  onMarkPaid: (workerId: string, entryId: string) => void;
}

export function PayrollModule({
  payrollWorkers,
  canApprove,
  onMarkPaid,
}: PayrollModuleProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Payroll, Pension & Compensation Management
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Calculated strictly according to Ethiopian income tax tiers + mandatory 7% Employee / 11% Employer Pension contributions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadCSV("payroll_export.csv", generatePayrollExport(payrollWorkers))}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Export Bank Salary CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-bold text-xs">Worker Name</TableHead>
                <TableHead className="font-bold text-xs">Payroll Month</TableHead>
                <TableHead className="text-right font-bold text-xs">Gross Salary</TableHead>
                <TableHead className="text-right font-bold text-xs">Income Tax</TableHead>
                <TableHead className="text-right font-bold text-xs">Emp. Pension (7%)</TableHead>
                <TableHead className="text-right font-bold text-xs">Empr. Pension (11%)</TableHead>
                <TableHead className="text-right font-bold text-xs">Net Take-Home</TableHead>
                <TableHead className="font-bold text-xs text-center">Status</TableHead>
                {canApprove && <TableHead className="text-right font-bold text-xs">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {payrollWorkers.flatMap((w) =>
                w.history.map((h) => (
                  <TableRow key={h.id} className="hover:bg-muted/20">
                    <TableCell className="font-semibold text-foreground">{w.name}</TableCell>
                    <TableCell className="text-muted-foreground">{h.month}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCurrency(h.grossSalary)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{formatCurrency(h.incomeTax)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{formatCurrency(h.employeePension)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(h.employerPension)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600">{formatCurrency(h.netSalary)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={h.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}>
                        {h.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    {canApprove && (
                      <TableCell className="text-right">
                        {h.status === "pending" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => onMarkPaid(w.id, h.id)}>
                            <Check className="h-3.5 w-3.5 mr-1" /> Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {payrollWorkers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No payroll rosters found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
