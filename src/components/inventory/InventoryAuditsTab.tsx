import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  ClipboardCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Layers,
} from "lucide-react";
import { StockCountRecord, StockCountItemData } from "@/lib/api/inventory";
import { ProductCategory, INVENTORY_CATEGORIES } from "@/lib/data";
import { toast } from "sonner";

interface InventoryAuditsTabProps {
  audits: StockCountRecord[];
  onCreateAudit: (category?: ProductCategory, countedBy?: string, notes?: string) => Promise<void>;
  onSubmitAudit: (
    auditId: string,
    items: { id: string; productId: string; countedQty: number; notes?: string }[],
    notes?: string
  ) => Promise<void>;
  currentUserName: string;
}

export const InventoryAuditsTab: React.FC<InventoryAuditsTabProps> = ({
  audits,
  onCreateAudit,
  onSubmitAudit,
  currentUserName,
}) => {
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(audits[0]?.id || null);
  const [countedQuantities, setCountedQuantities] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [newAuditCategory, setNewAuditCategory] = useState<string>("ALL");
  const [newAuditNotes, setNewAuditNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeAudit = audits.find((a) => a.id === selectedAuditId) || audits[0] || null;

  // Initialize counted quantities from active audit items
  React.useEffect(() => {
    if (activeAudit) {
      const initialQtys: Record<string, number> = {};
      const initialNotes: Record<string, string> = {};
      activeAudit.items.forEach((it) => {
        initialQtys[it.id] = Number(it.countedQty !== undefined ? it.countedQty : it.systemQty);
        if (it.notes) initialNotes[it.id] = it.notes;
      });
      setCountedQuantities(initialQtys);
      setItemNotes(initialNotes);
    }
  }, [activeAudit?.id]);

  const handleStartNewAudit = async () => {
    try {
      setCreating(true);
      const cat = newAuditCategory !== "ALL" ? (newAuditCategory as ProductCategory) : undefined;
      await onCreateAudit(cat, currentUserName || "Storekeeper", newAuditNotes);
      toast.success("New physical stock audit count sheet initialized!");
      setNewAuditNotes("");
    } catch (err: any) {
      console.error("Create audit error:", err);
      toast.error("Failed to start new stock audit");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveAndReconcile = async () => {
    if (!activeAudit) return;

    try {
      setSubmitting(true);
      const payloadItems = activeAudit.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        countedQty: countedQuantities[it.id] !== undefined ? countedQuantities[it.id] : Number(it.systemQty),
        notes: itemNotes[it.id],
      }));

      await onSubmitAudit(activeAudit.id, payloadItems, "Audit finalized & reconciled with warehouse balances");
      toast.success("Stock count audit submitted! Variance adjustments applied to inventory.");
    } catch (err: any) {
      console.error("Submit audit error:", err);
      toast.error("Failed to submit audit adjustments");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Audit Creator */}
      <div className="p-4 bg-card rounded-2xl border border-border/60 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Physical Stock Counts & Warehouse Audits
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conduct cycle counts, calculate variance, and automatically reconcile system balances.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
          <Select value={newAuditCategory} onValueChange={setNewAuditCategory}>
            <SelectTrigger className="bg-background border-border/60 text-foreground text-xs h-9 w-full sm:w-44">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground text-xs">
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="PUMP">Pumps Only</SelectItem>
              <SelectItem value="PUMP_EQUIPMENT">Pump Equipment</SelectItem>
              <SelectItem value="COMPANY_TOOL">Company Tools</SelectItem>
              <SelectItem value="WORK_TOOL">Work Tools (Consumables)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleStartNewAudit}
            disabled={creating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 flex items-center gap-1.5 shrink-0 shadow-sm w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Start New Audit Sheet
          </Button>
        </div>
      </div>

      {audits.length === 0 ? (
        <Card className="bg-card border border-border/60 shadow-sm py-16 text-center rounded-2xl">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <ClipboardCheck className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-foreground">No Physical Audits Created Yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Click "Start New Audit Sheet" above to generate a count sheet from your current catalog.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Audits List */}
          <div className="lg:col-span-1 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Audit Sheets ({audits.length})
            </h4>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {audits.map((a) => {
                const isSelected = (activeAudit?.id === a.id);
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAuditId(a.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm"
                        : "border-border/60 hover:bg-muted/40 bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {a.category || "Full Warehouse Count"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          a.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>By: {a.countedBy}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {a.items?.length || 0} catalog items counted
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Count Sheet */}
          <div className="lg:col-span-3">
            {activeAudit && (
              <Card className="bg-card border border-border/60 shadow-sm rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        {activeAudit.category || "Full Warehouse Audit Sheet"}
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {activeAudit.id.slice(-8)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Counted by <strong className="text-foreground">{activeAudit.countedBy}</strong> on {new Date(activeAudit.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {activeAudit.status !== "APPROVED" && (
                    <Button
                      onClick={handleSaveAndReconcile}
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shrink-0 shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Reconcile & Update Inventory
                    </Button>
                  )}
                </div>

                {/* Count Items Table */}
                <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-b border-border/60">
                        <TableHead className="text-xs font-bold text-muted-foreground py-2.5">Product Name</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground py-2.5">Category</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground py-2.5 text-center">System Qty</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground py-2.5 text-center w-28">Physical Count</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground py-2.5 text-center">Variance</TableHead>
                        <TableHead className="text-xs font-bold text-muted-foreground py-2.5">Notes / Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeAudit.items.map((item) => {
                        const sysQty = Number(item.systemQty) || 0;
                        const counted = countedQuantities[item.id] !== undefined ? countedQuantities[item.id] : Number(item.systemQty);
                        const variance = counted - sysQty;

                        return (
                          <TableRow key={item.id} className="border-b border-border/40 hover:bg-muted/20">
                            <TableCell className="py-2.5 font-semibold text-xs text-foreground">
                              {item.productName}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Badge variant="outline" className="text-[9px]">
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 text-center font-mono text-xs font-bold text-muted-foreground">
                              {sysQty} {item.unit || "pcs"}
                            </TableCell>
                            <TableCell className="py-2.5 text-center">
                              {activeAudit.status === "APPROVED" ? (
                                <span className="font-mono text-xs font-bold text-foreground">
                                  {counted}
                                </span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  value={counted}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCountedQuantities((prev) => ({ ...prev, [item.id]: val }));
                                  }}
                                  className="h-7 text-xs text-center font-mono font-bold w-20 mx-auto bg-card border-border"
                                />
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 text-center font-mono text-xs font-bold">
                              <span
                                className={
                                  variance === 0
                                    ? "text-muted-foreground"
                                    : variance > 0
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }
                              >
                                {variance > 0 ? `+${variance}` : variance}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              {activeAudit.status === "APPROVED" ? (
                                <span className="text-xs text-muted-foreground">{item.notes || "—"}</span>
                              ) : (
                                <Input
                                  placeholder="e.g. Broken or misplaced..."
                                  value={itemNotes[item.id] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setItemNotes((prev) => ({ ...prev, [item.id]: val }));
                                  }}
                                  className="h-7 text-xs bg-card border-border"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
