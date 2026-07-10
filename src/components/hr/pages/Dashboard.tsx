import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserMinus, Clock, Activity } from "lucide-react";
import { hrDB } from "@/lib/db-service";
import { format, subDays, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
      <div>
        <h1 className="text-3xl font-bold">HR & Attendance Dashboard</h1>
        <p className="text-muted-foreground">Overview of today's attendance metrics.</p>
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
