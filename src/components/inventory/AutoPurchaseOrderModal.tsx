import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Truck, DollarSign, Calendar, CheckCircle2, AlertTriangle, Send, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { vendorsDB } from "@/lib/db-service";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface AutoPurchaseOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lowStockItems: any[];
  onOrderCreated?: () => void;
}

export function AutoPurchaseOrderModal({ open, onOpenChange, lowStockItems, onOrderCreated }: AutoPurchaseOrderModalProps) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [selectedVendorName, setSelectedVendorName] = useState<string>("");
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      loadVendors();
      initOrderItems();
    }
  }, [open, lowStockItems]);

  const loadVendors = async () => {
    try {
      const data = await vendorsDB.getAll();
      const list = data || [];
      setVendors(list);
      if (list.length > 0) {
        setSelectedVendorId(list[0].id);
        setSelectedVendorName(list[0].name);
      } else {
        // Fallback default vendor if none in DB
        setSelectedVendorName("Primary Solar Equipment Supplier");
      }
    } catch {
      setSelectedVendorName("Primary Solar Equipment Supplier");
    }
  };

  const initOrderItems = () => {
    const items = (lowStockItems || []).map((item) => {
      const minVal = item.minStock || item.min_stock || 10;
      const currVal = item.quantity || item.qty || 0;
      const suggestedQty = Math.max(5, (minVal * 2) - currVal);
      const unitPrice = item.price || item.unitPrice || item.costPrice || 1200;
      return {
        id: item.id,
        name: item.name || item.productName || "Product",
        category: item.category || "Equipment",
        currentStock: currVal,
        minStock: minVal,
        reorderQty: suggestedQty,
        unitPrice: unitPrice,
        total: suggestedQty * unitPrice,
      };
    });
    setOrderItems(items);
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const safeQty = Math.max(1, qty);
    setOrderItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        reorderQty: safeQty,
        total: safeQty * next[idx].unitPrice,
      };
      return next;
    });
  };

  const totalOrderAmount = orderItems.reduce((acc, item) => acc + (item.total || 0), 0);

  const handleVendorSelect = (val: string) => {
    setSelectedVendorId(val);
    const found = vendors.find((v) => v.id === val);
    if (found) setSelectedVendorName(found.name);
  };

  const handleGeneratePurchaseOrder = async () => {
    if (orderItems.length === 0) {
      toast.error("No low-stock items available for Purchase Order generation.");
      return;
    }
    setSubmitting(true);
    try {
      const poNumber = `PO-SOLAR-${Date.now().toString().slice(-6)}`;

      // 1. Post to Bills / Vendor Accounts Payable
      const billRecord = {
        id: poNumber,
        vendorId: selectedVendorId || null,
        vendorName: selectedVendorName || "Registered Equipment Supplier",
        date: new Date().toISOString(),
        dueDate: deliveryDate,
        items: orderItems,
        total: totalOrderAmount,
        status: "Approved PO",
        type: "PurchaseOrder",
      };

      await apiClient.post("/bills", billRecord);

      // 2. Post to Inventory Requests for Storekeeper receiving log
      for (const item of orderItems) {
        await apiClient.post("/inventory-requests", {
          id: `REQ-${poNumber}-${item.id.slice(-4)}`,
          productId: item.id,
          productName: item.name,
          category: item.category,
          quantity: item.reorderQty,
          price: item.unitPrice,
          requestedBy: "Automated Low-Stock System",
          reason: `Automated Reorder PO #${poNumber} (Current stock ${item.currentStock} <= Min ${item.minStock})`,
          status: "approved",
        });
      }

      toast.success(`Purchase Order #${poNumber} generated successfully for ${selectedVendorName}!`);
      if (onOrderCreated) onOrderCreated();
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to post Purchase Order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-slate-950 font-bold uppercase text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" /> LOW-STOCK AUTO REORDER
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              {lowStockItems.length} Products Need Replenishment
            </Badge>
          </div>
          <DialogTitle className="text-xl font-black font-heading mt-2 text-foreground flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Automated Vendor Purchase Order (PO) Generator
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Generate and dispatch official purchase orders directly to registered vendors to restore low inventory stock levels to safety thresholds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Vendor Selection & Delivery Date Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                Select Supplier / Vendor
              </label>
              <Select value={selectedVendorId} onValueChange={handleVendorSelect}>
                <SelectTrigger className="text-xs font-semibold bg-background">
                  <SelectValue placeholder="Choose Vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length > 0 ? (
                    vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.name} ({v.phone || "Supplier"})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="default" className="text-xs">
                      Primary Solar Equipment Supplier
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Expected Delivery Date
              </label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="text-xs font-mono bg-background"
              />
            </div>
          </div>

          {/* Itemized Reorder Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package className="h-4 w-4 text-primary" /> Items Requiring Purchase Order Replenishment
            </h4>
            <div className="border border-border rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground font-bold uppercase text-[10px] border-b">
                    <th className="p-2.5 text-left">ITEM NAME</th>
                    <th className="p-2.5 text-center">CURRENT STOCK</th>
                    <th className="p-2.5 text-center">MIN THRESHOLD</th>
                    <th className="p-2.5 text-center">REORDER QTY</th>
                    <th className="p-2.5 text-right">UNIT PRICE</th>
                    <th className="p-2.5 text-right">TOTAL COST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orderItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="p-2.5 font-semibold text-foreground">
                        {item.name}
                        <span className="block text-[10px] text-muted-foreground">{item.category}</span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {item.currentStock}
                      </td>
                      <td className="p-2.5 text-center font-mono text-muted-foreground">
                        {item.minStock}
                      </td>
                      <td className="p-2.5 text-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.reorderQty}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-20 h-7 text-center font-mono font-bold text-xs bg-background mx-auto"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">
                        {formatCurrency(item.unitPrice)} ETB
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.total)} ETB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary & Dispatch Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-xl">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">TOTAL PURCHASE ORDER VALUE</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {formatCurrency(totalOrderAmount)} ETB
              </div>
              <span className="text-[10px] text-slate-400">
                Supplier: <strong className="text-white">{selectedVendorName}</strong>
              </span>
            </div>

            <Button
              onClick={handleGeneratePurchaseOrder}
              disabled={submitting || orderItems.length === 0}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 text-sm"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Generating PO..." : "Generate & Post Vendor PO"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
