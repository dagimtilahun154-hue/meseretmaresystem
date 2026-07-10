import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Zap, Droplets, Eye, ChevronRight, ArrowLeft, Pencil, Plus, Trash2, ImagePlus, Search } from "lucide-react";
import { pumpCategoriesDB, pumpProductsDB } from "@/lib/db-service";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { toast } from "sonner";

type PumpCategoryRecord = {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  persisted?: boolean;
  originalName?: string;
};

const emptyPump = {
  model: "",
  brand: "DIFFUL",
  status: "Published",
  firstCategory: "",
  secondCategory: "General",
  power: "",
  voltage: "",
  description: "",
  image: "",
  controllerImage: "",
  panelImage: "",
  introductionTitle: "",
  technicalDataTitle: "",
  hydraulicCurveTitle: "",
  hydraulicCurveImage: "",
  performanceData: [],
  equipment: [],
};

function parseJsonField(value: any) {
  if (typeof value !== "string") return value || [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function iconFor(name?: string) {
  if (name === "sun") return Sun;
  if (name === "zap") return Zap;
  return Droplets;
}

function CategoryForm({
  value,
  onSubmit,
  onCancel,
}: {
  value: PumpCategoryRecord;
  onSubmit: (value: PumpCategoryRecord) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PumpCategoryRecord>(value);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Select value={form.icon || "droplets"} onValueChange={(icon) => setForm({ ...form, icon })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="droplets">Droplets</SelectItem>
              <SelectItem value="sun">Sun</SelectItem>
              <SelectItem value="zap">Zap</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sortOrder === "" ? "" : (form.sortOrder ?? "")} onChange={(e) => setForm({ ...form, sortOrder: e.target.value === "" ? "" : Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(form)}>Save Category</Button>
      </div>
    </div>
  );
}

function PumpForm({
  value,
  categories,
  products,
  onSubmit,
  onCancel,
}: {
  value: any;
  categories: PumpCategoryRecord[];
  products: any[];
  onSubmit: (value: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<any>(value);

  const set = (field: string, next: any) => setForm((prev: any) => ({ ...prev, [field]: next }));

  return (
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Model</Label>
          <Input value={form.model || ""} onChange={(e) => set("model", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Input value={form.brand || ""} onChange={(e) => set("brand", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.firstCategory || ""} onValueChange={(v) => set("firstCategory", v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.name} value={category.name}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Sub Category</Label>
          <Input value={form.secondCategory || ""} onChange={(e) => set("secondCategory", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Power</Label>
          <Input value={form.power || ""} onChange={(e) => set("power", e.target.value)} placeholder="2200W" />
        </div>
        <div className="space-y-1.5">
          <Label>Voltage</Label>
          <Input value={form.voltage || ""} onChange={(e) => set("voltage", e.target.value)} placeholder="220V" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Pump Image URL</Label>
          <Input value={form.image || ""} onChange={(e) => set("image", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Controller Image URL</Label>
          <Input value={form.controllerImage || ""} onChange={(e) => set("controllerImage", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Panel Image URL</Label>
          <Input value={form.panelImage || ""} onChange={(e) => set("panelImage", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Introduction Title</Label>
          <Input value={form.introductionTitle || ""} onChange={(e) => set("introductionTitle", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Hydraulic Curve Image URL</Label>
          <Input value={form.hydraulicCurveImage || ""} onChange={(e) => set("hydraulicCurveImage", e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="mb-3 flex items-center justify-between">
          <Label>Equipment Items</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => set("equipment", [...(form.equipment || []), { productId: "", name: "", quantity: 1, unit: "Piece", price: "" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
          </Button>
        </div>
        <div className="space-y-2">
          {(form.equipment || []).map((item: any, index: number) => (
            <div key={index} className="grid gap-2 md:grid-cols-[1.5fr_80px_90px_100px_36px]">
              <Select
                value={item.productId || ""}
                onValueChange={(prodId) => {
                  const selectedProd = products.find((p) => p.id === prodId);
                  if (selectedProd) {
                    const next = [...(form.equipment || [])];
                    next[index] = {
                      ...item,
                      productId: prodId,
                      name: selectedProd.name,
                      unit: selectedProd.measurementUnit || selectedProd.unit || "Piece",
                      price: selectedProd.sellPrice || 0,
                      cost: selectedProd.costPrice || 0,
                      availableStock: selectedProd.quantity || 0,
                      category: selectedProd.category,
                    };
                    set("equipment", next);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select inventory product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code || "No code"}) - Stock {p.quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" value={item.quantity === "" ? "" : (item.quantity ?? "")} onChange={(e) => {
                const next = [...(form.equipment || [])];
                next[index] = { ...item, quantity: e.target.value === "" ? "" : Number(e.target.value) };
                set("equipment", next);
              }} />
              <Input value={item.unit || ""} disabled className="bg-muted" placeholder="Unit" />
              <Input type="number" value={item.price === "" ? "" : (item.price ?? "")} onChange={(e) => {
                const next = [...(form.equipment || [])];
                next[index] = { ...item, price: e.target.value === "" ? "" : Number(e.target.value) };
                set("equipment", next);
              }} />
              <Button size="icon" variant="ghost" onClick={() => set("equipment", (form.equipment || []).filter((_: any, i: number) => i !== index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(form)}>Save Product</Button>
      </div>
    </div>
  );
}

export default function PumpProductsPage() {
  const navigate = useNavigate();
  const { hasAccess } = useAuth();
  const { products } = useStore();
  const canManage = hasAccess(["manager"]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [pumps, setPumps] = useState<any[]>([]);
  const [categories, setCategories] = useState<PumpCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PumpCategoryRecord | null>(null);
  const [productDialog, setProductDialog] = useState(false);
  const [editingPump, setEditingPump] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [pumpData, categoryData] = await Promise.all([
        pumpProductsDB.getAll(),
        pumpCategoriesDB.getAll(),
      ]);
      const parsedPumps = (pumpData || []).map((pump) => ({
        ...pump,
        technicalData: parseJsonField(pump.technicalData),
        performanceData: parseJsonField(pump.performanceData),
        equipment: parseJsonField(pump.equipment),
      }));
      const persistedCategories = (categoryData || []).map((category) => ({ ...category, persisted: true }));
      const categoryNames = new Set(persistedCategories.map((category) => category.name));
      const derivedCategories = Array.from(new Set(parsedPumps.map((pump) => pump.firstCategory).filter(Boolean)))
        .filter((name) => !categoryNames.has(name))
        .map((name) => ({ name, description: `${name} solar pump models.`, icon: "droplets", persisted: false }));
      setPumps(parsedPumps);
      setCategories([...persistedCategories, ...derivedCategories]);
    } catch {
      toast.error("Could not load pump products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pumpCategories = useMemo(() => {
    return categories.map((category) => {
      const catPumps = pumps.filter((pump) => pump.firstCategory === category.name);
      const subCatNames = Array.from(new Set(catPumps.map((pump) => pump.secondCategory || "General")));
      return {
        ...category,
        id: category.persisted && category.id ? category.id : category.name.toLowerCase().replace(/\s+/g, "-"),
        subCategories: subCatNames.map((subName) => ({
          id: subName.toLowerCase().replace(/\s+/g, "-"),
          name: subName,
          models: catPumps.filter((pump) => (pump.secondCategory || "General") === subName),
        })),
      };
    });
  }, [categories, pumps]);

  const selectedCategory = pumpCategories.find((category) => category.id === selectedCategoryId);

  const openCategoryDialog = (category?: PumpCategoryRecord) => {
    setEditingCategory(
      category?.persisted
        ? { ...category, originalName: category.name }
        : category
          ? { ...category, id: undefined, persisted: false, originalName: category.name }
          : { name: "", description: "", icon: "droplets", sortOrder: categories.length + 1, persisted: false },
    );
    setCategoryDialog(true);
  };

  const saveCategory = async (category: PumpCategoryRecord) => {
    if (!category.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      if (category.id && category.persisted) {
        await pumpCategoriesDB.update(category.id, category);
        toast.success("Category updated");
      } else {
        await pumpCategoriesDB.save(category);
        toast.success("Category added");
      }
      setCategoryDialog(false);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not save category");
    }
  };

  const deleteCategory = async (category: PumpCategoryRecord) => {
    if (!category.id || !category.persisted) {
      setCategories((prev) => prev.filter((item) => item.name !== category.name));
      return;
    }
    try {
      await pumpCategoriesDB.delete(category.id);
      toast.success("Category deleted");
      setSelectedCategoryId(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not delete category");
    }
  };

  const openProductDialog = (pump?: any, firstCategory?: string, secondCategory?: string) => {
    setEditingPump({
      ...emptyPump,
      ...(pump || {}),
      firstCategory: pump?.firstCategory || firstCategory || selectedCategory?.name || categories[0]?.name || "",
      secondCategory: pump?.secondCategory || secondCategory || "General",
      equipment: pump?.equipment || [],
      performanceData: pump?.performanceData || [],
    });
    setProductDialog(true);
  };

  const savePump = async (pump: any) => {
    if (!pump.model.trim() || !pump.firstCategory.trim()) {
      toast.error("Model and category are required");
      return;
    }
    if (!Array.isArray(pump.equipment) || pump.equipment.length === 0) {
      toast.error("Add at least one inventory item to the pump kit");
      return;
    }

    const normalizedEquipment = pump.equipment.map((item: any) => {
      const matchedProduct = products.find((product) => product.id === item.productId);
      return {
        ...item,
        productId: matchedProduct?.id || "",
        name: matchedProduct?.name || item.name || "",
        quantity: Number(item.quantity || 0),
        unit: matchedProduct?.measurementUnit || matchedProduct?.unit || item.unit || "Piece",
        price: Number(item.price ?? matchedProduct?.sellPrice ?? 0),
        cost: Number(item.cost ?? matchedProduct?.costPrice ?? 0),
        availableStock: Number(matchedProduct?.quantity ?? item.availableStock ?? 0),
        category: matchedProduct?.category || item.category,
      };
    });

    const invalidEquipment = normalizedEquipment.filter((item: any) => !item.productId || !item.name || item.quantity <= 0);
    if (invalidEquipment.length > 0) {
      toast.error("Each pump kit item must be linked to inventory and have quantity greater than zero");
      return;
    }

    const payload = { ...pump, equipment: normalizedEquipment };
    try {
      if (pump.id) {
        await pumpProductsDB.update(pump.id, payload);
        toast.success("Product updated");
      } else {
        await pumpProductsDB.save(payload);
        toast.success("Product added");
      }
      setProductDialog(false);
      await loadData();
    } catch {
      toast.error("Could not save pump product");
    }
  };

  const deletePump = async (pump: any) => {
    try {
      await pumpProductsDB.delete(pump.id);
      toast.success("Product deleted");
      await loadData();
    } catch {
      toast.error("Could not delete product");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Dialog open={categoryDialog} onOpenChange={(open) => { setCategoryDialog(open); if (!open) setEditingCategory(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory?.id && editingCategory?.persisted ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm key={editingCategory.id || "new"} value={editingCategory} onSubmit={saveCategory} onCancel={() => { setCategoryDialog(false); setEditingCategory(null); }} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={productDialog} onOpenChange={(open) => { setProductDialog(open); if (!open) setEditingPump(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingPump?.id ? "Edit Pump Product" : "Add Pump Product"}</DialogTitle>
          </DialogHeader>
          {editingPump && (
            <PumpForm key={editingPump.id || "new"} value={editingPump} categories={categories} products={products} onSubmit={savePump} onCancel={() => { setProductDialog(false); setEditingPump(null); }} />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => { setSelectedCategoryId(null); setSearchQuery(""); }} className="transition-colors hover:text-foreground">
            Solar Pumps
          </button>
          {selectedCategory && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">{selectedCategory.name}</span>
            </>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCategoryDialog()}>
              <Plus className="mr-1 h-4 w-4" /> Category
            </Button>
            <Button onClick={() => openProductDialog()}>
              <Plus className="mr-1 h-4 w-4" /> Product
            </Button>
          </div>
        )}
      </div>

      {!selectedCategory ? (
        <>
          <div>
            <h1 className="text-2xl font-bold font-heading">Solar Pump Categories</h1>
            <p className="text-sm text-muted-foreground">Select a pump category to view available models</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pumpCategories.map((category) => {
              const totalModels = category.subCategories.reduce((acc, sub) => acc + sub.models.length, 0);
              const Icon = iconFor(category.icon);
              return (
                <Card key={category.id} className="overflow-hidden border-2 transition-all hover:border-primary/30 hover:shadow-lg">
                  <button className="block w-full text-left" onClick={() => setSelectedCategoryId(category.id)}>
                    <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
                      <div className="space-y-3 text-center">
                        <Icon className="mx-auto h-16 w-16 text-primary transition-transform" />
                        <Badge className="bg-primary px-4 py-1 text-sm text-primary-foreground">{totalModels} Models</Badge>
                      </div>
                    </div>
                  </button>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-heading">{category.name}</CardTitle>
                      {canManage && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openCategoryDialog(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteCategory(category)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                    <Button variant="ghost" className="mt-3 w-full text-primary hover:bg-primary/5" onClick={() => setSelectedCategoryId(category.id)}>
                      View Sub-Categories <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedCategoryId(null); setSearchQuery(""); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold font-heading">{selectedCategory.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory.subCategories.reduce((acc, sub) => acc + sub.models.length, 0)} pump models available
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search models, specs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {canManage && (
                <Button onClick={() => openProductDialog(undefined, selectedCategory.name)}>
                  <Plus className="mr-1 h-4 w-4" /> Product in Category
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-12">
            {selectedCategory.subCategories.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No products in this category yet.
                </CardContent>
              </Card>
            ) : (
              (() => {
                const totalFiltered = selectedCategory.subCategories.reduce((acc, sub) => {
                  const filtered = sub.models.filter((pump: any) => {
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      pump.model.toLowerCase().includes(q) ||
                      (pump.power || "").toLowerCase().includes(q) ||
                      (pump.voltage || "").toLowerCase().includes(q) ||
                      (pump.description || "").toLowerCase().includes(q) ||
                      (pump.secondCategory || "").toLowerCase().includes(q)
                    );
                  });
                  return acc + filtered.length;
                }, 0);

                if (searchQuery && totalFiltered === 0) {
                  return (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        No products found matching your search.
                      </CardContent>
                    </Card>
                  );
                }

                return selectedCategory.subCategories.map((sub) => {
                  const filteredModels = sub.models.filter((pump: any) => {
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      pump.model.toLowerCase().includes(q) ||
                      (pump.power || "").toLowerCase().includes(q) ||
                      (pump.voltage || "").toLowerCase().includes(q) ||
                      (pump.description || "").toLowerCase().includes(q) ||
                      (pump.secondCategory || "").toLowerCase().includes(q)
                    );
                  });

                  if (filteredModels.length === 0) return null;

                  return (
                    <div key={sub.id} className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <h2 className="rounded-full bg-muted px-4 py-1 text-lg font-bold font-heading">{sub.name}</h2>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredModels.map((pump) => (
                          <Card key={pump.id} className="overflow-hidden border transition-all hover:border-primary/30 hover:shadow-lg">
                            <div className="flex h-44 items-center justify-center overflow-hidden bg-muted">
                              {pump.image ? (
                                <img src={pump.image} alt={pump.model} className="h-full w-full bg-white object-contain" />
                              ) : (
                                <div className="space-y-2 text-center">
                                  <ImagePlus className="mx-auto h-12 w-12 text-primary" />
                                  <p className="text-xs text-muted-foreground">Add pump image</p>
                                </div>
                              )}
                            </div>
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-sm leading-tight font-heading">{pump.model}</CardTitle>
                                <Badge variant="secondary" className="shrink-0">{pump.power || "No power"}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <p className="line-clamp-2 text-xs text-muted-foreground">{pump.description}</p>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground"><Zap className="h-3 w-3" /> {pump.voltage || "Voltage"}</span>
                                <span className="flex items-center gap-1 text-muted-foreground"><Droplets className="h-3 w-3" /> {pump.equipment?.length || 0} items</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/pumps/${pump.id}`)}>
                                  <Eye className="mr-1 h-4 w-4" /> View Details
                                </Button>
                                {canManage && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => openProductDialog(pump)}>
                                      <Pencil className="mr-1 h-4 w-4" /> Edit
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => deletePump(pump)}>
                                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </>
      )}
    </div>
  );
}
