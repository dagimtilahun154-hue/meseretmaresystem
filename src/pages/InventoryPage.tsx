import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import {
  formatCurrency,
  Product,
  PRODUCT_CATEGORIES,
  MEASUREMENT_UNITS,
  getStockStatus,
} from "@/lib/data";
import { InventoryRequest } from "@/lib/inventory-requests";
import { inventoryRequestsDB, hierarchyRequestsDB } from "@/lib/db-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SecurityCodeDialog } from "@/components/SecurityCodeDialog";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-primary/10 text-primary border-primary/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

type ProductWithCode = Product & {
  code?: string | number;
};

type InventoryRequestWithPrice = InventoryRequest & {
  price?: number;
};

function getNextProductCode(products: ProductWithCode[]) {
  const numericCodes = products
    .map((p) => Number(String(p.code ?? "").replace(/[^\d]/g, "")))
    .filter((n) => !Number.isNaN(n));

  const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 1000;
  return String(maxCode + 1);
}

function ProductForm({
  product,
  products,
  onSave,
  onCancel,
}: {
  product?: ProductWithCode;
  products: ProductWithCode[];
  onSave: (p: ProductWithCode, mode?: "new" | "existing", existingId?: string) => void;
  onCancel: () => void;
}) {
  const isEditMode = !!product;

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingCode, setExistingCode] = useState("");
  const [matchedProduct, setMatchedProduct] = useState<ProductWithCode | null>(null);

  const [form, setForm] = useState<
    Omit<ProductWithCode, "quantity" | "costPrice" | "sellPrice"> & {
      quantity: number | "";
      costPrice: number | "";
      sellPrice: number | "";
    }
  >(
    product || {
      id: `P${Date.now()}`,
      code: getNextProductCode(products),
      name: "",
      category: PRODUCT_CATEGORIES[0],
      quantity: "",
      costPrice: "",
      sellPrice: "",
      unit: "Piece",
      measurementUnit: "Piece",
    }
  );

  useEffect(() => {
    if (isEditMode) return;

    if (mode === "new") {
      setMatchedProduct(null);
      setExistingCode("");
      setForm((prev) => ({
        ...prev,
        id: `P${Date.now()}`,
        code: getNextProductCode(products),
        name: "",
        category: PRODUCT_CATEGORIES[0],
        quantity: "",
        costPrice: "",
        sellPrice: "",
        unit: "Piece",
        measurementUnit: "Piece",
      }));
      return;
    }

    if (!existingCode.trim()) {
      setMatchedProduct(null);
      setForm((prev) => ({
        ...prev,
        quantity: "",
      }));
      return;
    }

    const found = products.find(
      (p) =>
        String(p.code ?? "").toLowerCase() === existingCode.trim().toLowerCase()
    );

    setMatchedProduct(found || null);
  }, [mode, existingCode, products, isEditMode]);

  return (
    <div className="space-y-4">
      {!isEditMode && (
        <div className="space-y-1.5">
          <Label>Product Type</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as "new" | "existing")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New Product</SelectItem>
              <SelectItem value="existing">Existing Product</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!isEditMode && mode === "existing" ? (
        <>
          <div className="space-y-1.5">
            <Label>Product Code</Label>
            <Input
              value={existingCode}
              onChange={(e) => setExistingCode(e.target.value)}
              placeholder="Enter existing code"
            />
          </div>

          {matchedProduct && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">{matchedProduct.name}</p>
              <p className="text-xs text-muted-foreground">
                Code: {matchedProduct.code ?? "—"} • {matchedProduct.category}
              </p>
              <p className="text-xs text-muted-foreground">
                Current Qty: {matchedProduct.quantity}
              </p>
              <p className="text-xs text-muted-foreground">
                Cost: {formatCurrency(matchedProduct.costPrice)} • Price: {formatCurrency(matchedProduct.sellPrice)}
              </p>
            </div>
          )}

          {existingCode && !matchedProduct && (
            <p className="text-sm text-destructive">No product found for this code.</p>
          )}

          <div className="space-y-1.5">
            <Label>Quantity to Add</Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, quantity: v === "" ? "" : Number(v) });
              }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Code</Label>
              <Input
                value={form.code ?? ""}
                readOnly={!isEditMode}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder={isEditMode ? "Enter code" : "Auto generated"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Measurement Unit</Label>
              <Select
                value={form.measurementUnit || form.unit}
                onValueChange={(v) => setForm({ ...form, unit: v, measurementUnit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, quantity: v === "" ? "" : Number(v) });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cost Price</Label>
              <Input
                type="number"
                value={form.costPrice}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, costPrice: v === "" ? "" : Number(v) });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sell Price</Label>
              <Input
                type="number"
                value={form.sellPrice}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, sellPrice: v === "" ? "" : Number(v) });
                }}
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>

        <Button
          onClick={() => {
            if (isEditMode) {
              if (!form.name.trim()) {
                toast.error("Enter product name");
                return;
              }
              if (!String(form.code ?? "").trim()) {
                toast.error("Enter product code");
                return;
              }
              onSave({
                ...form,
                quantity: Number(form.quantity) || 0,
                costPrice: Number(form.costPrice) || 0,
                sellPrice: Number(form.sellPrice) || 0,
              });
              return;
            }

            if (mode === "existing") {
              if (!matchedProduct) {
                toast.error("Select a valid existing product code");
                return;
              }
              const qtyVal = Number(form.quantity) || 0;
              if (qtyVal <= 0) {
                toast.error("Enter quantity greater than 0");
                return;
              }

              onSave(
                {
                  ...matchedProduct,
                  quantity: qtyVal,
                },
                "existing",
                matchedProduct.id
              );
              return;
            }

            if (!form.name.trim()) {
              toast.error("Enter product name");
              return;
            }
            const newQtyVal = Number(form.quantity) || 0;
            if (newQtyVal <= 0) {
              toast.error("Enter quantity greater than 0");
              return;
            }

            onSave({
              ...form,
              quantity: newQtyVal,
              costPrice: Number(form.costPrice) || 0,
              sellPrice: Number(form.sellPrice) || 0,
            }, "new");
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function InventoryRequestForm({
  onSubmit,
  onCancel,
  currentUser,
  products,
}: {
  onSubmit: (r: InventoryRequestWithPrice) => void | Promise<void>;
  onCancel: () => void;
  currentUser: string;
  products: ProductWithCode[];
}) {
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [requestedBy, setRequestedBy] = useState(currentUser);
  const [note, setNote] = useState("");

  const matched = products.find(
    (p) => String(p.code ?? "").toLowerCase() === code.trim().toLowerCase()
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Product Code</Label>
        <Input
          placeholder="Enter inventory product code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      {matched && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
          <p className="text-sm font-medium">{matched.name}</p>
          <p className="text-xs text-muted-foreground">
            {matched.category} • Current Qty: {matched.quantity}
          </p>
        </div>
      )}

      {code && !matched && (
        <p className="text-sm text-destructive">
          No inventory product found for code {code}
        </p>
      )}

      <div className="space-y-1.5">
        <Label>Quantity</Label>
        <Input
          type="number"
          placeholder="Enter quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Price</Label>
        <Input
          type="number"
          placeholder="Enter price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Requested By</Label>
        <Input
          placeholder="Enter requested by"
          value={requestedBy}
          onChange={(e) => setRequestedBy(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Note</Label>
        <Textarea
          placeholder="Reason for stock request..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={
            !matched ||
            !quantity ||
            Number(quantity) <= 0 ||
            !price ||
            Number(price) <= 0 ||
            !requestedBy.trim()
          }
          onClick={() => {
            if (!matched) return;

            onSubmit({
              id: `IR${Date.now()}`,
              productId: matched.id,
              productCode: Number.isNaN(Number(matched.code))
                ? matched.code as any
                : Number(matched.code),
              productName: matched.name,
              category: matched.category,
              quantity: Number(quantity),
              price: Number(price),
              requestedBy: requestedBy.trim(),
              date: new Date().toISOString().slice(0, 10),
              note,
              reason: note,
              status: "pending",
              approvedBy: "",
              approvedDate: "",
            } as any);
          }}
        >
          <Send className="h-4 w-4 mr-1" /> Send for Approval
        </Button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, refreshStoreData } = useStore();
  const { currentUser, hasAccess } = useAuth();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editProduct, setEditProduct] = useState<ProductWithCode | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [inventoryRequests, setInventoryRequests] = useState<InventoryRequestWithPrice[]>([]);

  const canApprove = hasAccess(["finance", "manager"]);

  const requestSecurityCode = (action: () => void) => {
    setPendingAction(() => action);
    setSecurityOpen(true);
  };

  useEffect(() => {
    let mounted = true;

    const loadRequests = (showError = false) => {
      inventoryRequestsDB
        .getAll()
        .then((requests) => {
        if (mounted) {
          setInventoryRequests(Array.isArray(requests) ? requests : []);
        }
      })
      .catch((error) => {
        console.error("Inventory request load failed", error);
        if (mounted) {
          setInventoryRequests([]);
          if (showError) toast.error("Could not load inventory requests");
        }
      });
    };

    loadRequests(true);
    const timer = window.setInterval(() => loadRequests(false), 15000);
    const onFocus = () => loadRequests(false);
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        const product = p as ProductWithCode;
        const matchSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          String(product.code ?? "")
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchCat = filterCategory === "all" || p.category === filterCategory;
        return matchSearch && matchCat;
      })
      .sort((a, b) => {
        const codeA = parseInt(String((a as any).code || 0));
        const codeB = parseInt(String((b as any).code || 0));
        return codeA - codeB;
      });
  }, [products, search, filterCategory]);

  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity < 5).length;
  const pendingCount = inventoryRequests.filter((r) => r.status === "pending").length;

  const myName = currentUser?.displayName || "Unknown";
  const isManagement = hasAccess(["finance", "manager"]);
  const requestsToShow = isManagement ? inventoryRequests : inventoryRequests.filter((r) => r.requestedBy === myName);

  const updateInventoryRequestStatus = async (id: string, status: "approved" | "rejected") => {
    const approver = currentUser?.displayName || "Finance";
    const updated = inventoryRequests.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            approvedBy: approver,
            approvedDate: new Date().toISOString().slice(0, 10),
          }
        : r
    );
    const changed = updated.find((request) => request.id === id);
    if (!changed) return;

    try {
      const saved = await inventoryRequestsDB.save(changed);
      if (!saved) {
        toast.error("Could not update request");
        return;
      }
      const refreshedRequests = await inventoryRequestsDB.getAll();
      setInventoryRequests(Array.isArray(refreshedRequests) ? refreshedRequests : updated);
      await refreshStoreData();
      toast.success(status === "approved" ? "Inventory request approved and stock updated" : "Inventory request rejected");
    } catch (error) {
      console.error("Inventory request update failed", error);
      toast.error("Could not update request");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SecurityCodeDialog
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        onVerified={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Inventory</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {products.length} products tracked
            {lowStockCount > 0 && (
              <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 text-[10px] font-black">
                {lowStockCount} LOW STOCK
              </Badge>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Send className="h-4 w-4 mr-1" /> Stock Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Stock Request</DialogTitle>
              </DialogHeader>

              <InventoryRequestForm
                currentUser={myName}
                products={products as ProductWithCode[]}
                onCancel={() => setRequestOpen(false)}
                onSubmit={async (r) => {
                  try {
                    const saved = await inventoryRequestsDB.save(r);
                    if (!saved) {
                      toast.error("Could not send request to Finance");
                      return;
                    }
                    
                    try {
                      await hierarchyRequestsDB.create({
                        title: `Stock Reorder: ${r.productName}`,
                        description: `Stock request for ${r.quantity} units of ${r.productName} (Code: ${r.productCode}).\nRequested by: ${r.requestedBy}\nNote: ${r.note || ""}`,
                        amount: r.price ? Number(r.price) * Number(r.quantity) : null,
                        type: "STOCK_REORDER",
                        comment: `Inventory Request ID: ${r.id}`
                      });
                      toast.success("Stock reorder request routed to General Manager!");
                    } catch (err) {
                      console.error("Failed to auto-create hierarchy request:", err);
                    }

                    setInventoryRequests((prev) => [r, ...prev]);
                    setRequestOpen(false);
                    toast.success("Request sent to Finance");
                  } catch (error) {
                    console.error("Stock request save failed", error);
                    toast.error("Could not send request to Finance");
                  }
                }}
              />
            </DialogContent>
          </Dialog>

          {canApprove && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Product</DialogTitle>
                </DialogHeader>

                <ProductForm
                  products={products as ProductWithCode[]}
                  onSave={(p, mode, existingId) => {
                    if (mode === "existing" && existingId) {
                      const existing = products.find((item) => item.id === existingId) as ProductWithCode | undefined;
                      if (!existing) {
                        toast.error("Product not found");
                        return;
                      }

                      updateProduct({
                        ...existing,
                        quantity: Number(existing.quantity || 0) + Number(p.quantity || 0),
                      });

                      setAddOpen(false);
                      toast.success("Existing product quantity increased");
                      return;
                    }

                    addProduct(p);
                    setAddOpen(false);
                    toast.success(
                      mode === "new"
                        ? `New product added with code ${p.code}`
                        : "Product added"
                    );
                  }}
                  onCancel={() => setAddOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="h-3.5 w-3.5 mr-1" /> Stock
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            <Clock className="h-3.5 w-3.5 mr-1" /> {isManagement ? "All Requests" : "My Requests"}
            {pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-yellow-500 text-white text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search products or codes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium text-center">Qty</th>
                      <th className="pb-2 font-medium text-center">Status</th>
                      <th className="pb-2 font-medium text-right">Cost</th>
                      <th className="pb-2 font-medium text-right">Price</th>
                      {canApprove && <th className="pb-2 font-medium text-right">Actions</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((p) => {
                      const product = p as ProductWithCode;
                      const stockStatus = getStockStatus(p.quantity);

                      return (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-3 font-mono text-xs">
                            {product.code ?? "—"}
                          </td>

                          <td className="py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[250px]">{p.name}</span>
                            </div>
                          </td>

                          <td className="py-3 text-muted-foreground">{p.category}</td>

                          <td
                            className={`py-3 text-center font-medium ${
                              p.quantity === 0
                                ? "text-destructive"
                                : p.quantity < 5
                                ? "text-warning"
                                : ""
                            }`}
                          >
                            {p.quantity} {p.measurementUnit || p.unit}
                          </td>

                          <td className="py-3 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ${stockStatus.color}`}
                            >
                              {stockStatus.label}
                            </span>
                          </td>

                          <td className="py-3 text-right">{formatCurrency(p.costPrice)}</td>
                          <td className="py-3 text-right font-medium">
                            {formatCurrency(p.sellPrice)}
                          </td>

                          {canApprove && (
                            <td className="py-3 text-right">
                              <div className="flex gap-1 justify-end">
                                <Dialog
                                  open={editProduct?.id === p.id}
                                  onOpenChange={(open) => !open && setEditProduct(null)}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        requestSecurityCode(() =>
                                          setEditProduct(product)
                                        )
                                      }
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>

                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Product</DialogTitle>
                                    </DialogHeader>

                                    {editProduct && (
                                      <ProductForm
                                        product={editProduct}
                                        products={products as ProductWithCode[]}
                                        onSave={(updatedProduct) => {
                                          updateProduct(updatedProduct);
                                          setEditProduct(null);
                                          toast.success("Updated");
                                        }}
                                        onCancel={() => setEditProduct(null)}
                                      />
                                    )}
                                  </DialogContent>
                                </Dialog>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    requestSecurityCode(() => {
                                      deleteProduct(p.id);
                                      toast.success("Deleted");
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    No products found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">{isManagement ? "All Inventory Requests" : "My Requests"}</CardTitle>
              {isManagement && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Management View - Showing All
                </Badge>
              )}
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Approved Date</TableHead>
                    {canApprove && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {requestsToShow.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell className="font-mono">{r.productCode}</TableCell>
                      <TableCell className="font-medium">{r.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.category}</TableCell>
                      <TableCell className="text-center font-medium">{r.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(r.price || 0))}
                      </TableCell>
                      <TableCell>{r.requestedBy}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.note}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[r.status]}>
                          {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {r.status === "approved" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {r.status === "rejected" && (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.approvedBy || "—"}</TableCell>
                      <TableCell>{r.approvedDate || "—"}</TableCell>
                    
                      {canApprove && (
                        <TableCell className="text-right">
                          {r.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => updateInventoryRequestStatus(r.id, "approved")}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateInventoryRequestStatus(r.id, "rejected")}>
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Completed</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {requestsToShow.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canApprove ? 13 : 12} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Clock className="h-8 w-8 opacity-20" />
                          <p>No inventory requests found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



