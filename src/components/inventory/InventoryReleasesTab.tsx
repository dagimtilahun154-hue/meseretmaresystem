import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  CheckCircle2,
  Camera,
  Printer,
  Droplets,
  Zap,
  Wrench,
  Package,
  AlertCircle,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { PendingReleaseJob } from "@/lib/api/inventory";
import { ProductCategory, formatCurrency, getItemProductCategory } from "@/lib/data";
import { QRScannerModal } from "@/components/QRScannerModal";

interface InventoryReleasesTabProps {
  jobs: PendingReleaseJob[];
  onConfirmRelease: (
    jobId: string,
    payload: {
      items: {
        productId?: string;
        productCode?: string;
        name: string;
        category: ProductCategory;
        quantity: number;
        unit?: string;
        serialNumber?: string;
        source: "FROM_STOCK" | "BOUGHT";
      }[];
      companyTools?: string[];
      notes?: string;
    }
  ) => Promise<void>;
  onRefresh: () => void;
}

/**
 * Normalized planned materials extractor helper.
 * Generates the unified checklist items across pumps, equipment, and company tools.
 */
export function getPlannedMaterials(job: PendingReleaseJob): any[] {
  const payload = job.payload || {};
  const plannedMaterials: any[] = [];
  const seenNames = new Set<string>();

  // 1. Pump (support both selectedPumpModel and pumpModel)
  const pumpModel = payload.selectedPumpModel || payload.pumpModel || "";
  if (pumpModel || job.title?.includes("Pump")) {
    const cleanPumpName = pumpModel || "Solar Water Pump";
    plannedMaterials.push({
      id: `PUMP-${job.id}`,
      name: cleanPumpName,
      category: "PUMP" as ProductCategory,
      serialNumber: payload.pumpSerial || "",
      quantity: 1,
      unit: "Piece",
      source: payload.pumpSource || "FROM_STOCK",
    });
    seenNames.add(cleanPumpName.toLowerCase());
    seenNames.add(`water pump model: ${cleanPumpName.toLowerCase()}`);
  }

  // 2. Equipment / Consumables from payload.materials or payload.equipment
  const equipList = (job.materials && job.materials.length > 0)
    ? job.materials
    : (payload.materials || payload.equipment || []);

  equipList.forEach((eq: any, idx: number) => {
    if (eq.category !== "PUMP") {
      let cleanName = eq.name || "";
      if (cleanName.startsWith("Water Pump Model: ")) {
        cleanName = cleanName.replace("Water Pump Model: ", "");
      }

      const key = cleanName.toLowerCase();
      if (seenNames.has(key)) {
        return;
      }
      seenNames.add(key);

      plannedMaterials.push({
        id: eq.productId || `MAT-${job.id}-${idx}`,
        productId: eq.productId,
        productCode: eq.productCode,
        name: cleanName,
        category: eq.category || getItemProductCategory({ name: cleanName } as any),
        serialNumber: eq.serialNumber || "",
        quantity: eq.quantity || eq.quantityTaken || 1,
        unit: eq.unit || "Piece",
        source: eq.source || "FROM_STOCK",
      });
    }
  });

  // 3. Company Tools
  const toolsList = payload.companyTools || [];
  toolsList.forEach((tool: string, idx: number) => {
    const key = tool.toLowerCase();
    if (seenNames.has(key)) {
      return;
    }
    seenNames.add(key);

    plannedMaterials.push({
      id: `TOOL-${job.id}-${idx}`,
      name: tool,
      category: "COMPANY_TOOL" as ProductCategory,
      serialNumber: tool || "",
      quantity: 1,
      unit: "Asset",
      source: "FROM_STOCK",
    });
  });

  return plannedMaterials;
}

