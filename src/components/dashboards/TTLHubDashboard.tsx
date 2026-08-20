import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, CheckCircle2, ClipboardList, MapPin, ShieldCheck, UserCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { DashboardHeaderBanner } from "./widgets/DashboardHeaderBanner";
import { StatCardGrid } from "./widgets/StatCardGrid";
import { EodActivityWidget } from "./widgets/EodActivityWidget";

export function TTLHubDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { fieldWorks = [], eodReports = [] } = useStore() as any;

  const myFieldWorks = fieldWorks.filter((fw: any) => fw.assignedTo === currentUser?.username);

  const assignedTrips = myFieldWorks.filter((fw: any) =>
    ["planning", "accepted", "submitted_tm", "checked_tm", "approved_gm", "Approved and ready to go", "crew_dispatched"].includes(fw.status)
  );
  const completedTrips = myFieldWorks.filter((fw: any) =>
    fw.status === "completed_ttl" || fw.status === "completed" || fw.status === "done"
  );

  const statCards = [
    {
      key: "trips",
      label: "Active Assigned Trips",
      value: `${assignedTrips.length} Active`,
      subtext: "Field installation missions",
      icon: Wrench,
      gradientClass: "stat-gradient-sales",
      badge: "Trips",
    },
    {
      key: "completed",
      label: "Completed Field Jobs",
      value: `${completedTrips.length} Done`,
      subtext: "Handed over to technical review",
      icon: CheckCircle2,
      gradientClass: "stat-gradient-products",
      badge: "Completed",
    },
    {
      key: "crews",
      label: "Crew Operations",
      value: "Active Lead",
      subtext: "On-site installation lead",
      icon: UserCheck,
      gradientClass: "stat-gradient-customers",
      badge: "Lead",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Standardized Header Banner */}
      <DashboardHeaderBanner
        roleBadge="Technical Team Lead Desk"
        title="TTL Operational Workspace"
        description="On-Site Installation Execution, Crew Per-Diem Management, Daily Field Reports & Tool Condition Sign-off."
        gradientClass="bg-gradient-to-r from-[#2cb563] via-[#0d9488] to-[#115e59]"
        actions={[
          {
            label: "Field Work Workspace",
            onClick: () => navigate("/fieldwork"),
            icon: Wrench,
            className: "bg-white text-emerald-900 hover:bg-emerald-50 font-bold shadow-md text-xs h-9",
          },
        ]}
      />

      {/* 2. Signature Stat Cards Grid */}
      <StatCardGrid cards={statCards} gridColsClass="grid-cols-1 sm:grid-cols-3" />

      {/* 3. Operational Grid (Active Trips & EOD Activity Widget) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Active Assigned Field Trips */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600" /> Active Assigned Installation Trips
                </h3>
                <p className="text-xs text-muted-foreground">Field trips assigned for installation, wiring, testing & return form submission.</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/fieldwork")}>
                View Field Hub <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <div className="space-y-3">
              {assignedTrips.length > 0 ? (
                assignedTrips.map((fw: any) => (
                  <div key={fw.id} className="p-3 rounded-lg border bg-muted/20 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-sm text-foreground">{fw.pumpModel || "Field Job"}</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        {fw.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location: {fw.location || "N/A"}</p>
                      <p>Workers: {fw.workers?.length || 0} crew members</p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button size="sm" onClick={() => navigate("/fieldwork")} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold">
                        Submit Daily Report & Return Form
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No active field installation trips currently assigned</p>
              )}
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
