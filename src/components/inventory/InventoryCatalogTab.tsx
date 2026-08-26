import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Product,
  ProductCategory,
  INVENTORY_CATEGORIES,
  formatCurrency,
  getStockStatus,
  getItemProductCategory,
} from "@/lib/data";
import {
  Search,
  Plus,
  QrCode,
  PackagePlus,
  Edit2,
  Trash2,
  Droplets,
  Zap,
  Wrench,
  Package,
  Layers,
  MapPin,
  Tag,
  Sun,
} from "lucide-react";

interface InventoryCatalogTabProps {
  products: Product[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onAddProduct: () => void;
  onSyncMasterCatalog?: () => void;
  onReceiveStock: (product: Product) => void;
  onPrintQR: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export const InventoryCatalogTab: React.FC<InventoryCatalogTabProps> = ({
  products,
  selectedCategory,
  onSelectCategory,
  onAddProduct,
  onSyncMasterCatalog,
  onReceiveStock,
  onPrintQR,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const itemCat = getItemProductCategory(p);
      const matchCat = selectedCategory === "ALL" || itemCat === selectedCategory;

      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        String(p.code || p.id || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (p.shelfLocation || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.model || "").toLowerCase().includes(search.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  // Count items per category with strict separation
  const counts = useMemo(() => {
    const res: Record<string, number> = { ALL: products.length, PUMP: 0, PUMP_EQUIPMENT: 0, COMPANY_TOOL: 0, WORK_TOOL: 0 };
    products.forEach((p) => {
      const cat = getItemProductCategory(p);
      if (res[cat] !== undefined) res[cat] += 1;
    });
    return res;
  }, [products]);

  return (
    <div className="space-y-5">
      {/* 4 Category Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => onSelectCategory("ALL")}
          className={`p-4 rounded-2xl border text-left transition-all bg-card ${
            selectedCategory === "ALL"
              ? "border-primary ring-2 ring-primary/20 shadow-md bg-primary/5"
              : "border-border/60 hover:border-border hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-[10px] font-bold">
              {counts.ALL} SKUs
            </Badge>
          </div>
          <div className="font-bold text-sm text-foreground mt-2.5">All Products</div>
          <div className="text-[11px] text-muted-foreground">Complete catalog</div>
        </button>

        {INVENTORY_CATEGORIES.map((c) => {
          const isSelected = selectedCategory === c.key;
          const count = counts[c.key] || 0;
          return (
            <button
              key={c.key}
              onClick={() => onSelectCategory(c.key)}
              className={`p-4 rounded-2xl border text-left transition-all bg-card ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 shadow-md bg-primary/5"
                  : "border-border/60 hover:border-border hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`p-2 rounded-xl ${
                    c.key === "PUMP"
                      ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                      : c.key === "PUMP_EQUIPMENT"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                      : c.key === "SOLAR_PANEL"
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                      : c.key === "COMPANY_TOOL"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                  }`}
                >
                  {c.key === "PUMP" ? (
                    <Droplets className="h-4 w-4" />
                  ) : c.key === "PUMP_EQUIPMENT" ? (
                    <Zap className="h-4 w-4" />
                  ) : c.key === "SOLAR_PANEL" ? (
                    <Sun className="h-4 w-4" />
                  ) : c.key === "COMPANY_TOOL" ? (
                    <Wrench className="h-4 w-4" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {count} SKUs
                </Badge>
              </div>
              <div className="font-bold text-sm text-foreground mt-2.5 truncate">{c.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">{c.key}</div>
            </button>
          );
        })}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border/60 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name, SKU, shelf..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border/60 text-foreground h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onSyncMasterCatalog && products.length < 5 && (
            <Button
              onClick={onSyncMasterCatalog}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 font-bold text-xs h-9 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="h-4 w-4 text-amber-500" /> Import Master Pumps & Tools
            </Button>
          )}
          <Button
            onClick={onAddProduct}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Product Catalog Table */}
      <Card className="bg-card border border-border/60 shadow-sm rounded-2xl overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <div className="font-bold text-sm text-foreground">No matching inventory items</div>
            <p className="text-xs max-w-sm mx-auto">
              No products found matching your search or category filter. Click "+ Add Product" above to create an item.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Code / SKU</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Product Name</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Category</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3 text-center">Shelf / Bin</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3 text-center">In Stock</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3 text-right">Catalog Price (ETB)</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const status = getStockStatus(p.quantity, p.minStockLevel || 5);
                  const isPump = p.productCategory === "PUMP" || p.category?.toLowerCase().includes("pump");

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30 border-b border-border/40 transition-colors">
                      {/* Code */}
                      <TableCell className="py-3 font-mono text-xs font-bold text-primary">
                        {p.code || p.id}
                      </TableCell>

                      {/* Name & Model */}
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-foreground">{p.name}</div>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground font-mono">
                          {p.brand && <span>Brand: {p.brand}</span>}
                          {p.model && <span>Model: {p.model}</span>}
                          {p.lastStockedAt && <span>Stocked: {new Date(p.lastStockedAt).toLocaleDateString()}</span>}
                        </div>
                      </TableCell>

                      {/* Category Badge */}
                      <TableCell className="py-3">
                        {(() => {
                          const itemCat = getItemProductCategory(p);
                          return (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                itemCat === "PUMP"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : itemCat === "PUMP_EQUIPMENT"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : itemCat === "SOLAR_PANEL"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : itemCat === "COMPANY_TOOL"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {itemCat}
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      {/* Shelf Location */}
                      <TableCell className="py-3 text-center">
                        {p.shelfLocation ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-muted-foreground">
                            <MapPin className="h-3 w-3 text-muted-foreground" /> {p.shelfLocation}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      {/* Stock Quantity & Status */}
                      <TableCell className="py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-xs font-extrabold text-foreground">
                            {p.quantity} <span className="text-[10px] font-normal text-muted-foreground">{p.unit || "pcs"}</span>
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </TableCell>

                      {/* Catalog Price */}
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(p.sellPrice || 0)}
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* QR Code */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPrintQR(p)}
                            title="Generate & Print ISO QR Tag"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>

                          {/* Quick Receive */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReceiveStock(p)}
                            title="Restock / Take In (+Qty)"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                          >
                            <PackagePlus className="h-4 w-4" />
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditProduct(p)}
                            title="Edit Item"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteProduct(p)}
                            title="Delete Item"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