export const InventoryReleasesTab: React.FC<InventoryReleasesTabProps> = ({
  jobs,
  onConfirmRelease,
  onRefresh,
}) => {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(jobs[0]?.id || null);
  const [scannedItems, setScannedItems] = useState<Record<string, boolean>>({});
  const [localSerials, setLocalSerials] = useState<Record<string, string>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeScanItem, setActiveScanItem] = useState<{ id: string; name: string } | null>(null);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Toggle job expand
  const toggleExpand = (id: string) => {
    setExpandedJobId(expandedJobId === id ? null : id);
    setScannedItems({});
    setLocalSerials({});
  };

  // Handle QR scan match
  const handleQRScanned = (decoded: string) => {
    const parts = decoded.split(":");
    const scannedCode = parts.length >= 3 ? parts[2] : decoded.trim();

    if (activeScanItem) {
      setScannedItems((prev) => ({ ...prev, [activeScanItem.id]: true }));
      setLocalSerials((prev) => ({ ...prev, [activeScanItem.id]: scannedCode }));
      toast.success(`Verified item: ${activeScanItem.name} (${scannedCode})`);
      setActiveScanItem(null);
    } else if (expandedJobId) {
      const currentJob = jobs.find((j) => j.id === expandedJobId);
      if (currentJob) {
        const plannedMaterials = getPlannedMaterials(currentJob);
        // Find which planned item matches the scannedCode
        const match = plannedMaterials.find(
          (it: any) =>
            String(it.id || "").toLowerCase() === scannedCode.toLowerCase() ||
            String(it.productId || "").toLowerCase() === scannedCode.toLowerCase() ||
            String(it.productCode || "").toLowerCase() === scannedCode.toLowerCase() ||
            String(it.serialNumber || "").toLowerCase() === scannedCode.toLowerCase() ||
            String(it.name || "").toLowerCase().includes(scannedCode.toLowerCase())
        );

        if (match) {
          setScannedItems((prev) => ({ ...prev, [match.id]: true }));
          setLocalSerials((prev) => ({ ...prev, [match.id]: scannedCode }));
          toast.success(`Verified: ${match.name} with code/serial ${scannedCode}`);
        } else {
          toast.error(`Scanned code "${scannedCode}" did not match any requested item.`);
        }
      }
    }
  };

  // Handle inline serial input change (filling)
  const handleSerialChange = (itemId: string, val: string) => {
    setLocalSerials((prev) => ({ ...prev, [itemId]: val }));
  };

  // Print Handover / Release Sheet
  const handlePrintHandover = (job: PendingReleaseJob, items: any[]) => {
    const printWindow = window.open("", "_blank", "width=800,height=800");
    if (!printWindow) {
      toast.error("Please allow popups to print handover release sheet.");
      return;
    }

    const rows = items
      .map(
        (it, idx) => {
          const serial = localSerials[it.id] || it.serialNumber || "—";
          return `
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${it.name}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${serial}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${it.quantity} ${it.unit || "pcs"}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${it.source === "FROM_STOCK" ? "Warehouse Stock" : "Direct Purchase"}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: green; font-weight: bold;">✓ Taken Out</td>
          </tr>
        `;
        }
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Equipment Handover Sheet - ${job.title || job.id}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; text-transform: uppercase; margin-bottom: 4px; color: #0284c7; }
            .header-box { border: 1.5px solid #0f172a; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            table, th, td { border: 1px solid #cbd5e1; }
            th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
            .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-line { border-top: 1px solid #0f172a; margin-top: 50px; text-align: center; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Meseret Mare Equipment Release & Handover Sheet</h1>
          <p style="font-size: 11px; color: #64748b; margin-top: 0;">MESERET MARE ERP / FASIL ZELALEM TRADING</p>

          <div class="header-box">
            <div class="grid">
              <div><strong>Job Title:</strong> ${job.title || "Field Work"}</div>
              <div><strong>Job ID:</strong> ${job.id}</div>
              <div><strong>Customer / Site:</strong> ${job.customerName || job.location || "Site"}</div>
              <div><strong>Assigned TTL:</strong> ${job.assignedTo || "Technical Team Leader"}</div>
              <div><strong>Release Date:</strong> ${new Date().toLocaleDateString()}</div>
              <div><strong>Release Status:</strong> Approved for Dispatch</div>
            </div>
          </div>

          <h3>Planned Materials & Equipment Checklist</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Item Description</th>
                <th>Serial / Asset Tag</th>
                <th>Quantity</th>
                <th>Source</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <p style="font-size: 12px; margin: 0;">Released By (Storekeeper):</p>
              <div class="sig-line">Sign & Stamp</div>
            </div>
            <div>
              <p style="font-size: 12px; margin: 0;">Received By (Technical Team Leader):</p>
              <div class="sig-line">Sign & Date</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExecuteRelease = async (job: PendingReleaseJob, normalizedItems: any[]) => {
    // Integrate manual serials (filling) into the confirmation payload
    const finalItems = normalizedItems.map((item) => ({
      ...item,
      serialNumber: localSerials[item.id] !== undefined ? localSerials[item.id] : (item.serialNumber || ""),
    }));

    try {
      setSubmitting(true);
      await onConfirmRelease(job.id, {
        items: finalItems,
        companyTools: job.plannedCompanyTools || [],
        notes: releaseNotes,
      });

      toast.success(`Job ${job.title || job.id} materials successfully released! Stock updated.`);
      setScannedItems({});
      setLocalSerials({});
      setReleaseNotes("");
      onRefresh();
    } catch (err: any) {
      console.error("Release error:", err);
      toast.error(err.response?.data?.message || "Failed to confirm equipment release");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600" />
            Field Work Material "Taking Out" (Release) Queue
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirm, scan, or fill serial numbers to take items out of the inventory plan.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-3 py-1">
          {jobs.length} Active Field Jobs Awaiting Warehouse Release
        </Badge>
      </div>

      {jobs.length === 0 ? (
        <Card className="bg-card border border-border/60 shadow-sm py-16 text-center rounded-2xl">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-foreground">All Field Job Materials Taken Out (Released)</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              No pending jobs currently waiting for equipment takeout. Approved field work plans will appear here automatically.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const plannedMaterials = getPlannedMaterials(job);
            const allScanned = plannedMaterials.length > 0 && plannedMaterials.every((m) => scannedItems[m.id]);

            return (
              <Card key={job.id} className="border border-border/60 shadow-sm bg-card rounded-2xl overflow-hidden">
                {/* Collapsible Header */}
                <div
                  onClick={() => toggleExpand(job.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        {job.title || `Job #${job.id.slice(-6)}`}
                        <Badge
                          variant={job.status === "Approved and ready to go" ? "default" : "outline"}
                          className={
                            job.status === "Approved and ready to go"
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {job.status}
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customer: <strong className="text-foreground">{job.customerName || "General Client"}</strong> •
                        Site: <strong className="text-foreground">{job.location || "N/A"}</strong> •
                        TTL: <strong className="text-foreground">{job.assignedTo || "Unassigned"}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="text-right mr-2 hidden sm:block">
                      <div className="text-xs font-bold text-foreground">
                        {plannedMaterials.length} Items Planned
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {allScanned ? "✅ Fully Verified" : `${Object.keys(scannedItems).length}/${plannedMaterials.length} Verified`}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>

                {/* Collapsible Body */}
                {isExpanded && (
                  <div className="p-4 border-t border-border/60 bg-muted/10 space-y-4 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-primary" />
                        Takout Materials Checklist
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveScanItem(null);
                            setScannerOpen(true);
                          }}
                          className="h-8 text-xs font-semibold gap-1.5"
                        >
                          <Camera className="h-3.5 w-3.5" /> Live Camera Scanner
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintHandover(job, plannedMaterials)}
                          className="h-8 text-xs font-semibold gap-1.5"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Handover Sheet
                        </Button>
                      </div>
                    </div>

                    <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="hover:bg-transparent border-b border-border/60">
                            <TableHead className="text-xs font-bold text-muted-foreground py-2">Category</TableHead>
                            <TableHead className="text-xs font-bold text-muted-foreground py-2">Item Description</TableHead>
                            <TableHead className="text-xs font-bold text-muted-foreground py-2">Fill Serial Number</TableHead>
                            <TableHead className="text-xs font-bold text-muted-foreground py-2 text-center">Qty</TableHead>
                            <TableHead className="text-xs font-bold text-muted-foreground py-2 text-center">Source</TableHead>
                            <TableHead className="text-xs font-bold text-muted-foreground py-2 text-center">Status</TableHead>
                            <TableHead className="text-xs font-bold text-muted-foreground py-2 text-right">Choose</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plannedMaterials.map((item) => {
                            const isVerified = Boolean(scannedItems[item.id]);
                            return (
                              <TableRow key={item.id} className="border-b border-border/40 hover:bg-muted/20">
                                <TableCell className="py-2.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-bold ${
                                      item.category === "PUMP"
                                        ? "bg-sky-50 text-sky-700 border-sky-200"
                                        : item.category === "PUMP_EQUIPMENT"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : item.category === "SOLAR_PANEL"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : item.category === "COMPANY_TOOL"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-purple-50 text-purple-700 border-purple-200"
                                    }`}
                                  >
                                    {item.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 font-semibold text-xs text-foreground">
                                  {item.name}
                                </TableCell>
                                <TableCell className="py-2.5 font-mono text-xs">
                                  {item.category === "PUMP" ? (
                                    <Input
                                      type="text"
                                      placeholder="Fill serial #"
                                      value={localSerials[item.id] !== undefined ? localSerials[item.id] : (item.serialNumber || "")}
                                      onChange={(e) => handleSerialChange(item.id, e.target.value)}
                                      className="h-8 text-xs font-mono max-w-[160px] bg-background border-border/60 text-foreground"
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2.5 text-center font-mono text-xs font-bold">
                                  {item.quantity} {item.unit}
                                </TableCell>
                                <TableCell className="py-2.5 text-center">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-bold ${
                                      item.source === "FROM_STOCK"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    {item.source === "FROM_STOCK" ? "● From Stock" : "🛒 Bought"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 text-center">
                                  {isVerified ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">Pending</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2.5 text-right">
                                  <Button
                                    variant={isVerified ? "outline" : "default"}
                                    size="sm"
                                    onClick={() => {
                                      setScannedItems((prev) => ({ ...prev, [item.id]: !isVerified }));
                                      if (!isVerified) toast.success(`Checked off: ${item.name}`);
                                    }}
                                    className={`h-7 text-[11px] px-2.5 ${
                                      isVerified
                                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }`}
                                  >
                                    {isVerified ? "Undo" : "Check Off"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Release Confirmation Bar */}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <Input
                        placeholder="Add storekeeper handover comments / notes..."
                        value={releaseNotes}
                        onChange={(e) => setReleaseNotes(e.target.value)}
                        className="bg-background border-border/60 text-xs h-9 flex-1"
                      />
                      <Button
                        onClick={() => handleExecuteRelease(job, plannedMaterials)}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 shrink-0 shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Confirm Release & Deduct Stock
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Camera Scanner Modal */}
      <QRScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleQRScanned}
        expectedItemName={activeScanItem?.name}
      />
    </div>
  );
};
