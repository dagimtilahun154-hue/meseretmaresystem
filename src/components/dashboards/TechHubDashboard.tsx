import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Zap, CheckCircle2, UserCheck, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { DashboardHeaderBanner } from "./widgets/DashboardHeaderBanner";
import { StatCardGrid } from "./widgets/StatCardGrid";
import { EodActivityWidget } from "./widgets/EodActivityWidget";

export function TechHubDashboard() {
  const navigate = useNavigate();
  const { sizingRequests = [], fieldWorks = [], eodReports = [], refreshStoreData } = useStore() as any;

  const pendingSizings = sizingRequests.filter((sr: any) => sr.status === "PENDING_TM" || sr.status === "DRAFT");
  const unassignedJobs = fieldWorks.filter((fw: any) => fw.status === "pending");
  const returnReviews = fieldWorks.filter((fw: any) => fw.status === "completed_ttl");

  const statCards = [
    {
      key: "sizings",
      label: "Sizing Queue",
      value: `${pendingSizings.length} Pending`,
      subtext: "Awaiting engineering review",
      icon: Zap,
      gradientClass: "stat-gradient-sales",
      badge: "Review",
    },
    {
      key: "dispatch",
      label: "Dispatch Queue",
      value: `${unassignedJobs.length} Jobs`,
      subtext: "Paid jobs awaiting crew lead",
      icon: UserCheck,
      gradientClass: "stat-gradient-products",
      badge: "Dispatch",
    },
    {
      key: "returns",
      label: "Tool Returns",
      value: `${returnReviews.length} Reviews`,
      subtext: "Awaiting condition check",
      icon: ShieldCheck,
      gradientClass: "stat-gradient-customers",
      badge: "Assets",
    },
    {
      key: "active",
      label: "Active Fieldwork",
      value: `${fieldWorks.length} Total`,
      subtext: "Active installation crews",
      icon: Wrench,
      gradientClass: "stat-gradient-profit",
      badge: "Ops",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Standardized Header Banner */}
      <DashboardHeaderBanner
        roleBadge="Technical Manager"
        title="Technical & Field Dashboard"
        description="Manage pump sizing, site installations, crew dispatch, and tool returns."
        gradientClass="bg-gradient-to-r from-[#2cb563] via-[#10b981] to-[#047857]"
        actions={[
          {
            label: "Pump Sizing",
            onClick: () => navigate("/pump-sizing"),
            icon: Zap,
            className: "bg-white text-emerald-950 hover:bg-emerald-50 font-bold shadow-md text-xs h-9",
          },
          {
            label: "Field Work",
            onClick: () => navigate("/fieldwork"),
            icon: Wrench,
            className: "bg-emerald-950/60 hover:bg-emerald-950 text-white font-bold border border-white/20 text-xs h-9",
          },
        ]}
      />

      {/* 2. Signature Stat Cards Grid */}
      <StatCardGrid cards={statCards} gridColsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* 3. Operational Grid (Sizing Requests Table & Field Operations List) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Pending Sizing Requests & Dispatch Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Pump Sizing Calculations Table */}
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" /> Pending Technical Sizing Reviews
                </h3>
                <p className="text-xs text-muted-foreground">Engineering calculations awaiting Technical Manager sign-off.</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/pump-sizing")}>
                Studio <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Customer / Project</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium text-center">TDH / Flow</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSizings.slice(0, 6).map((sr: any) => (
                    <tr key={sr.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 font-semibold">{sr.customerName || sr.title}</td>
                      <td className="py-2.5 text-muted-foreground">{sr.location || "—"}</td>
                      <td className="py-2.5 text-center font-medium">{sr.calculatedTDH || sr.head || "—"}m / {sr.requiredFlowMin || sr.flow || "—"}L/m</td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                          {sr.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        <Button size="sm" onClick={() => navigate("/pump-sizing")} className="h-7 bg-purple-600 hover:bg-purple-700 text-white text-[10px] px-2 font-bold">
                          Review & Sign
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingSizings.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No technical sizing reviews pending</p>
            )}
          </Card>

          {/* Active Field Supervision List */}
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4 text-indigo-600" /> Active Field Dispatch Jobs
              </h3>
              <Badge variant="secondary" className="text-[10px]">{fieldWorks.length} Total Jobs</Badge>
            </div>
            <div className="space-y-2">
              {fieldWorks.slice(0, 5).map((fw: any) => (
                <div key={fw.id} className="p-3 rounded-lg border bg-muted/20 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{fw.pumpModel || "Field Job"} — {fw.location}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Assigned TTL / Crew: {fw.workers?.map((w: any) => w.name).join(", ") || "Unassigned"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate("/fieldwork")} className="h-7 text-[10px]">
                    Manage Dispatch
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (1/3): Universal EOD Activity Log */}
        <div>
          <EodActivityWidget eodReports={eodReports} onReportSubmitted={refreshStoreData} />
        </div>
      </div>
    </div>
  );
}
