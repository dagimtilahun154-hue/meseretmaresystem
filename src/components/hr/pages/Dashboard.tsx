import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserMinus, Clock, Activity, DollarSign, Building } from "lucide-react";
import { hrDB } from "@/lib/db-service";
import { format, subDays, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/data";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

export default function HRDashboard() {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    present: 0,
    absent: 0,
    late: 0
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Payroll Request State
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(format(new Date(), "MMMM yyyy"));
  const [baseSalary, setBaseSalary] = useState(250000);
  const [overtime, setOvertime] = useState(35000);
  const [deductions, setDeductions] = useState(28000);

  const handleSendPayrollRequest = async () => {
    const netPayable = Math.max(0, baseSalary + overtime - deductions);
    try {
      await apiClient.post("/hierarchy/requests", {
        title: `Monthly Payroll Disbursement Request (${payrollMonth}) - ${formatCurrency(netPayable)}`,
        amount: Number(netPayable),
        type: "PAYROLL_DISBURSEMENT",
        payload: {
          payrollMonth,
          baseSalary,
          overtime,
          deductions,
          netPayable,
          employeeCount: stats.totalWorkers || 12,
          submittedBy: "HR Officer",
        }
      });
      toast.success("Payroll disbursement request submitted to Finance & GM!");
      setPayrollOpen(false);
    } catch (err: any) {
      console.error("Failed to submit payroll request:", err);
      toast.error(err.response?.data?.message || "Failed to submit payroll request");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const [workers, todayLogs, monthLogs] = await Promise.all([
        hrDB.getWorkers(),
        hrDB.getAttendanceLogs({ startDate: today, endDate: today }),
        hrDB.getAttendanceLogs({ startDate: thirtyDaysAgo, endDate: today })
      ]);

      const activeWorkers = workers ? workers.filter((w: any) => w.status === 'Active') : [];
      const totalActive = activeWorkers.length;
      const attendanceLogs = todayLogs || [];

      const present = attendanceLogs.filter((l: any) => l.status === 'Present' || l.status === 'Late').length;
      const late = attendanceLogs.filter((l: any) => l.status === 'Late').length;
      const absent = totalActive - attendanceLogs.length; // Basic estimation

      setStats({
        totalWorkers: totalActive,
        present,
        late,
        absent: absent > 0 ? absent : 0
      });

      // Auto-calculate overtime pay & late penalty deductions from month logs
      let autoLateDeduction = 0;
      let autoOvertimeBonus = 0;
      if (monthLogs && Array.isArray(monthLogs)) {
        monthLogs.forEach((log: any) => {
          if (log.status === "Late") autoLateDeduction += 500; // 500 ETB penalty per late check-in
          if (log.check_out_time && log.check_out_time.includes("T18:")) autoOvertimeBonus += 750; // Overtime after 18:00
        });
      }

      if (autoLateDeduction > 0) setDeductions(autoLateDeduction);
      if (autoOvertimeBonus > 0) setOvertime(autoOvertimeBonus);

      setRecentLogs(attendanceLogs.slice(0, 5));

      // Build chart data
      if (monthLogs) {
        const grouped: Record<string, { present: number; late: number }> = {};
        monthLogs.forEach((log: any) => {
          const d = format(parseISO(log.check_in_time), 'MMM dd');
          if (!grouped[d]) grouped[d] = { present: 0, late: 0 };
          if (log.status === 'Late') grouped[d].late++;
          else if (log.status === 'Present') grouped[d].present++;
        });
        
        const chart = Object.entries(grouped).map(([date, counts]) => ({
          date,
          present: counts.present,
          late: counts.late
        }));
        // Sort by date (assuming last 30 days, we can just use the natural order if we mapped from a pre-generated array of days, but this is simple enough)
        setChartData(chart.slice(-14)); // Show last 14 days with activity
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">HR & Attendance Dashboard</h1>
          <p className="text-muted-foreground">Overview of employee workforce & monthly payroll requests.</p>
        </div>
        
        <Dialog open={payrollOpen} onOpenChange={setPayrollOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Submit Monthly Payroll Request
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0f172a] text-white border-white/10 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-400" />
                Submit Payroll Disbursement Request to Finance
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Formulate and forward monthly employee salary disbursement breakdown for General Manager & Finance sign-off.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <Label className="text-slate-300">Payroll Period / Month</Label>
                <Input
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="bg-slate-900 border-white/10 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Base Salary Pool (ETB)</Label>
                  <Input
                    type="number"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="bg-slate-900 border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Overtime & Per-Diems (ETB)</Label>
                  <Input
                    type="number"
                    value={overtime}
                    onChange={(e) => setOvertime(Number(e.target.value))}
                    className="bg-slate-900 border-white/10 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Statutory Tax & Pension Deductions (ETB)</Label>
                <Input
                  type="number"
                  value={deductions}
                  onChange={(e) => setDeductions(Number(e.target.value))}
                  className="bg-slate-900 border-white/10 text-white mt-1"
                />
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 uppercase font-mono tracking-wider">Net Payable Salary Pool</p>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {formatCurrency(Math.max(0, baseSalary + overtime - deductions))}
                  </p>
                </div>
                <Badge className="bg-emerald-500 text-white">Auto-Calculated</Badge>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayrollOpen(false)} className="border-white/10 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleSendPayrollRequest} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Forward to Finance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalWorkers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absent Today (Est.)</CardTitle>
            <UserMinus className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.absent}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No recent activity</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.workerName}</TableCell>
                      <TableCell>{format(new Date(log.check_in_time), 'hh:mm a')}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} />
                    <Bar dataKey="present" name="Present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="late" name="Late" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center border-2 border-dashed rounded-lg bg-slate-50/50">
                  <p className="text-sm text-muted-foreground">Not enough data for chart</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
