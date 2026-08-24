import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DollarSign, Users, Download, Send, FileText, Printer, Search,
  ShieldCheck, Building, Wallet, CheckCircle2, Clock, Eye
} from "lucide-react";
import { hrDB } from "@/lib/db-service";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { format } from "date-fns";
import { apiClient } from "@/lib/api/client";
import { useNavigate } from "react-router-dom";

// Ethiopian Standard Progressive PAYE Tax Bracket Calculation
export function calculateEthiopianPAYE(taxableIncome: number): number {
  if (taxableIncome <= 600) return 0;
  if (taxableIncome <= 1650) return taxableIncome * 0.10 - 60;
  if (taxableIncome <= 3200) return taxableIncome * 0.15 - 142.5;
  if (taxableIncome <= 5250) return taxableIncome * 0.20 - 302.5;
  if (taxableIncome <= 7800) return taxableIncome * 0.25 - 565;
  if (taxableIncome <= 10900) return taxableIncome * 0.30 - 955;
  return taxableIncome * 0.35 - 1500;
}

export default function Payroll() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<any[]>([]);
  const [hierarchyRequests, setHierarchyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(format(new Date(), "MMMM yyyy"));
  const [selectedPaySlip, setSelectedPaySlip] = useState<any | null>(null);
  const [paySlipOpen, setPaySlipOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workersData, reqsData] = await Promise.all([
        hrDB.getWorkers(),
        apiClient.get("/hierarchy/requests").then((r) => r.data).catch(() => []),
      ]);

      const activeWorkers = (workersData || []).filter((w: any) => (w.status || "Active") === "Active");
      setWorkers(activeWorkers);
      setHierarchyRequests(Array.isArray(reqsData) ? reqsData : []);
    } catch (e) {
      console.error("Failed to load payroll data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Payroll Calculation Model with Live Finance Payment Status
  const payrollRows = useMemo(() => {
    return workers.map((w) => {
      const salary = Number(w.baseSalary || w.base_salary || 0);

      // Deductions strictly: PAYE Tax + 7% Pension
      const payeTax = Math.max(0, calculateEthiopianPAYE(salary));
      const employeePension = salary * 0.07; // 7% Employee Pension
      const totalDeductions = payeTax + employeePension;
      const payableAmount = Math.max(0, salary - totalDeductions);

      // Check for batch or individual request submitted to Finance for this period
      const matchingBatchReq = hierarchyRequests.find(
        (r: any) =>
          r.type === "PAYROLL_DISBURSEMENT" &&
          (r.details?.payrollMonth === payrollMonth || r.title?.includes(payrollMonth))
      );

      const matchingIndivReq = hierarchyRequests.find(
        (r: any) =>
          r.type === "INDIVIDUAL_PAYROLL" &&
          (r.details?.workerId === w.id || r.details?.workerCode === (w.worker_code || w.workerCode)) &&
          r.details?.payrollMonth === payrollMonth
      );

      let paymentStatus: "Draft" | "Pending Finance Review" | "Paid" = "Draft";
      let paidAt: string | null = null;
      let paymentRef: string | null = null;
      let paidBy: string | null = null;
      let reqId: string | undefined = undefined;

      if (matchingBatchReq) {
        reqId = matchingBatchReq.id;
        const empRecord = matchingBatchReq.details?.employees?.find(
          (e: any) => e.workerId === w.id || e.workerCode === (w.worker_code || w.workerCode)
        );

        if (empRecord?.paid || matchingBatchReq.status === "APPROVED" || matchingBatchReq.status === "PAID") {
          paymentStatus = "Paid";
          paidAt = empRecord?.paidAt || matchingBatchReq.updatedAt || matchingBatchReq.createdAt;
          paymentRef = empRecord?.paymentRef || matchingBatchReq.details?.paymentRef || `CBE-PAY-${matchingBatchReq.id.slice(-6).toUpperCase()}`;
          paidBy = "Finance Dept";
        } else {
          paymentStatus = "Pending Finance Review";
        }
      } else if (matchingIndivReq) {
        reqId = matchingIndivReq.id;
        if (matchingIndivReq.status === "APPROVED" || matchingIndivReq.status === "PAID") {
          paymentStatus = "Paid";
          paidAt = matchingIndivReq.updatedAt || matchingIndivReq.createdAt;
          paymentRef = matchingIndivReq.details?.paymentRef || `CBE-PAY-${matchingIndivReq.id.slice(-6).toUpperCase()}`;
          paidBy = matchingIndivReq.logs?.find((l: any) => l.action === "APPROVED")?.user?.displayName || "Finance Dept";
        } else {
          paymentStatus = "Pending Finance Review";
        }
      }

      return {
        id: w.id,
        workerCode: w.worker_code || w.workerCode || "EMP",
        fullName: w.full_name || w.fullName,
        photoUrl: w.photo_url || w.photoUrl,
        department: w.departmentName || w.department || "General Management",
        position: w.position || "Staff",
        bankName: w.bankName || w.bank_name || "Commercial Bank of Ethiopia (CBE)",
        bankAccountNo: w.bankAccountNo || w.bank_account_no || "—",
        workStatus: w.status || "Active",
        salary,
        payeTax,
        employeePension,
        totalDeductions,
        payableAmount,
        paymentStatus,
        paidAt,
        paymentRef,
        paidBy,
        requestId: reqId,
      };
    });
  }, [workers, hierarchyRequests, payrollMonth]);

  const filteredRows = useMemo(() => {
    return payrollRows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.workerCode.toLowerCase().includes(search.toLowerCase()) ||
        r.department.toLowerCase().includes(search.toLowerCase())
    );
  }, [payrollRows, search]);

  const totals = useMemo(() => {
    return payrollRows.reduce(
      (acc, r) => {
        acc.salary += r.salary;
        acc.paye += r.payeTax;
        acc.employeePension += r.employeePension;
        acc.totalDeductions += r.totalDeductions;
        acc.payable += r.payableAmount;
        if (r.paymentStatus === "Paid") acc.paidCount += 1;
        if (r.paymentStatus === "Pending Finance Review") acc.pendingCount += 1;
        return acc;
      },
      { salary: 0, paye: 0, employeePension: 0, totalDeductions: 0, payable: 0, paidCount: 0, pendingCount: 0 }
    );
  }, [payrollRows]);

  const handleExportCSV = () => {
    const headers = [
      "Worker Code",
      "Full Name",
      "Department",
      "Position",
      "Bank Name",
      "Account Number",
      "Salary (ETB)",
      "PAYE Income Tax (ETB)",
      "Employee Pension 7% (ETB)",
      "Total Deductions (ETB)",
      "Salary Payable (ETB)",
      "Payment Status",
      "Paid Timestamp",
    ];

    const rows = payrollRows.map((r) => [
      r.workerCode,
      `"${r.fullName}"`,
      `"${r.department}"`,
      `"${r.position}"`,
      `"${r.bankName}"`,
      `"${r.bankAccountNo}"`,
      r.salary.toFixed(2),
      r.payeTax.toFixed(2),
      r.employeePension.toFixed(2),
      r.totalDeductions.toFixed(2),
      r.payableAmount.toFixed(2),
      r.paymentStatus,
      r.paidAt ? format(new Date(r.paidAt), "yyyy-MM-dd HH:mm") : "—",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payroll_${payrollMonth.replace(" ", "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payroll CSV exported successfully!");
  };

  // Existing batch request for active month (ensures HR submits only once per month)
  const existingMonthBatch = useMemo(() => {
    return hierarchyRequests.find(
      (r: any) =>
        r.type === "PAYROLL_DISBURSEMENT" &&
        (r.details?.payrollMonth === payrollMonth || r.title?.includes(payrollMonth))
    );
  }, [hierarchyRequests, payrollMonth]);

  const handleBatchSubmitToFinance = async () => {
    if (payrollRows.length === 0) {
      toast.error("No active staff to submit for payroll");
      return;
    }

    if (existingMonthBatch) {
      toast.warning(`Monthly payroll for ${payrollMonth} has already been submitted to Finance. Multiple submissions in the same month are prevented.`);
      return;
    }

    setSubmitting(true);
    try {
      // Submit a single consolidated batch request to Finance
      await apiClient.post("/hierarchy/requests", {
        title: `Monthly Staff Payroll Batch (${payrollMonth}) - ${formatCurrency(totals.payable)}`,
        type: "PAYROLL_DISBURSEMENT",
        amount: totals.payable,
        description: `Monthly staff salary disbursement batch for ${payrollRows.length} active employees (${payrollMonth}). Total Salary: ${formatCurrency(totals.salary)}, PAYE Tax: -${formatCurrency(totals.paye)}, Pension 7%: -${formatCurrency(totals.employeePension)}. Total Salary Payable: ${formatCurrency(totals.payable)}.`,
        details: {
          payrollMonth,
          staffCount: payrollRows.length,
          totalSalary: totals.salary,
          totalPaye: totals.paye,
          totalPension: totals.employeePension,
          totalDeductions: totals.totalDeductions,
          totalPayable: totals.payable,
          employees: payrollRows.map((r) => ({
            workerId: r.id,
            workerCode: r.workerCode,
            fullName: r.fullName,
            photoUrl: r.photoUrl,
            department: r.department,
            position: r.position,
            workStatus: r.workStatus,
            bankName: r.bankName,
            bankAccountNo: r.bankAccountNo,
            salary: r.salary,
            payeTax: r.payeTax,
            employeePension: r.employeePension,
            totalDeductions: r.totalDeductions,
            payableAmount: r.payableAmount,
            paid: false,
            paidAt: null,
            paymentRef: null,
          })),
        },
      });

      toast.success(`Consolidated Payroll batch for ${payrollMonth} submitted to Finance successfully!`);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to submit payroll batch to Finance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading">Monthly Payroll & Compensation Workbench</h1>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {payrollMonth}
            </Badge>
            {totals.paidCount > 0 && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 gap-1">
                <CheckCircle2 className="h-3 w-3" /> {totals.paidCount} Paid
              </Badge>
            )}
            {totals.pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 gap-1">
                <Clock className="h-3 w-3" /> {totals.pendingCount} In Finance Review
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automated statutory tax & pension deductions (PAYE Income Tax & 7% Pension). HR batch-submits requests directly to Finance for individual dossier review and execution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={payrollMonth}
            onChange={(e) => setPayrollMonth(e.target.value)}
            className="w-40 text-xs font-semibold h-9"
            placeholder="Month Year"
          />
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs h-9">
            <Download className="h-4 w-4" /> Export Bank CSV
          </Button>
          <Button
            size="sm"
            onClick={handleBatchSubmitToFinance}
            disabled={submitting || Boolean(existingMonthBatch)}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold gap-1.5 text-xs h-9 shadow-sm"
          >
            {existingMonthBatch ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                Submitted for {payrollMonth}
              </>
            ) : submitting ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Sending to Finance...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Monthly Payroll to Finance
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 bg-gradient-to-br from-emerald-500/10 via-card to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Total Salary Payable
              <Wallet className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totals.payable)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{workers.length} active registered staff</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Total Registered Salary
              <DollarSign className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totals.salary)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Base workforce payroll</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              PAYE Income Tax
              <Building className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(totals.paye)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">To be remitted to Gov Tax</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Employee Pension (7%)
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {formatCurrency(totals.employeePension)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total Deductions: {formatCurrency(totals.totalDeductions)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payroll sheet by employee name, code, or department..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead>Staff Code & Photo</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Department & Role</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-right text-amber-600">PAYE Tax</TableHead>
                <TableHead className="text-right text-blue-600">Pension (7%)</TableHead>
                <TableHead className="text-right text-destructive">Total Deductions</TableHead>
                <TableHead className="text-right font-bold text-emerald-600">Salary Payable</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-center">Voucher Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No active employees found for payroll.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r) => (
                  <TableRow key={r.id} className="text-xs hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.photoUrl ? (
                          <img src={r.photoUrl} alt={r.fullName} className="h-8 w-8 rounded-full object-cover border shadow-xs" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {r.fullName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-mono font-bold text-primary">{r.workerCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/hr/workers/${r.id}`)}
                        className="font-semibold text-left hover:text-primary hover:underline flex items-center gap-1"
                        title="View Employee Dossier"
                      >
                        {r.fullName}
                        <Eye className="h-3 w-3 text-muted-foreground opacity-60" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.department}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{r.position}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(r.salary)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600 dark:text-amber-400">
                      -{formatCurrency(r.payeTax)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-600 dark:text-blue-400">
                      -{formatCurrency(r.employeePension)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      -{formatCurrency(r.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency(r.payableAmount)}
                    </TableCell>
                    <TableCell>
                      {r.paymentStatus === "Paid" ? (
                        <div className="space-y-0.5">
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 font-bold">
                            <CheckCircle2 className="h-2.5 w-2.5" /> PAID
                          </Badge>
                          {r.paidAt && (
                            <span className="text-[9px] text-muted-foreground block font-mono">
                              {format(new Date(r.paidAt), "dd MMM yyyy, hh:mm a")}
                            </span>
                          )}
                        </div>
                      ) : r.paymentStatus === "Pending Finance Review" ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 text-[10px] gap-1 bg-amber-500/10">
                          <Clock className="h-2.5 w-2.5" /> Finance Review
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:bg-primary/10"
                        title="Print Pay Voucher Slip"
                        onClick={() => {
                          setSelectedPaySlip(r);
                          setPaySlipOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Clean Professional Corporate Pay Slip Voucher Modal */}
      {selectedPaySlip && (
        <Dialog open={paySlipOpen} onOpenChange={setPaySlipOpen}>
          <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border shadow-2xl">
            {/* Corporate Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white p-1.5 flex items-center justify-center shadow">
                  <img src="/uploads/Untitled_design__4_-removebg-preview.png" alt="Meseret Mare Logo" className="h-9 w-9 object-contain" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-white uppercase font-heading">
                    MESERET MARE SOLAR PRODUCTS & FASIL ZELALEM
                  </h2>
                  <p className="text-[11px] text-slate-300">Official Personnel Salary Payment Slip</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs print:p-0">
              {/* Identity & Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Voucher No</span>
                  <span className="font-mono font-bold text-foreground">
                    SF-PAY-{selectedPaySlip.workerCode}-{payrollMonth.replace(/\s+/g, "")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Period</span>
                  <span className="font-semibold text-foreground">{payrollMonth}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Payment Status</span>
                  {selectedPaySlip.paymentStatus === "Paid" ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> PAID & DISBURSED
                    </span>
                  ) : (
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> PENDING FINANCE
                    </span>
                  )}
                </div>
              </div>

              {/* Employee Details */}
              <div className="p-4 rounded-xl border bg-card flex items-center gap-4">
                {selectedPaySlip.photoUrl ? (
                  <img src={selectedPaySlip.photoUrl} alt={selectedPaySlip.fullName} className="h-14 w-14 rounded-xl object-cover border-2 border-primary/20 shadow-sm shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                    {selectedPaySlip.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-primary font-bold px-1.5 py-0.5 rounded bg-primary/10">
                      STAFF ID: {selectedPaySlip.workerCode}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{selectedPaySlip.department}</Badge>
                  </div>
                  <h3 className="font-bold text-base text-foreground truncate mt-1">{selectedPaySlip.fullName}</h3>
                  <p className="text-xs text-muted-foreground">{selectedPaySlip.position}</p>
                </div>
              </div>

              {/* Bank Account */}
              <div className="p-3 rounded-lg border bg-muted/20 flex justify-between items-center text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Disbursement Account</span>
                  <span className="font-semibold text-foreground">{selectedPaySlip.bankName}</span>
                </div>
                <div className="text-right font-mono font-bold text-foreground text-sm">
                  {selectedPaySlip.bankAccountNo}
                </div>
              </div>

              {/* Prominent Payment Amount Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-card border-2 border-emerald-500/30 text-center space-y-1">
                <span className="text-xs uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
                  Payment Amount
                </span>
                <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedPaySlip.payableAmount || selectedPaySlip.salary)}
                </div>
                <p className="text-[11px] text-muted-foreground">Direct Bank Transfer</p>
              </div>

              {/* Date, Time & Verification Stamps */}
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Payment Date & Time</span>
                  {selectedPaySlip.paidAt ? (
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {format(new Date(selectedPaySlip.paidAt), "dd MMMM yyyy, hh:mm:ss a")}
                    </span>
                  ) : (
                    <span className="font-medium text-amber-600">Pending Finance Review</span>
                  )}
                  {selectedPaySlip.paymentRef && (
                    <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                      Ref: {selectedPaySlip.paymentRef}
                    </span>
                  )}
                </div>
                <div className="sm:text-right">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Authorized Sign-Off</span>
                  <span className="font-semibold text-foreground block">Finance & Accounts Department</span>
                  <span className="text-[10px] text-muted-foreground">Meseret Mare PLC</span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 bg-muted/20 border-t flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setPaySlipOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.print()} size="sm" className="gap-1.5 bg-primary text-primary-foreground font-semibold">
                <Printer className="h-4 w-4" /> Print Official Pay Slip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
