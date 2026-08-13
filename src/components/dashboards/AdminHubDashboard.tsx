import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Users, Key, Settings, CheckCircle2, UserCheck, ArrowRight, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { DashboardHeaderBanner } from "./widgets/DashboardHeaderBanner";
import { StatCardGrid } from "./widgets/StatCardGrid";
import { EodActivityWidget } from "./widgets/EodActivityWidget";

export function AdminHubDashboard() {
  const navigate = useNavigate();
  const { eodReports = [] } = useStore() as any;

  // System roles matrix sample data
  const systemUsers = [
    { id: "1", username: "manager", role: "manager", displayName: "General Manager", department: "EXECUTIVE", status: "Active" },
    { id: "2", username: "finance", role: "finance", displayName: "Finance Officer", department: "FINANCE", status: "Active" },
    { id: "3", username: "store", role: "storekeeper", displayName: "Store Keeper", department: "INVENTORY", status: "Active" },
    { id: "4", username: "field", role: "fieldwork", displayName: "Field Controller", department: "TECHNICAL", status: "Active" },
  ];

  const statCards = [
    {
      key: "users",
      label: "System Accounts",
      value: `${systemUsers.length} Users`,
      subtext: "Active user profiles",
      icon: Users,
      gradientClass: "stat-gradient-sales",
      badge: "Users",
    },
    {
      key: "roles",
      label: "Role Matrix",
      value: "5 Workspaces",
      subtext: "GM, Sales, Finance, Tech, Admin",
      icon: Key,
      gradientClass: "stat-gradient-products",
      badge: "RBAC",
    },
    {
      key: "health",
      label: "System Status",
      value: "100% Operational",
      subtext: "API & DB Connection Healthy",
      icon: ShieldAlert,
      gradientClass: "stat-gradient-customers",
      badge: "Health",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Standardized Header Banner */}
      <DashboardHeaderBanner
        roleBadge="System Administrator Desk"
        title="Admin Control Center"
        description="System Configuration, Role Access Controls (RBAC), User Account Auditing & Environment Diagnostics."
        gradientClass="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950"
        actions={[
          {
            label: "User Accounts",
            onClick: () => navigate("/user-accounts"),
            icon: Users,
            className: "bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md text-xs h-9",
          },
        ]}
      />

      {/* 2. Signature Stat Cards Grid */}
      <StatCardGrid cards={statCards} gridColsClass="grid-cols-1 sm:grid-cols-3" />

      {/* 3. Operational Grid (User Matrix Table & EOD Activity Widget) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): User Accounts & RBAC Matrix Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Active System Users & Workspaces
                </h3>
                <p className="text-xs text-muted-foreground">Manage user login credentials, assigned workspace roles, and department security access.</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/user-accounts")}>
                Account Management <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Username</th>
                    <th className="pb-2 font-medium">Display Name</th>
                    <th className="pb-2 font-medium">Assigned Role</th>
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {systemUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 font-bold font-mono text-primary">{u.username}</td>
                      <td className="py-2.5 font-semibold">{u.displayName}</td>
                      <td className="py-2.5 text-muted-foreground uppercase">{u.role}</td>
                      <td className="py-2.5 text-muted-foreground">{u.department}</td>
                      <td className="py-2.5 text-center">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          {u.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1/3): Universal EOD Activity Log */}
        <div>
          <EodActivityWidget eodReports={eodReports} />
        </div>
      </div>
    </div>
  );
}
