import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { CalendarIcon, Plus, Trash2, Printer, ShoppingCart, Zap, MapPin, Wallet, Building, Smartphone, Users, Droplets, Search, Calculator, ChevronDown, ChevronUp, Sun, Package, TrendingUp, Check, RefreshCw, Wrench } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatCurrency, VAT_RATE, Sale, SaleItem, Customer, POS_CATEGORY_GROUPS, ETHIOPIAN_REGIONS, ETHIOPIAN_BANKS } from "@/lib/data";
import { PumpModel } from "@/lib/pump-data";
import { pumpProductsDB, hierarchyRequestsDB } from "@/lib/db-service";
import { apiClient } from "@/lib/api/client";
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
  const [mode, setMode] = useState<"items" | "proposal">("items");
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank" | "Telebirr">("Cash");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const invoiceRef = useRef<HTMLDivElement>(null);

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
        console.error("Could not load products", error);
      }
    };
    loadPumps();
  }, []);

  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await apiClient.get("/sizing-requests");
      const filtered = res.data.filter((p: any) => p.status === "APPROVED_TM" || p.status === "PAID");
      setProposals(filtered);
    } catch (err) {
      console.error("Failed to fetch sizing proposals in POS:", err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleImportProposal = (proposalId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    const dColl = proposal.dataCollection && typeof proposal.dataCollection === "object" ? proposal.dataCollection : {};
    setCustomer({
      id: proposal.id,
      name: proposal.clientName,
      phone: dColl.clientPhone || dColl.phone || dColl.phoneNumber || proposal.phoneNumber || "",
      location: proposal.address || dColl.location || "",
      region: dColl.region || proposal.region || "Oromia",
      woreda: dColl.woreda || proposal.woreda || "",
      gpsLat: proposal.latitude ? String(proposal.latitude) : (dColl.gpsLat ? String(dColl.gpsLat) : ""),
      gpsLng: proposal.longitude ? String(proposal.longitude) : (dColl.gpsLng ? String(dColl.gpsLng) : ""),
    });

    let parsedEquip: any[] = [];
    if (proposal.calculatedEquipment) {
      parsedEquip = typeof proposal.calculatedEquipment === "string" 
        ? JSON.parse(proposal.calculatedEquipment) 
        : proposal.calculatedEquipment;
    }

    const invoiceItems: SaleItem[] = parsedEquip.map((item: any) => {
      const matchedProd = products.find(p => p.id === item.id || normalize(p.name) === normalize(item.name));
      return {
        productId: matchedProd?.id || "",
        productName: item.name,
        quantity: Number(item.qty || item.quantity || 1),
        price: Number(item.price || matchedProd?.sellPrice || 0),
        cost: Number(matchedProd?.costPrice || 0),
      };
    });

    setItems(invoiceItems);
    toast.success(`Successfully imported sizing proposal for ${proposal.clientName} with ${invoiceItems.length} items.`);
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

    const isSizingImport = customer.id && !customer.id.startsWith("C");

    const sale: Sale = {
      id: `S${Date.now().toString().slice(-6)}`,
      date: format(saleDate, "yyyy-MM-dd"),
      customer: { ...customer, id: isSizingImport ? customer.id : `C${Date.now()}` },
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
    
    // Sizing Import Flow payment verification & automatic fieldwork logging
    if (isSizingImport) {
      try {
        await apiClient.patch(`/sizing-requests/${customer.id}/finance-pay`);
        toast.success("Linked sizing proposal registered as Paid in CRM database");
      } catch (err) {
        console.error("Failed to mark sizing request as paid on checkout:", err);
      }
    } else {
      // Auto-submit hierarchy request for field work installation to General Manager for standard sales
      try {
        await hierarchyRequestsDB.create({
          title: `Installation Approval: Sale ${sale.id}`,
          description: `New equipment sold to ${sale.customer.name}.\nLocation: ${sale.customer.location || "N/A"}\nItems: ${sale.items.map(i => `${i.productName} (x${i.quantity})`).join(", ")}\nTotal: ${formatCurrency(sale.totalSell)}`,
          amount: sale.totalSell,
          type: "FIELD_TRIP",
          comment: `Sale completed. Requesting GM approval to assign Technical Manager for research/site survey.`
        });
        toast.success("Fieldwork installation request sent to GM");
      } catch (e) {
        console.error("Failed to trigger hierarchy workflow for sale:", e);
      }
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
    setSelectedProposalId("");
    setMode("items");
    setPaymentMethod("Cash");
    setSelectedBank("");
    fetchProposals();
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
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading">Add Items to Cart</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Sell individual items or import a sized pump system proposal.</p>
              </div>
              <div className="flex gap-1.5 bg-muted/60 p-1 rounded-lg">
                <Button 
                  type="button"
                  variant={mode === "items" ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-xs font-bold" 
                  onClick={() => setMode("items")}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Sell Items
                </Button>
                <Button 
                  type="button"
                  variant={mode === "proposal" ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-xs font-bold" 
                  onClick={() => setMode("proposal")}
                >
                  <Zap className="h-3.5 w-3.5 mr-1" /> Import Sizing
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "proposal" ? (
                <div className="space-y-4 pt-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs font-semibold">Select Paid/Approved Sizing Proposal</Label>
                      <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={loadingProposals ? "Loading proposals..." : "Choose a client proposal..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {proposals.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.clientName} ({p.selectedPumpModel || "Custom"}) - {formatCurrency(Number(p.totalPrice || 0))}
                            </SelectItem>
                          ))}
                          {proposals.length === 0 && (
                            <SelectItem value="none" disabled>No proposals available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => handleImportProposal(selectedProposalId)} 
                      disabled={!selectedProposalId || selectedProposalId === "none"}
                      className="bg-primary hover:bg-primary/95 text-white font-bold"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Import Proposal
                    </Button>
                  </div>
                  {selectedProposalId && selectedProposalId !== "none" && (
                    (() => {
                      const selected = proposals.find(p => p.id === selectedProposalId);
                      if (!selected) return null;
                      return (
                        <div className="p-3 bg-muted/40 rounded-xl border space-y-2 text-xs animate-in fade-in slide-in-from-top-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Water Demand:</span>
                            <span className="font-semibold text-foreground">{Number(selected.dailyWaterNeed).toLocaleString()} L/day</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Source / Model:</span>
                            <span className="font-semibold text-foreground">{selected.waterSource} • {selected.selectedPumpModel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-medium">Proposal Status:</span>
                            <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-bold uppercase tracking-wider h-4 py-0">
                              {selected.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4 space-y-1.5">
                      <Label className="text-xs font-semibold">Category</Label>
                      <Select value={selectedCategory} onValueChange={(cat) => { setSelectedCategory(cat); setSelectedProduct(""); }}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="All Categories" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-categories">All Categories</SelectItem>
                          {allCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-5 space-y-1.5">
                      <Label className="text-xs font-semibold">Product Name</Label>
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Search item..." /></SelectTrigger>
                        <SelectContent>
                          {(selectedCategory === "all-categories" || !selectedCategory ? products.filter(p => p.quantity > 0) : categoryProducts).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (Stock: {p.quantity} {p.unit || "pcs"}) - {formatCurrency(p.sellPrice)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <Label className="text-xs font-semibold">Quantity</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="number" 
                          min={1} 
                          value={qty} 
                          onChange={(e) => { const v = e.target.value; setQty(v === "" ? "" : Number(v)); }} 
                          className="w-16 bg-background" 
                        />
                        <Button className="flex-1 font-bold text-white bg-primary hover:bg-primary/95" onClick={addItem} disabled={!selectedProduct}>
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>
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
