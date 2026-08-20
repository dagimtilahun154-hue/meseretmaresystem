import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Package,
  Wrench,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

interface InventoryReturnsTabProps {
  jobs: any[];
  onRefresh: () => void;
}

export const InventoryReturnsTab: React.FC<InventoryReturnsTabProps> = ({
  jobs,
  onRefresh,
}) => {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(jobs[0]?.id || null);
  const [checkedOutTools, setCheckedOutTools] = useState<Record<string, any[]>>({});
  const [localMaterials, setLocalMaterials] = useState<Record<string, Record<string, number>>>({});
  const [localTools, setLocalTools] = useState<Record<string, Record<string, { condition: string; notes: string; verified: boolean }>>>({});
  const [verificationNotes, setVerificationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load checked out tools for a job
  const fetchCheckedOutTools = async (jobId: string) => {
    try {
      const response = await apiClient.get(`/fieldwork-assets/job/${jobId}`);
      setCheckedOutTools((prev) => ({ ...prev, [jobId]: response.data }));
      
      const initialTools: Record<string, { condition: string; notes: string; verified: boolean }> = {};
      response.data.forEach((item: any) => {
        if (item.status === 'CHECKED_OUT') {
          initialTools[item.companyAssetId] = { condition: 'GOOD', notes: '', verified: true };
        }
      });
      setLocalTools((prev) => ({ ...prev, [jobId]: initialTools }));
    } catch (e) {
      console.error("Failed to load checked out tools:", e);
    }
  };

  const toggleExpand = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      setVerificationNotes("");
      if (!checkedOutTools[jobId]) {
        fetchCheckedOutTools(jobId);
      }
    }
  };

  useEffect(() => {
    if (jobs.length > 0 && !expandedJobId) {
      setExpandedJobId(jobs[0].id);
      fetchCheckedOutTools(jobs[0].id);
    }
  }, [jobs, expandedJobId]);

  // Handle material verification quantity change
  const handleMaterialQtyChange = (jobId: string, name: string, val: number) => {
    setLocalMaterials((prev) => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || {}),
        [name]: Math.max(0, val),
      },
    }));
  };

  // Handle tool verification change
  const handleToolChange = (jobId: string, assetId: string, field: string, value: any) => {
    setLocalTools((prev) => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || {}),
        [assetId]: {
          ...(prev[jobId]?.[assetId] || { condition: 'GOOD', notes: '', verified: true }),
          [field]: value,
        },
      },
    }));
  };

  const handleConfirmReturns = async (job: any) => {
    const returnForms = job.payload?.returnForms || [];
    const latestReturnForm = returnForms[returnForms.length - 1] || {};
    const returnedMaterials = latestReturnForm.returnedMaterials || [];

    // Filter out fuel since fuel is not returned
    const finalMaterials = returnedMaterials
      .filter((m: any) => !String(m.name || '').toLowerCase().includes('fuel'))
      .map((m: any) => ({
        productId: m.productId,
        name: m.name,
        quantity: localMaterials[job.id]?.[m.name] !== undefined ? localMaterials[job.id][m.name] : m.quantity,
        unit: m.unit || "Piece",
      }));

    const activeTools = (checkedOutTools[job.id] || []).filter(t => t.status === 'CHECKED_OUT');
    const finalTools = activeTools
      .filter(t => localTools[job.id]?.[t.companyAssetId]?.verified ?? true)
      .map((t) => ({
        companyAssetId: t.companyAssetId,
        name: t.asset?.name || t.companyAssetId,
        condition: localTools[job.id]?.[t.companyAssetId]?.condition || 'GOOD',
        notes: localTools[job.id]?.[t.companyAssetId]?.notes || '',
      }));

    try {
      setSubmitting(true);
      await apiClient.patch(`/fieldwork/${job.id}/storekeeper-verify`, {
        verifiedMaterials: finalMaterials,
        verifiedTools: finalTools,
        notes: verificationNotes,
      });

      toast.success(`Returns for job "${job.pumpModel || job.title}" verified and received successfully! Stock updated.`);
      setVerificationNotes("");
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to confirm returned assets");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Banner */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-indigo-600 animate-spin-slow" />
            Field Return Warehouse Receipt Queue
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verify unused materials, check off company tools, mark asset conditions, and sign off returns into stock.
          </p>
        </div>
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold px-3 py-1">
          {jobs.length} Jobs Awaiting Return Verification
        </Badge>
      </div>

      {jobs.length === 0 ? (
        <Card className="bg-card border border-border/60 shadow-sm py-16 text-center rounded-2xl">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-foreground">No Pending Returns</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              All returned tools and extra items have been verified and reconciled. Completed field return forms will appear here automatically.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const returnForms = job.payload?.returnForms || [];
            const latestReturnForm = returnForms[returnForms.length - 1] || {};
            const returnedMaterials = latestReturnForm.returnedMaterials || [];
            const activeTools = (checkedOutTools[job.id] || []).filter(t => t.status === 'CHECKED_OUT');

            return (
              <Card key={job.id} className="border border-border/60 shadow-sm bg-card rounded-2xl overflow-hidden">
                {/* Collapsible Header */}
                <div
                  onClick={() => toggleExpand(job.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        {job.pumpModel || job.title || `Job #${job.id.slice(-6)}`}
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50 text-[10px]">
                          Pending Verification
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Client: <strong className="text-foreground">{job.customerName || "General Client"}</strong> •
                        TTL: <strong className="text-foreground">{job.assignedTo || "Unassigned"}</strong> •
                        Dates: <strong className="text-foreground">{job.startDate} to {job.endDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="text-right mr-2 hidden sm:block">
                      <div className="text-xs font-bold text-foreground">
                        {returnedMaterials.length} Materials • {activeTools.length} Tools
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Submitted by {latestReturnForm.workerName || "TTL"}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Verification Form */}
                {isExpanded && (
                  <div className="p-4 border-t border-border/60 bg-muted/10 space-y-5 animate-in fade-in-50 duration-150">
                    
                    {/* Logistical Details / Comments from TTL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-card p-3 rounded-xl border border-border/60 space-y-1.5 shadow-sm">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Crew Completion Notes</span>
                        <p className="text-foreground italic">
                          "{latestReturnForm.comments || latestReturnForm.otherNotes || "No comments submitted by TTL."}"
                        </p>
                        <span className="text-[9px] text-muted-foreground block text-right">
                          Submitted Date: {latestReturnForm.date || job.endDate}
                        </span>
                      </div>

                      {/* Photo urls info */}
                      {Array.isArray(latestReturnForm.completionPhotos) && latestReturnForm.completionPhotos.length > 0 && (
                        <div className="bg-card p-3 rounded-xl border border-border/60 space-y-1.5 shadow-sm">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Site Photos Submitted ({latestReturnForm.completionPhotos.length})</span>
                          <div className="flex flex-wrap gap-1.5">
                            {latestReturnForm.completionPhotos.map((url: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-[9px] font-semibold gap-1 py-0.5 px-2">
                                <FileText className="h-3 w-3" /> Photo #{idx + 1}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 1: Materials & Consumables Returns Verification */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-indigo-600" />
                        1. Returned Unused Materials / Consumables (To Reconcile Stock)
                      </div>
                      
                      <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b border-border/60">
                              <TableHead className="text-xs font-bold text-muted-foreground py-2">Material Description</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 text-center">Checkout Qty</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 text-center">Crew Claimed Return</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 text-center w-[150px]">Verified Return Qty</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 text-center">Unit</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {returnedMaterials.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                                  No consumables/materials returned.
                                </TableCell>
                              </TableRow>
                            ) : (
                              returnedMaterials.map((item: any, idx: number) => {
                                const isFuel = String(item.name || '').toLowerCase().includes('fuel');
                                const verifiedQty = localMaterials[job.id]?.[item.name] !== undefined
                                  ? localMaterials[job.id][item.name]
                                  : item.quantity;

                                // Find checkout qty in job payload
                                const checkoutItem = job.equipment?.find((eq: any) => eq.name === item.name);
                                const checkoutQty = checkoutItem ? checkoutItem.quantityTaken : "N/A";

                                return (
                                  <TableRow key={idx} className="border-b border-border/40 hover:bg-muted/10">
                                    <TableCell className="py-2.5 font-semibold text-xs text-foreground">
                                      {item.name}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-center text-xs font-mono">
                                      {checkoutQty}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-center text-xs font-mono font-bold text-indigo-600">
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-center">
                                      {isFuel ? (
                                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                                          Consumed (Not returned)
                                        </Badge>
                                      ) : (
                                        <Input
                                          type="number"
                                          step="any"
                                          value={verifiedQty}
                                          onChange={(e) => handleMaterialQtyChange(job.id, item.name, parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs font-mono text-center w-24 mx-auto bg-background"
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-center text-xs text-muted-foreground">
                                      {item.unit || "Piece"}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-right">
                                      {isFuel ? (
                                        <span className="text-[10px] text-amber-600 font-semibold">Fuel Consumed</span>
                                      ) : verifiedQty === item.quantity ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                                          Matches Crew Claim
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">
                                          Adjusted ({verifiedQty})
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Section 2: Company Tools Returns Verification */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Wrench className="h-4 w-4 text-indigo-600" />
                        2. Mandatory Company Tools Returns Checklist (Verify Condition)
                      </div>
                      
                      <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-b border-border/60">
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 w-[40px] text-center">Receipt</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2">Tool Asset Name</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2">Serial Number</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 w-[160px]">Mark Condition</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2">Storekeeper Return Notes</TableHead>
                              <TableHead className="text-xs font-bold text-muted-foreground py-2 text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeTools.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                                  No company tools checked out for this job.
                                </TableCell>
                              </TableRow>
                            ) : (
                              activeTools.map((item) => {
                                const toolVerifyState = localTools[job.id]?.[item.companyAssetId] || { condition: 'GOOD', notes: '', verified: true };
                                
                                return (
                                  <TableRow key={item.id} className="border-b border-border/40 hover:bg-muted/10">
                                    <TableCell className="py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={toolVerifyState.verified}
                                        onChange={(e) => handleToolChange(job.id, item.companyAssetId, 'verified', e.target.checked)}
                                        className="rounded border-gray-300 h-4.5 w-4.5"
                                      />
                                    </TableCell>
                                    <TableCell className="py-2.5 font-semibold text-xs text-foreground">
                                      {item.asset?.name || "Asset"}
                                    </TableCell>
                                    <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">
                                      {item.asset?.serialNumber || "—"}
                                    </TableCell>
                                    <TableCell className="py-2.5">
                                      <Select
                                        value={toolVerifyState.condition}
                                        onValueChange={(val) => handleToolChange(job.id, item.companyAssetId, 'condition', val)}
                                        disabled={!toolVerifyState.verified}
                                      >
                                        <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border/60">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="GOOD">Good Condition</SelectItem>
                                          <SelectItem value="DAMAGED">Damaged / Broken</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell className="py-2.5">
                                      <Input
                                        placeholder="e.g. Scratched, clean, missing cases"
                                        value={toolVerifyState.notes}
                                        onChange={(e) => handleToolChange(job.id, item.companyAssetId, 'notes', e.target.value)}
                                        disabled={!toolVerifyState.verified}
                                        className="h-8 text-xs bg-background"
                                      />
                                    </TableCell>
                                    <TableCell className="py-2.5 text-right">
                                      {!toolVerifyState.verified ? (
                                        <Badge className="bg-red-50 text-red-700 border-red-200 text-[9px] font-bold flex items-center gap-1 w-fit ml-auto">
                                          <AlertTriangle className="h-3 w-3" /> Missing
                                        </Badge>
                                      ) : toolVerifyState.condition === 'DAMAGED' ? (
                                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold flex items-center gap-1 w-fit ml-auto">
                                          <AlertTriangle className="h-3 w-3" /> Damaged
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold w-fit ml-auto">
                                          ✓ Good
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Section 3: Notes & Action Bar */}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <Input
                        placeholder="Add storekeeper return validation logs or observations..."
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                        className="bg-background border-border/60 text-xs h-9 flex-1"
                      />
                      <Button
                        onClick={() => handleConfirmReturns(job)}
                        disabled={submitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 shrink-0 shadow-sm gap-1.5"
                      >
                        <UserCheck className="h-4 w-4" />
                        Verify & Receive Returned Items
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
