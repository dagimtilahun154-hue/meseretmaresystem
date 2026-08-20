import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Product } from "@/lib/data";
import { PlusCircle, PackageCheck, PackagePlus } from "lucide-react";
import { toast } from "sonner";

interface QuickReceiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onReceive: (payload: {
    productId: string;
    quantity: number;
    costPrice?: number;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
}

export const QuickReceiveModal: React.FC<QuickReceiveModalProps> = ({
  open,
  onOpenChange,
  product,
  onReceive,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<number>(product?.costPrice || 0);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (product) {
      setCostPrice(product.costPrice || 0);
      setQuantity(1);
      setReference("");
      setNotes("");
    }
  }, [product]);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    try {
      setLoading(true);
      await onReceive({
        productId: product.id,
        quantity: Number(quantity),
        costPrice: Number(costPrice) || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Successfully restocked +${quantity} ${product.unit || "pcs"} of "${product.name}"!`);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Restock stock error:", err);
      toast.error(err.response?.data?.message || "Failed to restock catalog item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background text-foreground border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Stock Inflow / Restock</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add incoming restock units to warehouse stock and record an inflow transaction.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Target Product Summary Box */}
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Target Product</div>
            <div className="font-bold text-foreground text-sm">{product.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 pt-0.5">
              <span>Code: <span className="text-primary font-mono font-bold">{String(product.code || product.id)}</span></span>
              <span>•</span>
              <span>Current: <strong className="text-foreground">{product.quantity} {product.unit || "pcs"}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Quantity to Restock *</Label>
              <Input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="bg-card border-border text-foreground font-mono text-base font-extrabold text-emerald-600"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Unit Cost (ETB)</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="bg-card border-border text-foreground font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Supplier Reference / PO #</Label>
            <Input
              placeholder="e.g. PO-00218 or Supplier Invoice #884"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="bg-card border-border text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Notes / Shipment Details</Label>
            <Textarea
              placeholder="e.g. Restocked in good condition from SolarTech supplier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-card border-border text-foreground text-xs h-16"
            />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || quantity <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 shadow-sm"
            >
              {loading ? "Restocking..." : "Confirm Restock Inflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
