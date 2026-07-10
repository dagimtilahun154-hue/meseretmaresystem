import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { CalendarIcon, Plus, Trash2, Printer, ShoppingCart, Zap, MapPin, Wallet, Building, Smartphone, Users, Droplets, Search, Calculator, ChevronDown, ChevronUp, Sun, Package, TrendingUp } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatCurrency, VAT_RATE, Sale, SaleItem, Customer, POS_CATEGORY_GROUPS, ETHIOPIAN_REGIONS, ETHIOPIAN_BANKS } from "@/lib/data";
import { PumpModel } from "@/lib/pump-data";
import { pumpProductsDB, hierarchyRequestsDB } from "@/lib/db-service";

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { WaterSource } from "@/lib/pump-sizing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Legend } from "recharts";

// --- Sizing Engine Helpers ---
const FRICTION_FACTORS: Record<string, number> = {
  '1"': 0.05,
  '1.25"': 0.03,
  '1.5"': 0.02,
  '2"': 0.01,
  '2.5"': 0.01,
  '3"': 0.008,
  '4"': 0.005,
};

const PEAK_SUN_HOURS_DEFAULT = 5;

function calcTDH(waterSource: WaterSource, staticWaterLevel: number, tankHeight: number, pipeDistance: number, pipeSize: string, manualFriction: number): number {
  const lift = Number(tankHeight) || 0;
  const staticLevel = waterSource === "Borehole" ? (Number(staticWaterLevel) || 0) : 0;
  if (manualFriction > 0) return lift + staticLevel + manualFriction;
  const frictionFactor = FRICTION_FACTORS[pipeSize] || 0.02;
  const frictionLoss = (Number(pipeDistance) || 0) * frictionFactor;
  return Number((lift + staticLevel + frictionLoss).toFixed(1));
}

function calcRequiredFlowM3h(dailyNeedL: number, sunHours: number): number {
  if (dailyNeedL <= 0 || sunHours <= 0) return 0;
  return dailyNeedL / (1000 * sunHours);
}

function interpolateFlowAtHead(performanceData: { head: number; flow: number }[], targetHead: number): number {
  const sorted = [...performanceData].sort((a, b) => a.head - b.head);
  if (sorted.length === 0) return 0;
  // Performance data: higher head = lower flow. If targetHead is below the min head in data, pump can deliver max flow
  if (targetHead <= sorted[0].head) return sorted[0].flow;
  if (targetHead >= sorted[sorted.length - 1].head) return 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (targetHead >= sorted[i].head && targetHead <= sorted[i + 1].head) {
      const h1 = sorted[i].head, h2 = sorted[i + 1].head;
      const f1 = sorted[i].flow, f2 = sorted[i + 1].flow;
      return Number((f1 + ((targetHead - h1) * (f2 - f1)) / (h2 - h1)).toFixed(2));
    }
  }
  return 0;
}

// Note: pump-data performance curves use head descending (high head = low flow), need to handle both orderings
function interpolateFlowSmart(performanceData: { head: number; flow: number }[], targetHead: number): number {
  if (performanceData.length === 0) return 0;
  // Sort by head ascending
  const sorted = [...performanceData].sort((a, b) => a.head - b.head);
  const minHead = sorted[0].head;
  const maxHead = sorted[sorted.length - 1].head;
  if (targetHead > maxHead) return 0; // Exceeds pump capability
  if (targetHead <= minHead) return sorted[0].flow;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (targetHead >= sorted[i].head && targetHead <= sorted[i + 1].head) {
      const h1 = sorted[i].head, h2 = sorted[i + 1].head;
      const f1 = sorted[i].flow, f2 = sorted[i + 1].flow;
      return Number((f1 + ((targetHead - h1) * (f2 - f1)) / (h2 - h1)).toFixed(2));
    }
  }
  return 0;
}

type PumpSuitability = "Suitable" | "Oversized" | "Low Capacity" | "Exceeds Limit";

interface SizingMatch {
  pump: PumpModel;
  flowAtHeadM3h: number;
  suitability: PumpSuitability;
  tdh: number;
  reqFlowM3h: number;
  maxHead: number;
}

