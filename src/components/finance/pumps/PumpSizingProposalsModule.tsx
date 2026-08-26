import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Droplets, Clock, MapPin, FileText, CreditCard, CheckCircle2, Check, RefreshCw } from "lucide-react";
import { ClientFileModal } from "@/components/ClientFileModal";
import { apiClient } from "@/lib/api/client";
import { financeCenterDB } from "@/lib/db-service";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

interface PumpSizingProposalsModuleProps {
  selectedEntity?: "FZ" | "MM";
  onSwitchToMM?: () => void;
  canApprove: boolean;
  onRefreshGlobal?: () => void;
}

export function PumpSizingProposalsModule({
  selectedEntity = "MM",
  onSwitchToMM,
  canApprove,
  onRefreshGlobal,
}: PumpSizingProposalsModuleProps) {
  const [sizingProposals, setSizingProposals] = useState<any[]>([]);
  const [loadingSizing, setLoadingSizing] = useState<boolean>(false);
  const [fileModalOpen, setFileModalOpen] = useState<boolean>(false);
  const [fileModalProposal, setFileModalProposal] = useState<any | null>(null);

  // Commercial Pricing & Bank Payment Registration Modal State
  const [pricingDialog, setPricingDialog] = useState<boolean>(false);
  const [selectedPricingProposal, setSelectedPricingProposal] = useState<any | null>(null);
  const [ttlUsers, setTtlUsers] = useState<any[]>([]);
  const [submittingPricingPayment, setSubmittingPricingPayment] = useState<boolean>(false);
  const [pricingForm, setPricingForm] = useState({
    hardwareSellingPrice: 0,
    installationFee: 50000,
    selectedBank: "Commercial Bank of Ethiopia (CBE)",
    bankSlipNumber: "",
    amountReceived: 0,
    assignedTTL: "",
    paymentNote: "",
  });

  const fetchSizingProposals = async () => {
    setLoadingSizing(true);
    try {
      const res = await apiClient.get("/sizing-requests");
      setSizingProposals(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to load sizing proposals in Finance Center", e);
      toast.error("Failed to load sizing proposals");
    } finally {
      setLoadingSizing(false);
    }
  };

  const fetchTTLUsers = async () => {
    try {
      const res = await apiClient.get("/users");
      const users = Array.isArray(res.data) ? res.data : [];
      const fieldCrew = users.filter((u: any) => {
        const roles = u.roles?.map((r: any) => r.role?.name || r.name || r) || [u.role];
        return roles.some((r: string) => ["ttl", "fieldwork", "technician", "manager"].includes(r));
      });
      setTtlUsers(fieldCrew.length > 0 ? fieldCrew : users);
    } catch (e) {
      console.error("Failed to load TTL users", e);
    }
  };

  useEffect(() => {
    fetchSizingProposals();
    fetchTTLUsers();
  }, []);

  const openCommercialPricingModal = (proposal: any) => {
    setSelectedPricingProposal(proposal);
    const baseCost = Number(proposal.totalCost || proposal.totalPrice || 250000);
    const defaultHardwarePrice = Math.round(baseCost * 1.25);
    const defaultInstallFee = 45000;
    const defaultTotal = defaultHardwarePrice + defaultInstallFee;

    setPricingForm({
      hardwareSellingPrice: defaultHardwarePrice,
      installationFee: defaultInstallFee,
      selectedBank: "Commercial Bank of Ethiopia (CBE)",
      bankSlipNumber: `FT${Date.now().toString().slice(-8)}`,
      amountReceived: defaultTotal,
      assignedTTL: ttlUsers[0]?.username || ttlUsers[0]?.displayName || "",
      paymentNote: `Deposit confirmed by Finance for pump ${proposal.selectedPumpModel || "system"}`,
    });
    setPricingDialog(true);
  };

  const handleConfirmCommercialPayment = async () => {
    if (!selectedPricingProposal) return;
    if (!pricingForm.bankSlipNumber.trim()) {
      toast.error("Please enter the Bank Deposit Slip / Reference Number");
      return;
    }
    if (pricingForm.amountReceived <= 0) {
      toast.error("Please enter a valid amount received");
      return;
    }

    setSubmittingPricingPayment(true);
    try {
      // 1. Confirm payment on Sizing Proposal
      await apiClient.patch(`/sizing-requests/${selectedPricingProposal.id}/finance-pay`);

      // 2. Register real Cash Flow entry in Finance DB so Treasury & Charts update in real-time
      try {
        await financeCenterDB.save("cash-flow", {
          id: crypto.randomUUID(),
          type: "income",
          category: "Solar Pump Commercial Project",
          amount: Number(pricingForm.amountReceived),
          description: `Pump Deposit (${selectedPricingProposal.clientName}) - Slip #${pricingForm.bankSlipNumber} [${pricingForm.selectedBank}]`,
          date: new Date().toISOString().slice(0, 10),
          status: "approved",
        });
      } catch (cfErr) {
        console.warn("Could not save cash-flow entry directly:", cfErr);
      }

      // 3. If a TTL is selected, immediately create and assign the Fieldwork
      if (pricingForm.assignedTTL) {
        try {
          await apiClient.post(`/sizing-requests/${selectedPricingProposal.id}/create-fieldwork`, {
            assignedTo: pricingForm.assignedTTL,
          });
          toast.success(`Payment verified and Fieldwork dispatched to TTL ${pricingForm.assignedTTL}!`);
        } catch (fwErr) {
          console.warn("Fieldwork auto-dispatch note:", fwErr);
          toast.success("Payment registered! Proposal marked as Paid.");
        }
      } else {
        toast.success("Payment registered successfully! Proposal marked as Paid.");
      }

      setPricingDialog(false);
      fetchSizingProposals();
      onRefreshGlobal?.();
    } catch (e: any) {
      console.error("Payment confirmation failed", e);
      toast.error(e.response?.data?.message || "Failed to confirm payment.");
    } finally {
      setSubmittingPricingPayment(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Commercial Pricing, Installation Fees & Payment Collections
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Finance pricing authority: Inspect equipment base costs, configure installation fees & profit margins, verify bank deposit slips, and authorize fieldwork dispatches with dedicated TTL assignment.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={fetchSizingProposals} disabled={loadingSizing} className="gap-1.5 font-semibold">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingSizing ? "animate-spin" : ""}`} /> Refresh Proposals
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-bold">Client & Location</TableHead>
                <TableHead className="font-bold">Engineered Pump Model</TableHead>
                <TableHead className="font-bold">Hydraulic Specs</TableHead>
                <TableHead className="font-bold text-right">Equipment Base Cost</TableHead>
                <TableHead className="font-bold text-right">Quoted Package Total</TableHead>
                <TableHead className="font-bold text-center">Pipeline Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizingProposals.map((p) => {
                const baseCost = Number(p.totalCost || p.totalPrice || 250000);
                const quotedPrice = Number(p.totalPrice || baseCost * 1.25 + 45000);

                return (
                  <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="font-black text-sm text-foreground block">{p.clientName}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-amber-500" /> {p.address || "Customer Site"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary text-xs block">{p.selectedPumpModel || "Solar Pump System"}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Proposal #{p.id}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div><strong>Demand:</strong> {p.dailyWaterNeed || "20"} m³/day</div>
                      <div><strong>Lift:</strong> {p.headLift || p.verticalLift || "45"} m</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatCurrency(baseCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-sm text-emerald-600">
                      {formatCurrency(quotedPrice)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        p.status === "APPROVED_TM" ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300" :
                        p.status === "PAID" ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" :
                        p.status === "FIELDWORK_CREATED" || p.status === "FIELDWORK_INITIATED" ? "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300" :
                        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      }>
                        {p.status === "APPROVED_TM" ? "TM Approved (Awaiting Price/Pay)" :
                         p.status === "PAID" ? "Paid (Awaiting Crew)" :
                         p.status === "FIELDWORK_CREATED" || p.status === "FIELDWORK_INITIATED" ? "Field Crew Dispatched" : p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" className="gap-1 text-xs font-semibold" onClick={() => { setFileModalProposal(p); setFileModalOpen(true); }}>
                          <FileText className="h-3.5 w-3.5 text-primary" /> Dossier
                        </Button>

                        {p.status === "APPROVED_TM" && canApprove && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-xs shadow-sm"
                            onClick={() => openCommercialPricingModal(p)}
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Price & Record Payment
                          </Button>
                        )}

                        {(p.status === "PAID" || p.status === "FIELDWORK_CREATED" || p.status === "FIELDWORK_INITIATED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-xs font-bold gap-1"
                            onClick={() => openCommercialPricingModal(p)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> View Payment Slip
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sizingProposals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No sizing proposals currently awaiting pricing or payment verification.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Commercial Pricing & Bank Deposit Registration Dialog */}
      <Dialog open={pricingDialog} onOpenChange={setPricingDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Commercial Pricing & Bank Payment Verification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review calculated hardware costs, configure installation fees, confirm bank deposit slip, and assign the Technical Team Leader (TTL).
            </DialogDescription>
          </DialogHeader>

          {selectedPricingProposal && (
            <div className="space-y-5 pt-2 text-xs">
              {/* Client & Technical Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">Client Account</span>
                    <strong className="text-sm text-white">{selectedPricingProposal.clientName}</strong>
                    <span className="text-[11px] text-slate-300 block">{selectedPricingProposal.address || "Customer Site"}</span>
                  </div>
                  <Badge className="bg-sky-600 text-white text-[10px] font-mono">
                    PROPOSAL #{selectedPricingProposal.id}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px]">
                  <div>Pump Model: <strong className="text-amber-300">{selectedPricingProposal.selectedPumpModel}</strong></div>
                  <div>Water Need: <strong>{selectedPricingProposal.dailyWaterNeed || "20"} m³/day</strong></div>
                  <div>Head/Lift: <strong>{selectedPricingProposal.headLift || selectedPricingProposal.verticalLift || "45"} m</strong></div>
                </div>
              </div>

              {/* Section 1: Commercial Pricing & Margins */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-primary block">
                  1. Commercial Pricing & Installation Fee Setting
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Hardware Selling Price (ETB)</Label>
                    <Input
                      type="number"
                      value={pricingForm.hardwareSellingPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPricingForm(prev => ({
                          ...prev,
                          hardwareSellingPrice: val,
                          amountReceived: val + prev.installationFee
                        }));
                      }}
                      className="font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Store inventory base cost: {formatCurrency(Number(selectedPricingProposal.totalCost || selectedPricingProposal.totalPrice || 250000))}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Field Installation Fee (ETB)</Label>
                    <Input
                      type="number"
                      value={pricingForm.installationFee}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPricingForm(prev => ({
                          ...prev,
                          installationFee: val,
                          amountReceived: prev.hardwareSellingPrice + val
                        }));
                      }}
                      className="font-mono text-xs font-bold"
                    />
                    <span className="text-[10px] text-muted-foreground">Configured based on well depth & location distance</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">Total Official Client Quotation:</span>
                  <strong className="text-base font-black text-emerald-600 font-mono">
                    {formatCurrency(pricingForm.hardwareSellingPrice + pricingForm.installationFee)}
                  </strong>
                </div>
              </div>

              {/* Section 2: Bank Deposit Registration */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-primary block">
                  2. Bank Deposit Verification & Receipt
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Receiving Ethiopian Bank / Channel</Label>
                    <Select
                      value={pricingForm.selectedBank}
                      onValueChange={(v) => setPricingForm(prev => ({ ...prev, selectedBank: v }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</SelectItem>
                        <SelectItem value="Awash Bank">Awash Bank</SelectItem>
                        <SelectItem value="Dashen Bank">Dashen Bank</SelectItem>
                        <SelectItem value="Bank of Abyssinia">Bank of Abyssinia</SelectItem>
                        <SelectItem value="Nib International Bank">Nib International Bank</SelectItem>
                        <SelectItem value="Cooperative Bank of Oromia (Coop)">Cooperative Bank of Oromia</SelectItem>
                        <SelectItem value="Telebirr SuperApp">Telebirr SuperApp</SelectItem>
                        <SelectItem value="Cash in Safe / Office">Cash in Safe / Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Deposit Slip / Transaction Reference #</Label>
                    <Input
                      value={pricingForm.bankSlipNumber}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, bankSlipNumber: e.target.value }))}
                      placeholder="e.g. FT2623098124"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Amount Received (ETB)</Label>
                    <Input
                      type="number"
                      value={pricingForm.amountReceived}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, amountReceived: Number(e.target.value) }))}
                      className="font-mono text-xs font-bold text-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Assign Technical Team Leader (TTL)</Label>
                    <Select
                      value={pricingForm.assignedTTL}
                      onValueChange={(v) => setPricingForm(prev => ({ ...prev, assignedTTL: v }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select TTL to Lead Fieldwork" />
                      </SelectTrigger>
                      <SelectContent>
                        {ttlUsers.map((u: any) => (
                          <SelectItem key={u.id || u.username} value={u.username || u.displayName || u.id}>
                            {u.displayName || u.username} ({u.role || "Technical Lead"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setPricingDialog(false)} disabled={submittingPricingPayment}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCommercialPayment}
              disabled={submittingPricingPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <Check className="h-4 w-4" />
              {submittingPricingPayment ? "Processing..." : "Confirm Payment & Release to Fieldwork"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientFileModal
        open={fileModalOpen}
        onOpenChange={setFileModalOpen}
        proposal={fileModalProposal}
      />
    </div>
  );
}
