import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product, ProductCategory, INVENTORY_CATEGORIES, MEASUREMENT_UNITS } from "@/lib/data";
import { Plus, Package, Droplets, Zap, Wrench, Layers } from "lucide-react";
import { toast } from "sonner";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: Partial<Product> & { productCategory: ProductCategory }) => Promise<void>;
  initialCategory?: ProductCategory;
  product?: Product | null;
}

export const AddProductDialog: React.FC<AddProductDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  initialCategory = "WORK_TOOL",
  product = null,
}) => {
  const [productCategory, setProductCategory] = useState<ProductCategory>(initialCategory);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [unit, setUnit] = useState("Piece");
  const [shelfLocation, setShelfLocation] = useState("");
  const [productId, setProductId] = useState("");
  const [model, setModel] = useState("");
  const [brand, setBrand] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (product) {
        setProductId(product.id || "");
        setProductCategory(product.productCategory || "WORK_TOOL");
        setName(product.name || "");
        setCode(String(product.code || ""));
        setCategory(product.category || "");
        setQuantity(Number(product.quantity) || 0);
        setMinStockLevel(Number(product.minStockLevel) || 5);
        setCostPrice(Number(product.costPrice) || 0);
        setSellPrice(Number(product.sellPrice) || 0);
        setUnit(product.unit || "Piece");
        setShelfLocation(product.shelfLocation || "");
        setModel(product.model || "");
        setBrand(product.brand || "");
      } else {
        setProductId("");
        setProductCategory(initialCategory);
        setName("");
        setCode("");
        setCategory("");
        setQuantity(0);
        setMinStockLevel(5);
        setCostPrice(0);
        setSellPrice(0);
        setUnit("Piece");
        setShelfLocation("");
        setModel("");
        setBrand("");
      }
    }
  }, [open, product, initialCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    try {
      setLoading(true);
      const payload: Partial<Product> & { productCategory: ProductCategory } = {
        id: productId.trim() || undefined,
        name: name.trim(),
        code: code.trim() || undefined,
        category: category.trim() || productCategory,
        productCategory,
        quantity: Number(quantity) || 0,
        minStockLevel: Number(minStockLevel) || 5,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        unit: unit || "Piece",
        shelfLocation: shelfLocation.trim() || undefined,
        model: model.trim() || undefined,
        brand: brand.trim() || undefined,
      };

      await onSave(payload);
      toast.success(
        product
          ? `Successfully updated "${name}" in catalog!`
          : `Successfully added "${name}" to inventory!`
      );
      onOpenChange(false);

      // Reset form
      setProductId("");
      setName("");
      setCode("");
      setCategory("");
      setQuantity(0);
      setMinStockLevel(5);
      setCostPrice(0);
      setSellPrice(0);
      setShelfLocation("");
      setModel("");
      setBrand("");
    } catch (err: any) {
      console.error("Failed to add product:", err);
      toast.error("Failed to add product to inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-background text-foreground border-border shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {product ? "Edit Inventory Item" : "Add New Inventory Item"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {product
                  ? "Update the details of the catalog item."
                  : "Register a new item into the warehouse stock catalog."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Category Selector Tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">1. Inventory Category *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INVENTORY_CATEGORIES.map((c) => {
                const isSelected = productCategory === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setProductCategory(c.key)}
                    className={`p-3 rounded-xl border text-left transition-all bg-card ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm"
                        : "border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <div className="font-bold text-xs text-foreground">{c.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{c.key}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Product ID / Unique ID</Label>
              <Input
                placeholder="Auto-generated if empty"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="bg-card border-border text-foreground font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Item Name *</Label>
              <Input
                placeholder={
                  productCategory === "PUMP"
                    ? "e.g. DIFFUL 4SDC3.0/30-24/300"
                    : productCategory === "COMPANY_TOOL"
                    ? "e.g. Makita Rotary Hammer Drill"
                    : "e.g. Solar Cable 6mm (Red)"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-card border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Item Code / SKU</Label>
              <Input
                placeholder="Auto-generated if empty"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-card border-border text-foreground font-mono"
              />
            </div>
          </div>

          {/* Pump Specific Model Fields */}
          {productCategory === "PUMP" && (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 space-y-3">
              <div className="text-xs font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                <Droplets className="h-4 w-4" /> Solar Pump Specific Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-foreground">Model Number</Label>
                  <Input
                    placeholder="e.g. 4SDC3.0/30-24/300"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-background border-sky-300 dark:border-sky-800 text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-foreground">Brand / Manufacturer</Label>
                  <Input
                    placeholder="e.g. DIFFUL / REDBUD"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="bg-background border-sky-300 dark:border-sky-800 text-xs h-8"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Stock & Unit Values */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Initial Quantity</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="bg-card border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Min Safety Level</Label>
              <Input
                type="number"
                min="1"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(parseFloat(e.target.value) || 5)}
                className="bg-card border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Unit of Measure</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="bg-card border-border text-foreground text-xs">
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground text-xs">
                  {MEASUREMENT_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing & Shelf Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Catalog Sell Price (ETB)</Label>
              <Input
                type="number"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                className="bg-card border-border text-foreground font-mono"
                placeholder="Optional sales catalog price"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Shelf / Bin Location</Label>
              <Input
                placeholder="e.g. Rack A-12, Bin 4"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                className="bg-card border-border text-foreground"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
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
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 shadow-sm"
            >
              {loading ? "Saving Item..." : "Save Product to Catalog"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