export default function POSPage() {
  const { products, addSale } = useStore();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState<Customer>({ id: "", name: "", phone: "", location: "", region: "", woreda: "", gpsLat: "", gpsLng: "" });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [vatIncluded, setVatIncluded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState<number | "">(1);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [mode, setMode] = useState<"manual" | "model">("manual");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank" | "Telebirr">("Cash");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [isSizingModalOpen, setIsSizingModalOpen] = useState(false);
  const [sizingData, setSizingData] = useState({
    customerName: "",
    phoneNumber: "",
    location: "",
    waterSource: "Borehole" as WaterSource,
    purpose: "Irrigation",
    dailyWaterNeed: 15000,
    boreholeDepth: 60,
    staticWaterLevel: 25,
    tankHeight: 6,
    pipeDistance: 50,
    pipeSize: "1.5\"",
    landSize: "",
    sunHours: 5,
    manualFriction: 0,
    notes: ""
  });
  const [sizingResults, setSizingResults] = useState<SizingMatch[]>([]);
  const [expandedPumpId, setExpandedPumpId] = useState<string | null>(null);
  const [sizingSummary, setSizingSummary] = useState<{ tdh: number; reqFlowM3h: number; reqFlowLmin: number } | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [pumpModels, setPumpModels] = useState<any[]>([]);

  useEffect(() => {
    const loadPumps = async () => {
      try {
        const dbPumps = await pumpProductsDB.getAll();
        if (dbPumps && dbPumps.length > 0) {
          const parsedPumps = dbPumps.map((pump) => ({
            ...pump,
            technicalData: typeof pump.technicalData === "string" ? JSON.parse(pump.technicalData) : (pump.technicalData || []),
            performanceData: typeof pump.performanceData === "string" ? JSON.parse(pump.performanceData) : (pump.performanceData || []),
            equipment: typeof pump.equipment === "string" ? JSON.parse(pump.equipment) : (pump.equipment || []),
          }));
          setPumpModels(parsedPumps);
        } else {
          setPumpModels([]);
        }
      } catch (error) {
        console.error("Could not load pump products", error);
        toast.error("Could not load pump products from backend");
        setPumpModels([]);
      }
    };
    loadPumps();
  }, []);

  useEffect(() => {
    const modelParam = searchParams.get("model");
    if (modelParam && pumpModels.length > 0) {
      setMode("model");
      setSelectedModelId(modelParam);
      loadModelEquipment(modelParam);
    }
  }, [searchParams, pumpModels]);

  const loadModelEquipment = (modelId: string) => {
    const model = pumpModels.find((m) => m.id === modelId);
    if (!model) return;
    const missingItems: string[] = [];
    const equipmentItems: SaleItem[] = model.equipment.map((e: any) => {
      const matchedProd = products.find(p => p.id === e.productId || normalize(p.name) === normalize(e.name));
      if (!matchedProd) {
        missingItems.push(e.name || e.productId || "Unnamed equipment");
      } else if (Number(matchedProd.quantity || 0) < Number(e.quantity || 0)) {
        missingItems.push(`${matchedProd.name} (stock ${matchedProd.quantity}, needs ${e.quantity})`);
      }
      return {
        productId: matchedProd?.id || "",
        productName: matchedProd?.name || e.name,
        quantity: e.quantity,
        price: matchedProd?.sellPrice || e.price || 0,
        cost: matchedProd?.costPrice || e.cost || 0,
      };
    });

    if (missingItems.length > 0) {
      toast.error(`Pump kit is not ready for POS: ${missingItems.join(", ")}`);
      return;
    }

    setItems(equipmentItems);
    toast.success(`Loaded ${model.equipment.length} equipment items for ${model.model}`);
  };

  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter((p) => p.category === selectedCategory && p.quantity > 0);
  }, [products, selectedCategory]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const finalQty = Number(qty) || 1;
    if (product.quantity < finalQty) { toast.error(`Only ${product.quantity} available in stock`); return; }
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(items.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + finalQty } : i));
    } else {
      setItems([...items, { productId: product.id, productName: product.name, quantity: finalQty, price: product.sellPrice, cost: product.costPrice }]);
    }
    setSelectedProduct("");
    setQty(1);
  };

  const removeItem = (productId: string) => setItems(items.filter((i) => i.productId !== productId));

  const updateItemQty = (productId: string, newQty: any) => {
    const qtyVal = Number(newQty) || 1;
    setItems(items.map((i) => i.productId === productId ? { ...i, quantity: qtyVal } : i));
  };

  const totals = useMemo(() => {
    const totalSell = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalCost = items.reduce((s, i) => s + i.cost * i.quantity, 0);
    const profit = totalSell - totalCost;
    const vatAmount = vatIncluded ? totalSell - (totalSell / (1 + VAT_RATE)) : 0;
    const netAmount = totalSell - vatAmount;
    return { totalSell, totalCost, profit, vatAmount, netAmount };
  }, [items, vatIncluded]);

  const completeSale = async () => {
    if (!customer.name.trim()) { toast.error("Enter customer name"); return; }
    if (items.length === 0) { toast.error("Add at least one product"); return; }
    if (paymentMethod === "Bank" && !selectedBank) { toast.error("Please select a bank"); return; }

    const sale: Sale = {
      id: `S${Date.now().toString().slice(-6)}`,
      date: format(saleDate, "yyyy-MM-dd"),
      customer: { ...customer, id: `C${Date.now()}` },
      items,
      totalSell: totals.totalSell,
      totalCost: totals.totalCost,
      profit: totals.profit,
      vatIncluded,
      vatAmount: totals.vatAmount,
      netAmount: totals.netAmount,
      paymentMethod,
      bankName: paymentMethod === "Bank" ? selectedBank : paymentMethod === "Telebirr" ? "Telebirr" : undefined,
    };
    const result = await addSale(sale);
    if (!result) return;

    setLastSale(sale);
    
    // Auto-submit hierarchy request for field work installation to General Manager
    try {
      await hierarchyRequestsDB.create({
        title: `Installation Approval: Sale ${sale.id}`,
        description: `New pump sold to ${sale.customer.name}.\nLocation: ${sale.customer.location || "N/A"}\nItems: ${sale.items.map(i => `${i.productName} (x${i.quantity})`).join(", ")}\nTotal: ${formatCurrency(sale.totalSell)}`,
        amount: sale.totalSell,
        type: "FIELD_TRIP",
        comment: `Sale completed. Requesting GM approval to assign Technical Manager for research/site survey.`
      });
      toast.success("Fieldwork installation request sent to GM");
    } catch (e) {
      console.error("Failed to trigger hierarchy workflow for sale:", e);
    }

    toast.success(
      result === "queued"
        ? "Sale queued offline. It will sync when the connection returns."
        : "Sale completed! Inventory and finance updated."
    );
    setCustomer({ id: "", name: "", phone: "", location: "", region: "", woreda: "", gpsLat: "", gpsLng: "" });
    setItems([]);
    setVatIncluded(false);
    setSaleDate(new Date());
    setSelectedCategory("");
    setSelectedProduct("");
    setSelectedModelId("");
    setMode("manual");
    setPaymentMethod("Cash");
    setSelectedBank("");
  };

  const runSizingMatch = () => {
    const tdh = calcTDH(
      sizingData.waterSource,
      sizingData.staticWaterLevel,
      sizingData.tankHeight,
      sizingData.pipeDistance,
      sizingData.pipeSize,
      sizingData.manualFriction
    );
    const sunHours = sizingData.sunHours || PEAK_SUN_HOURS_DEFAULT;
    const reqFlowM3h = calcRequiredFlowM3h(sizingData.dailyWaterNeed, sunHours);
    const reqFlowLmin = Number((reqFlowM3h * 1000 / 60).toFixed(1));

    setSizingSummary({ tdh, reqFlowM3h: Number(reqFlowM3h.toFixed(2)), reqFlowLmin });

    if (pumpModels.length === 0) {
      toast.error("No backend pump models are available for sizing");
      return;
    }

    const allModels = pumpModels;

    // Filter by pump type based on water source
    const filteredModels = allModels.filter(m => {
      const cat = (m.firstCategory || "").toLowerCase();
      if (sizingData.waterSource === "Borehole") {
        return cat.includes("submersible") || cat.includes("difful");
      } else {
        // River / Pond => surface pumps, but also allow difful series
        return cat.includes("surface") || cat.includes("difful") || cat.includes("qb") || cat.includes("cpm") || cat.includes("jet");
      }
    });

    const results: SizingMatch[] = filteredModels.map(pump => {
      const maxHead = Math.max(...pump.performanceData.map(p => p.head));
      const flowAtHeadM3h = interpolateFlowSmart(pump.performanceData, tdh);

      let suitability: PumpSuitability = "Suitable";
      if (tdh > maxHead) {
        suitability = "Exceeds Limit";
      } else if (flowAtHeadM3h < reqFlowM3h) {
        suitability = "Low Capacity";
      } else if (flowAtHeadM3h > reqFlowM3h * 2.5) {
        suitability = "Oversized";
      }

      return { pump, flowAtHeadM3h, suitability, tdh, reqFlowM3h, maxHead };
    }).sort((a, b) => {
      const rank: Record<PumpSuitability, number> = { "Suitable": 0, "Oversized": 1, "Low Capacity": 2, "Exceeds Limit": 3 };
      if (rank[a.suitability] !== rank[b.suitability]) return rank[a.suitability] - rank[b.suitability];
      return Math.abs(a.flowAtHeadM3h - a.reqFlowM3h) - Math.abs(b.flowAtHeadM3h - b.reqFlowM3h);
    });

    setSizingResults(results);
    setExpandedPumpId(null);
    toast.success(`Found ${results.filter(r => r.suitability === "Suitable").length} suitable pump(s) out of ${results.length} models analyzed.`);
  };

  const addSystemToInvoice = (pump: PumpModel) => {
    const missingItems: string[] = [];
    const equipmentItems: SaleItem[] = pump.equipment.map((e: any) => {
      const matchedProd = products.find(p => p.id === e.productId || normalize(p.name) === normalize(e.name));
      if (!matchedProd) {
        missingItems.push(e.name || e.productId || "Unnamed equipment");
      } else if (Number(matchedProd.quantity || 0) < Number(e.quantity || 0)) {
        missingItems.push(`${matchedProd.name} (stock ${matchedProd.quantity}, needs ${e.quantity})`);
      }
      return {
        productId: matchedProd?.id || "",
        productName: matchedProd?.name || e.name,
        quantity: e.quantity,
        price: matchedProd?.sellPrice || e.price || 0,
        cost: matchedProd?.costPrice || e.cost || 0,
      };
    });

    if (missingItems.length > 0) {
      toast.error(`Pump system cannot be added: ${missingItems.join(", ")}`);
      return;
    }

    setItems(prev => {
      const pumpProductIds = new Set(equipmentItems.map((item) => item.productId));
      const cleaned = prev.filter((item) => !pumpProductIds.has(item.productId));
      return [...cleaned, ...equipmentItems];
    });
    toast.success(`Loaded ${pump.equipment.length} items for ${pump.model} into invoice`);
  };

  const suitabilityColor = (s: PumpSuitability) => {
    switch (s) {
      case "Suitable": return "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
      case "Oversized": return "border-amber-500 bg-amber-50 dark:bg-amber-950/30";
      case "Low Capacity": return "border-orange-500 bg-orange-50 dark:bg-orange-950/30";
      case "Exceeds Limit": return "border-red-500 bg-red-50 dark:bg-red-950/30 opacity-60";
    }
  };

  const suitabilityBadge = (s: PumpSuitability) => {
    switch (s) {
      case "Suitable": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Oversized": return "bg-amber-100 text-amber-800 border-amber-300";
      case "Low Capacity": return "bg-orange-100 text-orange-800 border-orange-300";
      case "Exceeds Limit": return "bg-red-100 text-red-800 border-red-300";
    }
  };

  const printInvoice = () => {
    if (lastSale) {
      window.print();
    } else {
      toast.error("Complete a sale first to print an invoice");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-heading">Point of Sale</h1>
        <p className="text-sm text-muted-foreground">Record a new solar pump installation sale.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Customer Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Customer Name</Label>
                  <Input placeholder="Full name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input placeholder="+251..." value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Select value={customer.region || ""} onValueChange={(v) => setCustomer({ ...customer, region: v })}>
                    <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {ETHIOPIAN_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Woreda</Label>
                  <Input placeholder="Woreda" value={customer.woreda || ""} onChange={(e) => setCustomer({ ...customer, woreda: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Location / City</Label>
                  <Input placeholder="City" value={customer.location} onChange={(e) => setCustomer({ ...customer, location: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>GPS Latitude</Label>
                  <Input placeholder="e.g. 9.0192" value={customer.gpsLat || ""} onChange={(e) => setCustomer({ ...customer, gpsLat: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>GPS Longitude</Label>
                  <Input placeholder="e.g. 38.7525" value={customer.gpsLng || ""} onChange={(e) => setCustomer({ ...customer, gpsLng: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !saleDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {saleDate ? format(saleDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={saleDate} onSelect={(d) => d && setSaleDate(d)} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mode Selector */}
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Add Products</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant={mode === "manual" ? "default" : "outline"} size="sm" onClick={() => setMode("manual")}>
                  <Calculator className="h-4 w-4 mr-1" /> Pump Sizing (Survey)
                </Button>
                <Button variant={mode === "model" ? "default" : "outline"} size="sm" onClick={() => setMode("model")}>
                  <Zap className="h-4 w-4 mr-1" /> By Pump Model
                </Button>
              </div>

              {mode === "model" ? (
                <div className="space-y-3">
                  <Label>Select Pump Model</Label>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                        <SelectTrigger><SelectValue placeholder="Choose a pump model..." /></SelectTrigger>
                        <SelectContent>
                          {pumpModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.model} ({m.power})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => loadModelEquipment(selectedModelId)} disabled={!selectedModelId}>
                      <Zap className="h-4 w-4 mr-1" /> Load Equipment
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Selecting a model automatically loads all required equipment. You can edit quantities below.</p>
                </div>
              ) : (
                <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-2">
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0 space-y-6">
                  {/* PUMP SIZING FORM EMBEDDED IN TAB */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-6 bg-muted/10 p-5 rounded-2xl border border-muted/50 max-h-[500px] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                           <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <Zap className="h-4 w-4" /> 1. Technical Requirements
                           </h3>
                           <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">Employee Sizing Tool</Badge>
                        </div>
                        
                        {/* Technical */}
                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Purpose</Label>
                              <Select value={sizingData.purpose} onValueChange={(v) => setSizingData({...sizingData, purpose: v})}>
                                 <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="Irrigation">Irrigation</SelectItem>
                                    <SelectItem value="Drinking">Drinking Water</SelectItem>
                                    <SelectItem value="Livestock">Livestock</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Daily Need (L)</Label>
                              <Input type="number" className="h-8 text-xs bg-white" placeholder="15000" value={sizingData.dailyWaterNeed} onChange={(e) => setSizingData({...sizingData, dailyWaterNeed: e.target.value === "" ? "" : Number(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Water Source</Label>
                              <Select value={sizingData.waterSource} onValueChange={(v: WaterSource) => setSizingData({...sizingData, waterSource: v})}>
                                 <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="Borehole">Borehole</SelectItem>
                                    <SelectItem value="River">River</SelectItem>
                                    <SelectItem value="Pond">Pond</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>

                        {sizingData.waterSource === "Borehole" && (
                           <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10 animate-in fade-in slide-in-from-top-1">
                              <div className="space-y-1">
                                 <Label className="text-[10px] uppercase text-primary font-bold">Borehole Depth (m)</Label>
                                 <Input type="number" className="h-8 text-xs bg-white" value={sizingData.boreholeDepth} onChange={(e) => setSizingData({...sizingData, boreholeDepth: e.target.value === "" ? "" : Number(e.target.value)})} />
                              </div>
                              <div className="space-y-1">
                                 <Label className="text-[10px] uppercase text-primary font-bold">Static Level (m)</Label>
                                 <Input type="number" className="h-8 text-xs bg-white" value={sizingData.staticWaterLevel} onChange={(e) => setSizingData({...sizingData, staticWaterLevel: e.target.value === "" ? "" : Number(e.target.value)})} />
                              </div>
                           </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Lift (m)</Label>
                              <Input type="number" className="h-8 text-xs bg-white" value={sizingData.tankHeight} onChange={(e) => setSizingData({...sizingData, tankHeight: e.target.value === "" ? "" : Number(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Distance (m)</Label>
                              <Input type="number" className="h-8 text-xs bg-white" value={sizingData.pipeDistance} onChange={(e) => setSizingData({...sizingData, pipeDistance: e.target.value === "" ? "" : Number(e.target.value)})} />
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Sun Hours</Label>
                              <Input type="number" className="h-8 text-xs bg-white" value={sizingData.sunHours} onChange={(e) => setSizingData({...sizingData, sunHours: e.target.value === "" ? "" : Number(e.target.value)})} />
                           </div>
                        </div>

                        <div className="pt-2 sticky bottom-0 bg-muted/10 pb-1">
                           <Button className="w-full h-11 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg" onClick={runSizingMatch}>
                              <Zap className="h-4 w-4 mr-2" /> Match Suitable Pumps
                           </Button>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center justify-between mb-1">
                           <h3 className="text-xs font-black uppercase tracking-widest text-primary">2. Recommendations</h3>
                           {sizingResults.length > 0 && <span className="text-[9px] font-bold text-muted-foreground">FOUND {sizingResults.filter(r => r.suitability === "Suitable").length} SUITABLE / {sizingResults.length} TOTAL</span>}
                        </div>

                        {/* TDH & Flow Summary Banner */}
                        {sizingSummary && (
                          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 animate-in fade-in slide-in-from-top-1">
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">TDH</p>
                              <p className="text-lg font-black text-primary">{sizingSummary.tdh}<span className="text-[10px] font-normal text-muted-foreground"> m</span></p>
                            </div>
                            <div className="text-center border-x border-primary/10">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Need</p>
                              <p className="text-lg font-black text-primary">{sizingSummary.reqFlowM3h}<span className="text-[10px] font-normal text-muted-foreground"> m³/h</span></p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Need</p>
                              <p className="text-lg font-black text-primary">{sizingSummary.reqFlowLmin}<span className="text-[10px] font-normal text-muted-foreground"> L/min</span></p>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                           {sizingResults.length > 0 ? (
                              sizingResults.map((res) => {
                                 const isExpanded = expandedPumpId === res.pump.id;
                                 const curveData = [...res.pump.performanceData]
                                   .sort((a, b) => a.flow - b.flow)
                                   .map(p => ({ flow: Number(p.flow.toFixed(2)), head: Number(p.head.toFixed(1)) }));
                                 const operatingFlow = res.flowAtHeadM3h;
                                  const totalEquipCost = res.pump.equipment.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
                                 const panelItem = res.pump.equipment.find(e => e.name.toLowerCase().includes('panel') && !e.name.toLowerCase().includes('rod'));
                                 const panelCount = panelItem?.quantity || 0;

                                 return (
                                   <div key={res.pump.id} className={cn("rounded-2xl border-2 transition-all overflow-hidden", suitabilityColor(res.suitability))}>
                                     {/* Summary Row */}
                                     <div
                                       className="p-3 cursor-pointer flex justify-between items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                                       onClick={() => setExpandedPumpId(isExpanded ? null : res.pump.id)}
                                     >
                                       <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2 mb-1 flex-wrap">
                                           <p className="font-bold text-sm leading-none truncate">{res.pump.model}</p>
                                           <Badge className={cn("text-[8px] h-3.5 px-1.5 font-black border uppercase", suitabilityBadge(res.suitability))}>{res.suitability}</Badge>
                                           <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-medium">{res.pump.power}</Badge>
                                         </div>
                                         <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                                           <span>Flow @ {res.tdh}m: <b className="text-foreground">{operatingFlow.toFixed(2)} m³/h</b></span>
                                           <span>Max Head: <b className="text-foreground">{res.maxHead}m</b></span>
                                           <span>System: <b className="text-foreground">{formatCurrency(totalEquipCost)}</b></span>
                                           {panelCount > 0 && <span className="flex items-center gap-0.5"><Sun className="h-3 w-3" /> <b className="text-foreground">{panelCount} panels</b></span>}
                                         </div>
                                       </div>
                                       <div className="flex items-center gap-2 ml-2 shrink-0">
                                         {res.suitability === "Suitable" && (
                                           <Button size="sm" className="h-7 px-3 font-black text-[10px] uppercase tracking-tighter bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); addSystemToInvoice(res.pump); }}>
                                             <Package className="h-3 w-3 mr-1" /> Add System
                                           </Button>
                                         )}
                                         {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                       </div>
                                     </div>

                                     {/* Expanded Detail Panel */}
                                     {isExpanded && (
                                       <div className="border-t border-current/10 bg-white/60 dark:bg-black/20 p-4 space-y-4 animate-in fade-in slide-in-from-top-1">
                                         {/* Hydraulic Curve Chart */}
                                         <div>
                                           <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Hydraulic Performance Curve</h4>
                                           <div className="h-[220px] w-full bg-white dark:bg-zinc-900 rounded-xl border p-2">
                                             <ResponsiveContainer width="100%" height="100%">
                                               <LineChart data={curveData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                                 <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                 <XAxis dataKey="flow" label={{ value: 'Flow (m³/h)', position: 'insideBottom', offset: -2, style: { fontSize: 10 } }} tick={{ fontSize: 9 }} />
                                                 <YAxis label={{ value: 'Head (m)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} tick={{ fontSize: 9 }} />
                                                 <Tooltip contentStyle={{ fontSize: 11 }} formatter={(val: number, name: string) => [val, name === 'head' ? 'Head (m)' : name]} labelFormatter={(l) => `Flow: ${l} m³/h`} />
                                                 <Line type="monotone" dataKey="head" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} name="Pump Curve" />
                                                 {res.suitability !== "Exceeds Limit" && operatingFlow > 0 && (
                                                   <ReferenceDot x={Number(operatingFlow.toFixed(2))} y={res.tdh} r={7} fill="#ef4444" stroke="#fff" strokeWidth={2} label={{ value: 'OP', position: 'top', style: { fontSize: 9, fontWeight: 800, fill: '#ef4444' } }} />
                                                 )}
                                               </LineChart>
                                             </ResponsiveContainer>
                                           </div>
                                         </div>

                                         {/* Solar Array & Equipment */}
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                           {/* Solar Config */}
                                           {panelCount > 0 && (
                                             <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                               <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1"><Sun className="h-3 w-3" /> Solar Array</h4>
                                               <p className="text-sm font-bold">{panelCount} × 330W Panels</p>
                                               <p className="text-[10px] text-muted-foreground">
                                                 {panelCount <= 4 ? `${panelCount} in series, 1 string` :
                                                  panelCount <= 8 ? `${Math.ceil(panelCount / 2)} in series, 2 strings` :
                                                  panelCount <= 12 ? `${Math.ceil(panelCount / 3)} in series, 3 strings` :
                                                  `${Math.ceil(panelCount / 4)} in series, ${Math.min(4, Math.ceil(panelCount / Math.ceil(panelCount / 4)))} strings`}
                                               </p>
                                               <p className="text-[10px] text-muted-foreground mt-0.5">Total: {(panelCount * 330 / 1000).toFixed(1)} kW</p>
                                             </div>
                                           )}

                                           {/* Equipment Summary */}
                                           <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                             <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1"><Package className="h-3 w-3" /> System Total</h4>
                                             <p className="text-lg font-black text-blue-700 dark:text-blue-300">{formatCurrency(totalEquipCost)}</p>
                                             <p className="text-[10px] text-muted-foreground">{res.pump.equipment.length} items in kit</p>
                                           </div>
                                         </div>

                                         {/* Equipment Breakdown Table */}
                                         <div>
                                           <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Equipment Breakdown</h4>
                                           <div className="border rounded-lg overflow-hidden">
                                             <table className="w-full text-[11px]">
                                               <thead>
                                                 <tr className="bg-muted/40 text-muted-foreground">
                                                   <th className="text-left py-1.5 px-2 font-bold">Item</th>
                                                   <th className="text-center py-1.5 px-2 font-bold">Qty</th>
                                                   <th className="text-right py-1.5 px-2 font-bold">Unit Price</th>
                                                   <th className="text-right py-1.5 px-2 font-bold">Subtotal</th>
                                                 </tr>
                                               </thead>
                                               <tbody>
                                                 {res.pump.equipment.map((eq, idx) => (
                                                   <tr key={idx} className="border-t border-muted/30">
                                                     <td className="py-1.5 px-2 font-medium">{eq.name}</td>
                                                     <td className="py-1.5 px-2 text-center">{eq.quantity} {eq.unit}</td>
                                                     <td className="py-1.5 px-2 text-right">{formatCurrency(eq.price)}</td>
                                                     <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(eq.price * eq.quantity)}</td>
                                                   </tr>
                                                 ))}
                                               </tbody>
                                               <tfoot>
                                                 <tr className="border-t-2 border-foreground/20 bg-muted/20">
                                                   <td colSpan={3} className="py-1.5 px-2 font-black text-right">Total</td>
                                                   <td className="py-1.5 px-2 text-right font-black">{formatCurrency(totalEquipCost)}</td>
                                                 </tr>
                                               </tfoot>
                                             </table>
                                           </div>
                                         </div>

                                         {/* Add to Invoice */}
                                         <Button
                                           className="w-full h-10 font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white"
                                           onClick={() => addSystemToInvoice(res.pump)}
                                         >
                                           <ShoppingCart className="h-4 w-4 mr-2" /> Add Full System to Invoice — {formatCurrency(totalEquipCost)}
                                         </Button>
                                       </div>
                                     )}
                                   </div>
                                 );
                              })
                           ) : (
                              <div className="h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground/30 text-center p-6 bg-muted/10">
                                 <Search className="h-8 w-8 mb-2 opacity-20" />
                                 <p className="text-[10px] font-bold uppercase tracking-widest">Enter specs and click "Match Suitable Pumps"</p>
                                 <p className="text-[9px] mt-1 opacity-50">Results will show pump models ranked by suitability with hydraulic curves</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* QUICK PRODUCT SELECTOR FOR NON-PUMP ITEMS */}
                  <div className="pt-4 border-t border-muted/50">
                    <div className="flex items-center gap-2 mb-3">
                       <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Quick Add Other Materials</h3>
                       <div className="h-[1px] flex-1 bg-muted/50"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-4">
                        <Select value={selectedCategory} onValueChange={(cat) => { setSelectedCategory(cat); setSelectedProduct(""); }}>
                          <SelectTrigger className="h-9 bg-muted/30"><SelectValue placeholder="All Categories" /></SelectTrigger>
                          <SelectContent>
                            {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-5">
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                          <SelectTrigger className="h-9 bg-muted/30"><SelectValue placeholder="Search Item..." /></SelectTrigger>
                          <SelectContent>
                            {categoryProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-3 flex gap-2">
                        <Input type="number" value={qty} onChange={(e) => { const v = e.target.value; setQty(v === "" ? "" : Number(v)); }} className="h-9 w-16 bg-muted/30" />
                        <Button className="h-9 flex-1 font-bold" onClick={addItem} disabled={!selectedProduct}>
                           <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium text-center">Qty</th>
                        <th className="pb-2 font-medium text-right">Price</th>
                        <th className="pb-2 font-medium text-right">Cost</th>
                        <th className="pb-2 font-medium text-right">Profit</th>
                        <th className="pb-2 font-medium text-right">Total Sell</th>
                        <th className="pb-2 font-medium text-right">Total Cost</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.productId} className="border-b last:border-0">
                          <td className="py-3 font-medium">{item.productName}</td>
                          <td className="py-3 text-center">
                            <Input type="number" min={1} value={item.quantity}
                              onChange={(e) => updateItemQty(item.productId, e.target.value)}
                              className="w-16 text-center mx-auto h-8" />
                          </td>
                          <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                          <td className="py-3 text-right">{formatCurrency(item.cost)}</td>
                          <td className="py-3 text-right text-success">{formatCurrency((item.price - item.cost) * item.quantity)}</td>
                          <td className="py-3 text-right font-medium">{formatCurrency(item.price * item.quantity)}</td>
                          <td className="py-3 text-right">{formatCurrency(item.cost * item.quantity)}</td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.productId)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">{formatCurrency(totals.totalSell)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Cost</span><span>{formatCurrency(totals.totalCost)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Profit</span><span className="text-success font-medium">{formatCurrency(totals.profit)}</span></div>
                {vatIncluded && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">VAT (15%)</span><span className="text-destructive">{formatCurrency(totals.vatAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Net Price</span><span>{formatCurrency(totals.netAmount)}</span></div>
                  </>
                )}
                <div className="border-t pt-2 flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totals.totalSell)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="vat" checked={vatIncluded} onCheckedChange={(c) => setVatIncluded(!!c)} />
                <Label htmlFor="vat" className="text-sm">Include VAT (15%)</Label>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "Cash" ? "default" : "outline"}
                    className="w-full text-xs"
                    onClick={() => setPaymentMethod("Cash")}
                  >
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "Bank" ? "default" : "outline"}
                    className="w-full text-xs"
                    onClick={() => setPaymentMethod("Bank")}
                  >
                    Bank
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "Telebirr" ? "default" : "outline"}
                    className="w-full text-xs"
                    onClick={() => setPaymentMethod("Telebirr")}
                  >
                    Telebirr
                  </Button>
                </div>

                {paymentMethod === "Bank" && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <Label className="text-xs">Select Bank</Label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose Ethiopian Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {ETHIOPIAN_BANKS.map((bank: string) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={completeSale} className="w-full">Complete Sale</Button>
                <Button variant="outline" className="w-full" onClick={printInvoice}>
                  <Printer className="h-4 w-4 mr-1" /> Print Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Printable Invoice (hidden, shown only on print) */}
      {lastSale && (
        <div ref={invoiceRef} className="hidden print:block print:p-8 bg-white text-black max-w-[800px] mx-auto">
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">SolarPump</h1>
              <p className="text-sm text-gray-600">Management System</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">INVOICE</h2>
              <p className="text-sm">#{lastSale.id}</p>
              <p className="text-sm">Date: {lastSale.date}</p>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-1">Bill To:</h3>
            <p className="font-medium">{lastSale.customer.name}</p>
            {lastSale.customer.phone && <p className="text-sm">{lastSale.customer.phone}</p>}
            {lastSale.customer.location && <p className="text-sm">{lastSale.customer.location}</p>}
          </div>
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-1">Payment Method:</h3>
            <p className="text-sm uppercase">{lastSale.paymentMethod}</p>
            {lastSale.paymentMethod === "Bank" && lastSale.bankName && (
              <p className="text-sm font-medium">{lastSale.bankName}</p>
            )}
            {lastSale.paymentMethod === "Telebirr" && (
              <p className="text-sm font-medium">Telebirr Mobile Money</p>
            )}
          </div>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 font-bold">#</th>
                <th className="text-left py-2 font-bold">Product</th>
                <th className="text-center py-2 font-bold">Qty</th>
                <th className="text-right py-2 font-bold">Unit Price</th>
                <th className="text-right py-2 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {lastSale.items.map((item, i) => (
                <tr key={item.productId} className="border-b border-gray-300">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{item.productName}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(lastSale.totalSell)}</span></div>
              {lastSale.vatIncluded && (
                <>
                  <div className="flex justify-between"><span>VAT (15%):</span><span>{formatCurrency(lastSale.vatAmount)}</span></div>
                  <div className="flex justify-between"><span>Net Amount:</span><span>{formatCurrency(lastSale.netAmount)}</span></div>
                </>
              )}
              <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2">
                <span>Total:</span><span>{formatCurrency(lastSale.totalSell)}</span>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>Thank you for your business!</p>
          </div>
        </div>
      )}
    </div>
  );
}
