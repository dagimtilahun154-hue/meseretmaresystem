import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Printer, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hrDB } from "@/lib/db-service";
import { format } from "date-fns";

export default function HRReports() {
  const [logs, setLogs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [workerFilter, setWorkerFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("daily");
  
  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    const [wData, dData] = await Promise.all([
      hrDB.getWorkers(),
      hrDB.getDepartments()
    ]);
    if (wData) setWorkers(wData);
    if (dData) setDepartments(dData);
  };

  const generateReport = async () => {
    const filters: any = {};
    if (workerFilter !== "all") filters.workerId = workerFilter;

    // Filter by type (daily = today, weekly = last 7 days, monthly = this month)
    const today = new Date();
    if (typeFilter === 'daily') {
      filters.startDate = format(today, 'yyyy-MM-dd');
      filters.endDate = format(today, 'yyyy-MM-dd');
    } else if (typeFilter === 'weekly') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      filters.startDate = format(lastWeek, 'yyyy-MM-dd');
    } else if (typeFilter === 'monthly') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filters.startDate = format(startOfMonth, 'yyyy-MM-dd');
    }

    const data = await hrDB.getAttendanceLogs(filters);
    if (data) {
      let filtered = data;
      // Department filter is still done in memory if not supported by backend
      if (deptFilter !== "all") {
        filtered = filtered.filter((l: any) => l.department_id === deptFilter || l.worker_department_id === deptFilter);
      }
      setLogs(filtered);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance Reports</h1>
          <p className="text-muted-foreground">View and export attendance logs.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="gap-2 flex-1 md:flex-none" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" className="gap-2 flex-1 md:flex-none">
            <FileDown className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card border rounded-lg">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-muted-foreground">Worker</label>
          <Select value={workerFilter} onValueChange={setWorkerFilter}>
            <SelectTrigger><SelectValue placeholder="All Workers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workers</SelectItem>
              {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-muted-foreground">Department</label>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase text-muted-foreground">Report Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily (Today)</SelectItem>
              <SelectItem value="weekly">Weekly (Last 7 Days)</SelectItem>
              <SelectItem value="monthly">Monthly (This Month)</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button className="w-full gap-2" onClick={generateReport}>
            <Search className="h-4 w-4" /> Generate
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground italic">
                  No attendance records found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.date}</TableCell>
                  <TableCell>{log.workerName}</TableCell>
                  <TableCell>{log.departmentName || '-'}</TableCell>
                  <TableCell>{log.check_in_time ? format(new Date(log.check_in_time), 'hh:mm a') : '-'}</TableCell>
                  <TableCell>{log.check_out_time ? format(new Date(log.check_out_time), 'hh:mm a') : '-'}</TableCell>
                  <TableCell className="font-mono">{log.total_hours}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                      log.status === 'Present' ? 'bg-green-100 text-green-700' :
                      log.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                      log.status === 'Early Leave' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
