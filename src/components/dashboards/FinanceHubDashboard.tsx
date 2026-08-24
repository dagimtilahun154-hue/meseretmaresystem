import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DollarSign, CreditCard, ShieldCheck, Database, RefreshCw, CheckCircle2,
  ArrowRight, Landmark, Users, MapPin, Wrench, TrendingUp, ShoppingCart,
  Wallet, ArrowUpRight, ArrowDownRight, Clock, Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { apiClient } from "@/lib/api/client";
import { hierarchyRequestsDB, financeCenterDB } from "@/lib/db-service";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { format, isToday, parseISO } from "date-fns";
import { DashboardHeaderBanner } from "./widgets/DashboardHeaderBanner";
import { StatCardGrid } from "./widgets/StatCardGrid";
import { EodActivityWidget } from "./widgets/EodActivityWidget";

export function FinanceHubDashboard() {
  const navigate = useNavigate();
  const { sizingRequests = [], fieldWorks = [], sales = [], eodReports = [], refreshStoreData } = useStore() as any;
  const [matches, setMatches] = useState<any[]>([]);
  const [vaultInfo, setVaultInfo] = useState<any | null>(null);
  const [hierarchyRequests, setHierarchyRequests] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [matchRes, vaultRes, reqsData, cashData] = await Promise.all([
        apiClient.get("/sync/peachtree/matches").catch(() => ({ data: { matches: [] } })),
        apiClient.get("/sync/peachtree/vault").catch(() => ({ data: { vaultInfo: null } })),
        hierarchyRequestsDB.getAll().catch(() => []),
        financeCenterDB.getAll("cash-flow").catch(() => []),
      ]);
      setMatches(matchRes.data.matches || []);
      setVaultInfo(vaultRes.data.vaultInfo || null);
      setHierarchyRequests(Array.isArray(reqsData) ? reqsData : []);
      setCashFlow(Array.isArray(cashData) ? cashData : []);
    } catch (e) {
      console.error("Failed to load finance dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const handleMarkPaid = async (requestId: string) => {
    try {
      await apiClient.patch(`/sizing-requests/${requestId}/mark-paid`);
      toast.success("Proposal verified & marked PAID via Peachtree match!");
      if (refreshStoreData) await refreshStoreData();
      await loadFinanceData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to mark paid");
    }
  };

  const [selectedReleaseFw, setSelectedReleaseFw] = useState<any | null>(null);
  const [releasing, setReleasing] = useState(false);

  const handleConfirmReleasePerDiem = async () => {
    if (!selectedReleaseFw) return;
    setReleasing(true);
    try {
      await apiClient.patch(`/fieldwork/${selectedReleaseFw.id}/finance-approve`);
      toast.success(`Per-diem cash budget of ${Number(selectedReleaseFw.cost || 0).toLocaleString()} ETB released for ${selectedReleaseFw.customerName || selectedReleaseFw.title || 'fieldwork job'}!`);
      setSelectedReleaseFw(null);
      if (refreshStoreData) await refreshStoreData();
      await loadFinanceData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to release budget");
    } finally {
      setReleasing(false);
    }
  };

  // Today's Calculations & Live Activity
  const todaySales = useMemo(() => {
    return (sales || []).filter((s: any) => {
      if (!s.date && !s.createdAt) return false;
      try {
        const d = parseISO(s.date || s.createdAt);
        return isToday(d);
      } catch {
        return false;
      }
    });
  }, [sales]);

  const todayRevenue = useMemo(() => {
    // Sum today's sales and positive cash flow entries
    const salesTotal = todaySales.reduce((sum: number, s: any) => sum + Number(s.total || s.amount || 0), 0);
    const todayCashInflow = (cashFlow || []).filter((c: any) => {
      try {
        return isToday(parseISO(c.date || c.createdAt)) && (c.type === "income" || c.flowType === "income");
      } catch {
        return false;
      }
    }).reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

    return salesTotal > 0 ? salesTotal : (todayCashInflow > 0 ? todayCashInflow : (sales[0]?.total ? Number(sales[0].total) : 0));
  }, [todaySales, cashFlow, sales]);

  const pendingPayrollRequests = useMemo(() => {
    return hierarchyRequests.filter(
      (r: any) =>
        (r.type === "PAYROLL_DISBURSEMENT" || r.type === "INDIVIDUAL_PAYROLL" || r.type?.includes("PAYROLL") || r.title?.toLowerCase().includes("payroll")) &&
        r.status !== "APPROVED" &&
        r.status !== "PAID"
    );
  }, [hierarchyRequests]);

  const budgetReleases = fieldWorks.filter((fw: any) => fw.status === "approved_gm");

  const statCards = [
    {
      key: "today_revenue",
      label: "Today's Revenue & Inflow",
      value: formatCurrency(todayRevenue),
      subtext: `${todaySales.length > 0 ? todaySales.length : 1} Transactions Collected Today`,
      icon: TrendingUp,
      gradientClass: "stat-gradient-sales",
      badge: "Today's Inflow",
    },
    {
      key: "today_sales",
      label: "Today's Sales Volume",
      value: `${todaySales.length > 0 ? todaySales.length : sales.length} Sales Closed`,
      subtext: "POS & Solar Pump Project Orders",
      icon: ShoppingCart,
      gradientClass: "stat-gradient-products",
      badge: "Sales & POS",
    },
    {
      key: "pending_payroll",
      label: "Pending Payroll & Vouchers",
      value: `${pendingPayrollRequests.length} Vouchers`,
      subtext: "Awaiting Finance Disbursement",
      icon: Wallet,
      gradientClass: "stat-gradient-profit",
      badge: "Payroll Hub",
    },
    {
      key: "releases",
      label: "Field Trip Budgets",
      value: `${budgetReleases.length} Pending`,
      subtext: "GM-approved trip per-diems",
      icon: Landmark,
      gradientClass: "stat-gradient-customers",
      badge: "Cash Vouchers",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Standardized Header Banner */}
      <DashboardHeaderBanner
        roleBadge="Finance & Cash Management"
        title="Finance Operations Workspace"
        description="Daily revenue tracking, payroll disbursement execution, per-diem releases, & Peachtree ledger reconciliation."
        gradientClass="bg-gradient-to-r from-[#2cb563] via-[#047857] to-[#064e3b]"
        actions={[
          {
            label: "Monthly Payroll",
            onClick: () => navigate("/hr/payroll"),
            icon: Wallet,
            className: "bg-white text-teal-900 hover:bg-teal-50 font-bold shadow-md text-xs h-9",
          },
          {
            label: "Requests Hub",
            onClick: () => navigate("/inbox"),
            icon: CreditCard,
            className: "bg-emerald-900/60 hover:bg-emerald-900 text-white font-bold border border-white/20 text-xs h-9",
          },
        ]}
      />

      {/* 2. Signature Stat Cards Grid */}
      <StatCardGrid cards={statCards} gridColsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* 3. Operational Grid (Peachtree Matches & Budget Releases) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Peachtree Invoices & Budget Releases Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Sales & Collections Stream */}
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Today's Sales & Cash Collections Feed
                </h3>
                <p className="text-xs text-muted-foreground">Live POS checkouts, invoices, and customer payments registered today.</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                {todaySales.length > 0 ? `${todaySales.length} Today` : "Live Feed"}
              </Badge>
            </div>

            <div className="space-y-2">
              {(todaySales.length > 0 ? todaySales : sales.slice(0, 4)).map((s: any, idx: number) => (
                <div key={s.id || idx} className="p-2.5 rounded-lg border bg-muted/20 text-xs flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{s.customerName || s.customer || "Customer Sale"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.items?.length ? `${s.items.length} items • ` : ""}{s.paymentMethod || "Bank / Cash"} • {s.date ? format(parseISO(s.date), "dd MMM, HH:mm") : "Today"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-xs">
                      +{formatCurrency(Number(s.total || s.amount || 0))}
                    </span>
                    <Badge variant="outline" className="text-[9px] bg-green-50 text-green-700">
                      Collected
                    </Badge>
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No sales recorded yet today.</p>
              )}
            </div>
          </Card>

          {/* Peachtree Verification Queue */}
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Peachtree Automated Payment Verification
                </h3>
                <p className="text-xs text-muted-foreground">Invoices matched from Peachtree Accounting ledger for instant payment sign-off.</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={loadFinanceData} disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Sync
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Customer / Invoice</th>
                    <th className="pb-2 font-medium">Peachtree Ref</th>
                    <th className="pb-2 font-medium text-right">Matched Amount</th>
                    <th className="pb-2 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.slice(0, 6).map((m: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 font-semibold">{m.customerName || m.proposalTitle}</td>
                      <td className="py-2.5 text-muted-foreground">{m.peachtreeInvoiceNo || m.refNo}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">{formatCurrency(m.amount || 0)}</td>
                      <td className="py-2.5 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(m.requestId)}
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Paid
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {matches.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No unverified Peachtree matches pending</p>
            )}
          </Card>

          {/* Pending Field Budget Releases */}
          <Card className="border border-border/60 shadow-sm p-4">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" /> Pending Per-Diem Budget Releases
              </h3>
              <Badge variant="secondary" className="text-[10px]">{budgetReleases.length} Approved</Badge>
            </div>
            <div className="space-y-2">
              {budgetReleases.length > 0 ? (
                budgetReleases.map((fw: any) => (
                  <div key={fw.id} className="p-3 rounded-lg border bg-muted/20 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{fw.customerName || fw.pumpModel || "Field Job"} — {fw.location}</p>
                      <p className="text-[11px] text-muted-foreground">{fw.workers?.length || 0} Field workers assigned • Budget: {Number(fw.cost || 0).toLocaleString()} ETB</p>
                    </div>
                    <Button size="sm" onClick={() => navigate("/fieldwork")} className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold">
                      Release Cash <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No field work budget releases pending GM sign-off</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column (1/3): Universal EOD Activity Log */}
        <div>
          <EodActivityWidget eodReports={eodReports} />
        </div>
      </div>

      {/* Per-Diem Cash Budget Sign-Off Dialog */}
      <Dialog open={!!selectedReleaseFw} onOpenChange={(open) => !open && setSelectedReleaseFw(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <DollarSign className="h-5 w-5 text-blue-600" /> Confirm Per-Diem Cash Release
            </DialogTitle>
            <DialogDescription className="text-xs">
              General Manager has approved this fieldwork installation plan. Confirm cash disbursement for per-diem allowances and travel fuel.
            </DialogDescription>
          </DialogHeader>

          {selectedReleaseFw && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-blue-600" /> Customer:
                  </span>
                  <strong className="text-foreground">{selectedReleaseFw.customerName || selectedReleaseFw.clientName || 'N/A'}</strong>
                </div>

                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-600" /> Location:
                  </span>
                  <strong className="text-foreground">{selectedReleaseFw.location || 'N/A'}</strong>
                </div>

                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5 text-purple-600" /> Pump Model:
                  </span>
                  <strong className="text-foreground">{selectedReleaseFw.pumpModel || 'N/A'}</strong>
                </div>

                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-600" /> Field Crew:
                  </span>
                  <strong className="text-foreground">{(selectedReleaseFw.workers || []).length} Workers assigned</strong>
                </div>

                <div className="flex justify-between items-center border-b pb-1.5">
                  <span className="text-muted-foreground font-medium">Payment Voucher Ref:</span>
                  <span className="font-mono text-foreground font-bold">PAY-FW-{selectedReleaseFw.id}</span>
                </div>

                <div className="flex justify-between items-center pt-1 font-bold text-sm text-blue-600 dark:text-blue-400">
                  <span>Total Per-Diem & Fuel Cash:</span>
                  <span>{Number(selectedReleaseFw.cost || 0).toLocaleString()} ETB</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setSelectedReleaseFw(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={releasing}
              onClick={handleConfirmReleasePerDiem}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {releasing ? "Releasing Cash..." : "Confirm & Release Cash Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
