import React, { useState } from "react";
import {
  Droplets,
  DollarSign,
  Briefcase,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Receipt,
  User,
  MapPin,
  Calendar,
  Building,
  ShieldCheck,
  Send,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

export interface SizingProposalItem {
  id: string;
  customerName: string;
  customerPhone?: string;
  location?: string;
  head: number;
  flowRate: number;
  recommendedPump: string;
  recommendedPanels: string;
  estimatedTotal: number;
  date: string;
  status: "pending" | "approved" | "paid" | "rejected";
  engineerName?: string;
}

export interface PerDiemRequestItem {
  id: string;
  workerName: string;
  workerRole: string;
  missionTitle: string;
  destination: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  dailyRate: number;
  totalAmount: number;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface FieldCashRequestItem {
  id: string;
  ttlName: string;
  siteLocation: string;
  purpose: string;
  category: "Excavation/Crane" | "Local Labor" | "Emergency Plumbing" | "Transport/Fuel" | "Site Logistics" | "Other";
  amount: number;
  urgency: "Normal" | "Urgent" | "Critical";
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface MissionBudgetItem {
  id: string;
  missionTitle: string;
  teamLead: string;
  targetRegion: string;
  startDate: string;
  endDate: string;
  estimatedCost: number;
  breakdown: {
    transport: number;
    materials: number;
    labor: number;
    contingency: number;
  };
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface GeneralPaymentItem {
  id: string;
  title: string;
  requestedBy: string;
  department: string;
  amount: number;
  description: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

interface FinanceApprovalsInboxProps {
  sizingProposals?: SizingProposalItem[];
  perDiemRequests?: PerDiemRequestItem[];
  fieldCashRequests?: FieldCashRequestItem[];
  missionBudgets?: MissionBudgetItem[];
  generalPayments?: GeneralPaymentItem[];
  canApprove: boolean;
  onApproveSizing?: (id: string) => Promise<void> | void;
  onMarkSizingPaid?: (id: string) => Promise<void> | void;
  onRejectSizing?: (id: string, reason?: string) => Promise<void> | void;
  onApprovePerDiem?: (id: string) => Promise<void> | void;
  onRejectPerDiem?: (id: string, reason?: string) => Promise<void> | void;
  onApproveFieldCash?: (id: string) => Promise<void> | void;
  onRejectFieldCash?: (id: string, reason?: string) => Promise<void> | void;
  onApproveMissionBudget?: (id: string) => Promise<void> | void;
  onRejectMissionBudget?: (id: string, reason?: string) => Promise<void> | void;
  onApproveGeneralPayment?: (id: string) => Promise<void> | void;
  onRejectGeneralPayment?: (id: string, reason?: string) => Promise<void> | void;
}

export function FinanceApprovalsInbox({
  sizingProposals = [],
  perDiemRequests = [],
  fieldCashRequests = [],
  missionBudgets = [],
  generalPayments = [],
  canApprove,
  onApproveSizing,
  onMarkSizingPaid,
  onRejectSizing,
  onApprovePerDiem,
  onRejectPerDiem,
  onApproveFieldCash,
  onRejectFieldCash,
  onApproveMissionBudget,
  onRejectMissionBudget,
  onApproveGeneralPayment,
  onRejectGeneralPayment,
}: FinanceApprovalsInboxProps) {
  const [activeTab, setActiveTab] = useState("sizing");
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    type: "sizing" | "perdiem" | "fieldcash" | "budget" | "general";
    id: string;
    title: string;
  }>({ open: false, type: "sizing", id: "", title: "" });
  const [rejectReason, setRejectReason] = useState("");

  const pendingSizingCount = sizingProposals.filter((p) => p.status === "pending").length;
  const pendingPerDiemCount = perDiemRequests.filter((p) => p.status === "pending").length;
  const pendingCashCount = fieldCashRequests.filter((p) => p.status === "pending").length;
  const pendingBudgetCount = missionBudgets.filter((p) => p.status === "pending").length;
  const pendingGeneralCount = generalPayments.filter((p) => p.status === "pending").length;
  const totalPending =
    pendingSizingCount + pendingPerDiemCount + pendingCashCount + pendingBudgetCount + pendingGeneralCount;

  const handleConfirmReject = async () => {
    if (!rejectDialog.id) return;
    try {
      if (rejectDialog.type === "sizing" && onRejectSizing) {
        await onRejectSizing(rejectDialog.id, rejectReason);
      } else if (rejectDialog.type === "perdiem" && onRejectPerDiem) {
        await onRejectPerDiem(rejectDialog.id, rejectReason);
      } else if (rejectDialog.type === "fieldcash" && onRejectFieldCash) {
        await onRejectFieldCash(rejectDialog.id, rejectReason);
      } else if (rejectDialog.type === "budget" && onRejectMissionBudget) {
        await onRejectMissionBudget(rejectDialog.id, rejectReason);
      } else if (rejectDialog.type === "general" && onRejectGeneralPayment) {
        await onRejectGeneralPayment(rejectDialog.id, rejectReason);
      }
      toast.info(`Rejected request: ${rejectDialog.title}`);
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setRejectDialog({ open: false, type: "sizing", id: "", title: "" });
      setRejectReason("");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black font-heading text-foreground">Commercial & Financial Approvals Inbox</h2>
              {totalPending > 0 ? (
                <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                  {totalPending} Action Required
                </Badge>
              ) : (
                <Badge className="bg-emerald-500 text-white font-bold text-[10px]">Inbox Clear ✓</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and sign-off pump sizing proposals, per diem allowances, field cash outlays, and project mission budgets.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full bg-muted/40 p-1 rounded-xl border">
          <TabsTrigger value="sizing" className="text-xs font-bold gap-1.5 py-2">
            <Droplets className="h-3.5 w-3.5" />
            Pump Sizing
            {pendingSizingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-primary text-primary-foreground rounded-full text-[10px] font-black">
                {pendingSizingCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="perdiem" className="text-xs font-bold gap-1.5 py-2">
            <User className="h-3.5 w-3.5" />
            Per Diem
            {pendingPerDiemCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                {pendingPerDiemCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="fieldcash" className="text-xs font-bold gap-1.5 py-2">
            <DollarSign className="h-3.5 w-3.5" />
            TTL Field Cash
            {pendingCashCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingCashCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="budget" className="text-xs font-bold gap-1.5 py-2">
            <Briefcase className="h-3.5 w-3.5" />
            Mission Budgets
            {pendingBudgetCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-500 text-white rounded-full text-[10px] font-black">
                {pendingBudgetCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="general" className="text-xs font-bold gap-1.5 py-2 col-span-2 sm:col-span-1">
            <Receipt className="h-3.5 w-3.5" />
            General Payments
            {pendingGeneralCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-purple-500 text-white rounded-full text-[10px] font-black">
                {pendingGeneralCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. PUMP SIZING PROPOSALS TAB */}
        <TabsContent value="sizing" className="mt-4 space-y-4">
          {sizingProposals.length === 0 ? (
            <Card className="p-8 text-center border rounded-2xl">
              <Droplets className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-sm text-foreground">No Pump Sizing Proposals</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Technical sizing assessments submitted by field engineers will appear here for commercial sign-off.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sizingProposals.map((prop) => (
                <Card
                  key={prop.id}
                  className={`p-4 border rounded-2xl transition-all shadow-sm ${
                    prop.status === "pending"
                      ? "border-primary/40 bg-card hover:border-primary"
                      : "border-border/50 bg-muted/10 opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-foreground">{prop.customerName}</h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            prop.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : prop.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-black"
                              : prop.status === "approved"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          }`}
                        >
                          {prop.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        {prop.customerPhone && <span>📞 {prop.customerPhone}</span>}
                        {prop.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prop.location}</span>}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Estimated Total</span>
                      <span className="font-mono font-black text-sm text-primary">
                        {formatCurrency(prop.estimatedTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Sizing Technical Summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/50 mb-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Head / Flow:</span>
                      <span className="font-bold text-foreground">{prop.head}m Head • {prop.flowRate} m³/day</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Recommended Pump:</span>
                      <span className="font-bold text-foreground truncate block">{prop.recommendedPump}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-muted-foreground block">Solar Array:</span>
                      <span className="font-semibold text-foreground">{prop.recommendedPanels}</span>
                    </div>
                  </div>

                  {/* Actions: Approve / Mark Paid / Reject */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-muted-foreground">
                      Engineer: <span className="font-semibold text-foreground">{prop.engineerName || "Field Staff"}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {prop.status === "pending" && canApprove && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRejectDialog({
                                open: true,
                                type: "sizing",
                                id: prop.id,
                                title: `Proposal for ${prop.customerName}`,
                              })
                            }
                            className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onApproveSizing && onApproveSizing(prop.id)}
                            className="h-8 text-xs font-bold bg-primary text-primary-foreground"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Proposal
                          </Button>
                        </>
                      )}

                      {prop.status === "approved" && canApprove && (
                        <Button
                          size="sm"
                          onClick={() => onMarkSizingPaid && onMarkSizingPaid(prop.id)}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" /> Mark Paid / Ready for Dispatch
                        </Button>
                      )}

                      {prop.status === "paid" && (
                        <Badge className="bg-emerald-500 text-white text-[10px] font-bold">
                          ✓ Payment Cleared & Invoiced
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 2. PER DIEM REQUESTS TAB */}
        <TabsContent value="perdiem" className="mt-4 space-y-4">
          {perDiemRequests.length === 0 ? (
            <Card className="p-8 text-center border rounded-2xl">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-sm text-foreground">No Pending Per Diem Requests</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Technician and field staff daily meal and lodging allowance requests will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {perDiemRequests.map((pd) => (
                <Card key={pd.id} className="p-4 border rounded-2xl bg-card shadow-sm space-y-3">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{pd.workerName}</h4>
                      <p className="text-xs text-muted-foreground">{pd.workerRole} • {pd.destination}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Per Diem</span>
                      <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                        {formatCurrency(pd.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs bg-muted/20 p-2.5 rounded-xl border border-border/50 space-y-1">
                    <p className="font-semibold text-foreground">Mission: {pd.missionTitle}</p>
                    <p className="text-muted-foreground">
                      {pd.daysCount} Days ({pd.startDate} to {pd.endDate}) @ {formatCurrency(pd.dailyRate)}/day
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Submitted: {new Date(pd.submittedAt).toLocaleDateString()}
                    </span>
                    {pd.status === "pending" && canApprove ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              type: "perdiem",
                              id: pd.id,
                              title: `Per Diem for ${pd.workerName}`,
                            })
                          }
                          className="h-8 text-xs text-destructive border-destructive/30"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onApprovePerDiem && onApprovePerDiem(pd.id)}
                          className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Disburse
                        </Button>
                      </div>
                    ) : (
                      <Badge className="text-[10px]">{pd.status.toUpperCase()}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 3. TTL FIELD CASH REQUESTS TAB */}
        <TabsContent value="fieldcash" className="mt-4 space-y-4">
          {fieldCashRequests.length === 0 ? (
            <Card className="p-8 text-center border rounded-2xl">
              <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-sm text-foreground">No Urgent Field Cash Requests</h3>
              <p className="text-xs text-muted-foreground mt-1">
                On-site cash requests submitted by Technical Team Leads (TTLs) will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fieldCashRequests.map((fc) => (
                <Card
                  key={fc.id}
                  className={`p-4 border rounded-2xl bg-card shadow-sm space-y-3 ${
                    fc.urgency === "Critical" ? "border-rose-500/50 bg-rose-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">{fc.ttlName} (TTL)</h4>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-black ${
                            fc.urgency === "Critical"
                              ? "bg-rose-500 text-white animate-pulse"
                              : fc.urgency === "Urgent"
                              ? "bg-amber-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {fc.urgency.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {fc.siteLocation} • <span className="font-semibold">{fc.category}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Requested Cash</span>
                      <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                        {formatCurrency(fc.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs bg-muted/20 p-2.5 rounded-xl border border-border/50">
                    <p className="text-muted-foreground italic">"{fc.purpose}"</p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Time: {new Date(fc.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {fc.status === "pending" && canApprove ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              type: "fieldcash",
                              id: fc.id,
                              title: `Field Cash for ${fc.ttlName}`,
                            })
                          }
                          className="h-8 text-xs text-destructive border-destructive/30"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onApproveFieldCash && onApproveFieldCash(fc.id)}
                          className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Cash Release
                        </Button>
                      </div>
                    ) : (
                      <Badge className="text-[10px]">{fc.status.toUpperCase()}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 4. MISSION BUDGETS TAB */}
        <TabsContent value="budget" className="mt-4 space-y-4">
          {missionBudgets.length === 0 ? (
            <Card className="p-8 text-center border rounded-2xl">
              <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-sm text-foreground">No Pending Mission Budgets</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Fieldwork mission budget allocations will appear here for management authorization.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missionBudgets.map((b) => (
                <Card key={b.id} className="p-4 border rounded-2xl bg-card shadow-sm space-y-3">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{b.missionTitle}</h4>
                      <p className="text-xs text-muted-foreground">
                        Lead: {b.teamLead} • Region: {b.targetRegion}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Budget</span>
                      <span className="font-mono font-black text-sm text-primary">
                        {formatCurrency(b.estimatedCost)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/50">
                    <div>Transport/Fuel: <span className="font-bold">{formatCurrency(b.breakdown.transport)}</span></div>
                    <div>Materials: <span className="font-bold">{formatCurrency(b.breakdown.materials)}</span></div>
                    <div>Local Labor: <span className="font-bold">{formatCurrency(b.breakdown.labor)}</span></div>
                    <div>Contingency: <span className="font-bold">{formatCurrency(b.breakdown.contingency)}</span></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Dates: {b.startDate} to {b.endDate}
                    </span>
                    {b.status === "pending" && canApprove ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              type: "budget",
                              id: b.id,
                              title: b.missionTitle,
                            })
                          }
                          className="h-8 text-xs text-destructive border-destructive/30"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onApproveMissionBudget && onApproveMissionBudget(b.id)}
                          className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Mission Budget
                        </Button>
                      </div>
                    ) : (
                      <Badge className="text-[10px]">{b.status.toUpperCase()}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 5. GENERAL PAYMENTS TAB */}
        <TabsContent value="general" className="mt-4 space-y-4">
          {generalPayments.length === 0 ? (
            <Card className="p-8 text-center border rounded-2xl">
              <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-bold text-sm text-foreground">No General Payment Requests</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Administrative, vendor, and utility payment approval requests will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generalPayments.map((g) => (
                <Card key={g.id} className="p-4 border rounded-2xl bg-card shadow-sm space-y-3">
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{g.title}</h4>
                      <p className="text-xs text-muted-foreground">{g.requestedBy} • {g.department}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Amount</span>
                      <span className="font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                        {formatCurrency(g.amount)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/50">
                    {g.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Submitted: {new Date(g.submittedAt).toLocaleDateString()}
                    </span>
                    {g.status === "pending" && canApprove ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              type: "general",
                              id: g.id,
                              title: g.title,
                            })
                          }
                          className="h-8 text-xs text-destructive border-destructive/30"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onApproveGeneralPayment && onApproveGeneralPayment(g.id)}
                          className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Payment
                        </Button>
                      </div>
                    ) : (
                      <Badge className="text-[10px]">{g.status.toUpperCase()}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, type: "sizing", id: "", title: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Reject Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason for rejecting "{rejectDialog.title}". This will be communicated back to the submitter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="e.g. Incomplete site details, exceeded daily budget cap, missing vendor quotation..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs min-h-[90px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRejectDialog({ open: false, type: "sizing", id: "", title: "" })}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              className="text-xs font-bold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
