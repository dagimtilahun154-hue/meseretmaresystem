import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, DollarSign, UserCheck, Plus, ArrowRight, ShieldCheck,
  Briefcase, Calendar, Search, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { hrDB, DEFAULT_DEPARTMENTS } from "@/lib/db-service";
import { formatCurrency } from "@/lib/data";
import { useStore } from "@/context/StoreContext";
import { DashboardHeaderBanner } from "./widgets/DashboardHeaderBanner";
import { StatCardGrid } from "./widgets/StatCardGrid";
import { EodActivityWidget } from "./widgets/EodActivityWidget";

export function HRHubDashboard() {
  const navigate = useNavigate();
  const { eodReports = [] } = useStore() as any;
  const [workers, setWorkers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [workersData, deptsData] = await Promise.all([
          hrDB.getWorkers(),
          hrDB.getDepartments(),
        ]);
        if (Array.isArray(workersData)) setWorkers(workersData);
        if (Array.isArray(deptsData) && deptsData.length > 0) setDepartments(deptsData);
      } catch (e) {
        console.error("Failed to load HR dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalPayrollEstimate = workers.reduce(
    (acc, w) => acc + Number(w.baseSalary || w.base_salary || 0),
    0
  );

  const activeWorkersCount = workers.filter((w) => (w.status || "Active") === "Active").length;

  const statCards = [
    {
      key: "total_staff",
      label: "Total Staff",
      value: `${workers.length} Employees`,
      subtext: `${activeWorkersCount} Active Employees`,
      icon: Users,
      gradientClass: "stat-gradient-sales",
      badge: "Staff",
    },
    {
      key: "departments",
      label: "Departments",
      value: `${departments.length} Units`,
      subtext: "Technical, Sales, Field, Mgmt",
      icon: Building2,
      gradientClass: "stat-gradient-products",
      badge: "Structure",
    },
    {
      key: "monthly_payroll",
      label: "Monthly Payroll",
      value: formatCurrency(totalPayrollEstimate),
      subtext: "Monthly base salary total",
      icon: DollarSign,
      gradientClass: "stat-gradient-profit",
      badge: "Payroll",
    },
    {
      key: "active_status",
      label: "Active Rate",
      value: `${workers.length ? Math.round((activeWorkersCount / workers.length) * 100) : 100}%`,
      subtext: "On-duty staff status",
      icon: UserCheck,
      gradientClass: "stat-gradient-customers",
      badge: "Active",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <DashboardHeaderBanner
        roleBadge="HR Manager"
        title="HR & Payroll Dashboard"
        description="Manage employee records, departments, and payroll."
        gradientClass="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-800"
        actions={[
          {
            label: "Employee Directory",
            onClick: () => navigate("/hr/workers"),
            icon: Users,
            className: "bg-white text-emerald-950 hover:bg-emerald-50 font-bold shadow-md text-xs h-9",
          },
          {
            label: "Payroll",
            onClick: () => navigate("/hr/payroll"),
            icon: DollarSign,
            className: "bg-emerald-950/60 hover:bg-emerald-950 text-white font-bold border border-white/20 text-xs h-9",
          },
        ]}
      />

      {/* 2. Signature Stat Cards Grid */}
      <StatCardGrid cards={statCards} gridColsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* 3. Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Personnel Registry Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" /> Active Employee Directory Snapshot
                </h3>
                <p className="text-xs text-muted-foreground">
                  Latest registered personnel profiles, job designations, and department assignments.
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/hr/workers")}>
                Full Registry <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Employee</th>
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium">Position</th>
                    <th className="pb-2 font-medium text-right">Base Salary</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No employees registered yet. Click "Workforce Registry" to add staff.
                      </td>
                    </tr>
                  ) : (
                    workers.slice(0, 6).map((w) => (
                      <tr key={w.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full overflow-hidden border bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                            {w.photo_url || w.photoUrl ? (
                              <img src={w.photo_url || w.photoUrl} alt={w.full_name} className="h-full w-full object-cover" />
                            ) : (
                              (w.full_name || "E").slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-semibold block">{w.full_name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{w.worker_code}</span>
                          </div>
                        </td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-[10px]">
                            {w.departmentName || "General"}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">{w.position || "Staff"}</td>
                        <td className="py-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(w.baseSalary || w.base_salary || 0)}
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              w.status === "Active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {w.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Department Breakdown Card */}
          <Card className="border border-border/60 shadow-sm p-4">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-primary" /> Departmental Distribution & Structure
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {departments.map((dept) => {
                const count = workers.filter(
                  (w) => w.department_id === dept.id || w.departmentName === dept.name
                ).length;
                return (
                  <div key={dept.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <p className="font-semibold text-xs truncate" title={dept.name}>
                      {dept.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-muted-foreground">{count} Staff members</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {count}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column (1/3): Quick Actions & EOD */}
        <div className="space-y-6">
          <Card className="border border-border/60 shadow-sm p-4 bg-gradient-to-br from-emerald-50/50 dark:from-emerald-950/20 via-card to-card">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <Briefcase className="h-4 w-4 text-emerald-600" /> HR Operations Shortcuts
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-xs h-9 gap-2 bg-card hover:bg-muted"
                onClick={() => navigate("/hr/workers")}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" /> Register New Employee Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs h-9 gap-2 bg-card hover:bg-muted"
                onClick={() => navigate("/hr/payroll")}
              >
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Process Monthly Payroll
              </Button>
            </div>
          </Card>

          <EodActivityWidget eodReports={eodReports} />
        </div>
      </div>
    </div>
  );
}
