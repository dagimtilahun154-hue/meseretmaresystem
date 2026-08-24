import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  MapPin,
  Phone,
  Droplets,
  Sun,
  Wrench,
  CreditCard,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Printer,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { CompanyDocumentHeader } from "@/components/common/CompanyDocumentHeader";

interface ClientFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: any | null;
}

export function ClientFileModal({ open, onOpenChange, proposal }: ClientFileModalProps) {
  const navigate = useNavigate();
  if (!proposal) return null;

  const data = proposal.dataCollection || {};
  const site = data.generalSite || {};
  const solar = data.solarResource || {};
  const water = data.waterSource || {};
  const discharge = data.dischargeMeasurement || {};
  const layout = data.irrigationLayout || {};
  const crop = data.cropSoil || {};
  const req = data.solarRequirement || {};
  const equipment = proposal.calculatedEquipment || [];

  const formatMoney = (val: number | string | undefined | null) => {
    if (!val) return "—";
    const num = Number(val);
    return isNaN(num) ? "—" : `${num.toLocaleString()} ETB`;
  };

  const handlePrint = () => {
    window.print();
  };

  const statusLabel = 
    proposal.status === "APPROVED_TM" ? "TM Approved (Payable)" :
    proposal.status === "PAID" ? "Paid (Awaiting Dispatch)" :
    proposal.status === "FIELDWORK_CREATED" ? "Fieldwork Active" :
    proposal.status === "PENDING_TM" ? "Awaiting TM Check" :
    proposal.status || "Draft";

  const statusColor = 
    proposal.status === "APPROVED_TM" ? "bg-blue-600 text-white" :
    proposal.status === "PAID" ? "bg-green-600 text-white" :
    proposal.status === "PENDING_TM" ? "bg-amber-600 text-white" :
    "bg-slate-700 text-white";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-none print:max-h-none print:overflow-visible">
        
        {/* Top Actions Bar (Web View Only) */}
        <div className="print:hidden flex items-center justify-between gap-4 border-b pb-3 mb-2">
          <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Sizing Technical Dossier & Assessment Sheet
          </DialogTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); navigate(`/customers/${encodeURIComponent(proposal.clientName)}`); }} className="gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
              <ExternalLink className="h-3.5 w-3.5" /> Full 360 Dossier
            </Button>
            <Button size="sm" variant="default" onClick={handlePrint} className="gap-1 text-xs font-bold bg-primary hover:bg-primary/90 text-white">
              <Printer className="h-3.5 w-3.5" /> Print Technical PDF
            </Button>
          </div>
        </div>

        {/* 1. Official Corporate Letterhead Header */}
        <CompanyDocumentHeader
          documentTitle="PUMP SIZING TECHNICAL ASSESSMENT & DOSSIER"
          subtitle="Official Solar Water Pumping System Specification Sheet"
          refNumber={proposal.id ? `SZ-${proposal.id.substring(0, 8).toUpperCase()}` : "SZ-1001"}
          date={proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }) : new Date().toLocaleDateString("en-GB")}
          statusBadge={statusLabel}
          statusColor={statusColor}
          showContactBar={true}
        />

        {/* 2. Client Quick Summary Metrics Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-4 rounded-xl border border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Selected Pump</span>
            <strong className="text-primary font-bold">{proposal.selectedPumpModel || req.proposedPumpCapacity || "—"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Daily Water Need</span>
            <strong className="font-mono font-bold">{proposal.dailyWaterNeed || req.dailyWaterDemand || "—"} m³/day</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Dynamic Lift</span>
            <strong className="font-mono font-bold">{proposal.verticalLift || req.totalPumpingHead || "—"} meters</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Package Price</span>
            <strong className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatMoney(proposal.totalPrice)}
            </strong>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: SITE & CUSTOMER PROFILE */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-2 print:break-inside-avoid">
          <div className="flex items-center gap-2 border-b pb-1.5">
            <User className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Section 1: General Site & Contact Profile
            </h4>
          </div>

          <Card className="p-4 border shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Client / Farm Name</span>
                <strong className="text-foreground block">{proposal.clientName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Contact Person</span>
                <strong className="text-foreground block">{site.contactPerson || "—"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Phone Number</span>
                <strong className="text-foreground font-mono block">{site.phone || "—"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Region / Zone</span>
                <span className="text-foreground block">{site.region || "—"} / {site.zone || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Woreda / Kebele</span>
                <span className="text-foreground block">{site.woreda || "—"} / {site.kebele || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Village / Location</span>
                <span className="text-foreground block">{site.village || proposal.address || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">GPS Coordinates</span>
                <span className="font-mono text-muted-foreground block">
                  {proposal.latitude ? `${Number(proposal.latitude).toFixed(4)}, ${Number(proposal.longitude).toFixed(4)}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Road Accessibility</span>
                <span className="text-foreground block">{site.roadAccessibility || "Good (All-weather)"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Beneficiaries</span>
                <span className="text-foreground block">
                  {site.beneficiaries?.total ? `${site.beneficiaries.total} People (M: ${site.beneficiaries.male || 0}, F: ${site.beneficiaries.female || 0})` : "—"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: HYDRAULIC & SOLAR FORM */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-2 print:break-inside-avoid">
          <div className="flex items-center gap-2 border-b pb-1.5">
            <Droplets className="h-4 w-4 text-sky-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Section 2: Hydraulic Water Source & Solar Power Configuration
            </h4>
          </div>

          <Card className="p-4 border shadow-sm space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg border bg-muted/15 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Water Source Type</span>
                <strong className="text-foreground font-bold">{water.sourceType || proposal.waterSource || "Borehole"}</strong>
              </div>
              <div className="p-3 rounded-lg border bg-muted/15 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Total Well Depth</span>
                <strong className="font-mono font-bold text-foreground">{water.wellDepth ? `${water.wellDepth} m` : "—"}</strong>
              </div>
              <div className="p-3 rounded-lg border bg-muted/15 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Static Water Level</span>
                <strong className="font-mono font-bold text-foreground">{water.staticWaterLevel ? `${water.staticWaterLevel} m` : "—"}</strong>
              </div>
              <div className="p-3 rounded-lg border bg-muted/15 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Dynamic Water Level</span>
                <strong className="font-mono font-bold text-foreground">{water.dynamicWaterLevel ? `${water.dynamicWaterLevel} m` : "—"}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t pt-3">
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Solar Module Rating</span>
                <strong className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {solar.moduleWattage || 550}W Tier-1 Mono
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Array Peak Power</span>
                <strong className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {solar.solarWattage || proposal.panelPower || 1650}W Peak
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Irrigable Area</span>
                <strong className="text-foreground">{crop.totalIrrigableArea ? `${crop.totalIrrigableArea} ha` : "—"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground uppercase text-[10px] font-bold block">Main Crop Types</span>
                <strong className="text-foreground">{crop.mainExistingCrops || "Cash Crops / Vegetables"}</strong>
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: ITEMIZED EQUIPMENT BOM */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-2 print:break-inside-avoid">
          <div className="flex items-center gap-2 border-b pb-1.5">
            <Layers className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Section 3: Itemized Equipment Bill of Materials (BOM)
            </h4>
          </div>

          <Card className="p-4 border shadow-sm">
            {equipment.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No equipment list generated.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {equipment.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/15">
                        <td className="p-2.5 font-semibold text-foreground">{item.name || item.productName || "Equipment Item"}</td>
                        <td className="p-2.5 text-muted-foreground">{item.category || "Consumables"}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{item.qty || item.quantity || 1}</td>
                        <td className="p-2.5 text-right font-mono text-muted-foreground">{formatMoney(item.price)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-foreground">
                          {formatMoney((item.qty || item.quantity || 1) * (item.price || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: WORKFLOW AUDIT TRAIL */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-2 print:break-inside-avoid">
          <div className="flex items-center gap-2 border-b pb-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Section 4: Engineering & Operational Sign-off Trail
            </h4>
          </div>

          <Card className="p-4 border shadow-sm">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-foreground">Initial Assessment Prepared:</span>
                </div>
                <span className="font-mono text-muted-foreground">
                  {proposal.preparedByName || "Sales / Fieldwork Lead"} on {new Date(proposal.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>

              {proposal.checkedByName && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-blue-500/10 border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-blue-900 dark:text-blue-300">Technical Check Verified:</span>
                  </div>
                  <span className="font-mono text-blue-800 dark:text-blue-300">
                    TM {proposal.checkedByName}
                  </span>
                </div>
              )}

              {proposal.status === "PAID" && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-900 dark:text-emerald-300">Finance Payment Cleared:</span>
                  </div>
                  <span className="font-mono text-emerald-800 dark:text-emerald-300">
                    Finance Admin Authorized
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Modal Footer (Web View Only) */}
        <div className="flex justify-end gap-2 pt-4 border-t print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Technical Sheet
          </Button>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white font-bold gap-1">
            <Printer className="h-3.5 w-3.5" /> Print / Export PDF
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
