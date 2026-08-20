import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Droplets,
  Zap,
  Wrench,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  Layers,
  Sun,
} from "lucide-react";
import { Product, ProductCategory, formatCurrency } from "@/lib/data";
import { PlannedMaterialItem, MaterialSource } from "@/lib/fieldwork-data";
import { inventoryApi } from "@/lib/api/inventory";

interface FieldWorkMaterialPlanningProps {
  pumpModel: string;
  products: Product[];
  availableCompanyTools: { id: string; name: string; serialNumber: string; category?: string }[];
  selectedTools: string[];
  onSelectedToolsChange: (toolIds: string[]) => void;
  onMaterialsChange: (materials: PlannedMaterialItem[]) => void;
  onPumpSerialChange: (serial: string) => void;
  onPumpSourceChange: (source: MaterialSource) => void;
}

export const FieldWorkMaterialPlanning: React.FC<FieldWorkMaterialPlanningProps> = ({
  pumpModel,
  products,
  availableCompanyTools,
  selectedTools,
  onSelectedToolsChange,
  onMaterialsChange,
  onPumpSerialChange,
  onPumpSourceChange,
}) => {
  // 1. Pump State
  const pumpProduct = products.find(
    (p) =>
      p.productCategory === "PUMP" &&
      (p.model?.toLowerCase() === pumpModel?.toLowerCase() ||
        p.name?.toLowerCase().includes(pumpModel?.toLowerCase()))
  );
  const pumpStock = Number(pumpProduct?.quantity) || 0;
  const pumpSource: MaterialSource = pumpStock > 0 ? "FROM_STOCK" : "BOUGHT";

  const [pumpSerial, setPumpSerial] = useState("");
  const [pumpPurchasePrice, setPumpPurchasePrice] = useState<number>(pumpProduct?.sellPrice || 0);

  // 2. Solar Panel Specific State (Customizable / Auto-sized)
  const [panelType, setPanelType] = useState("Solar Panel 250W");
  const [panelQuantity, setPanelQuantity] = useState<number>(0);
  const [panelSource, setPanelSource] = useState<MaterialSource>("FROM_STOCK");
  const [panelPrice, setPanelPrice] = useState<number>(6000);

  // 3. Equipment State (Auto-loaded)
  const [equipmentList, setEquipmentList] = useState<PlannedMaterialItem[]>([]);

  // 3. Work Tools (Consumables) State
  const [workToolsList, setWorkToolsList] = useState<PlannedMaterialItem[]>([]);

  // Sync panel details whenever type, quantity, or products catalog changes
  useEffect(() => {
    const matched = products.find(
      (p) => p.productCategory === "SOLAR_PANEL" && p.name === panelType
    );
    const avail = Number(matched?.quantity) || 0;
    const priceVal = matched ? Number(matched.sellPrice) : (panelType.includes("550W") ? 14000 : panelType.includes("450W") ? 11000 : panelType.includes("350W") ? 8500 : 6000);
    setPanelPrice(priceVal);
    setPanelSource(avail >= panelQuantity ? "FROM_STOCK" : "BOUGHT");
  }, [panelType, panelQuantity, products]);

  // Load auto-mapped equipment for this pump model
  useEffect(() => {
    onPumpSourceChange(pumpSource);

    const loadPumpEquipment = async () => {
      if (!pumpModel) return;
      try {
        const mapped = await inventoryApi.getPumpEquipmentMap(pumpModel);
        if (mapped && mapped.length > 0) {
          // Separate solar panel from other accessories
          const panelItem = mapped.find((m: any) =>
            m.name.toLowerCase().includes("panel") || m.productId?.toLowerCase().includes("panel")
          );

          if (panelItem) {
            const invMatch = products.find(
              (p) =>
                p.productCategory === "SOLAR_PANEL" &&
                (p.name.toLowerCase() === panelItem.name.toLowerCase() || p.code === panelItem.productId)
            );
            const avail = Number(invMatch?.quantity) || 0;
            const src: MaterialSource = avail >= panelItem.quantity ? "FROM_STOCK" : "BOUGHT";
            
            setPanelType(invMatch?.name || panelItem.name || "Solar Panel 250W");
            setPanelQuantity(panelItem.quantity || 4);
            setPanelPrice(panelItem.price || Number(invMatch?.sellPrice) || 6000);
            setPanelSource(src);
          } else {
            setPanelQuantity(0);
          }

          const otherAccessories = mapped.filter((m: any) =>
            !(m.name.toLowerCase().includes("panel") || m.productId?.toLowerCase().includes("panel"))
          );

          const formatted: PlannedMaterialItem[] = otherAccessories.map((m: any) => {
            const invMatch = products.find(
              (p) =>
                p.name.toLowerCase() === m.name.toLowerCase() ||
                p.code === m.productId ||
                (p.productCategory === "PUMP_EQUIPMENT" && p.name.includes(m.name))
            );
            const avail = Number(invMatch?.quantity) || 0;
            const src: MaterialSource = avail >= m.quantity ? "FROM_STOCK" : "BOUGHT";

            return {
              productId: invMatch?.id || m.productId,
              productCode: invMatch?.code ? String(invMatch.code) : undefined,
              name: m.name,
              category: "PUMP_EQUIPMENT" as ProductCategory,
              quantity: m.quantity || 1,
              unit: m.unit || "Piece",
              price: m.price || Number(invMatch?.sellPrice) || 0,
              source: src,
              availableStock: avail,
            };
          });
          setEquipmentList(formatted);
        } else {
          // Fallback default accessories
          setPanelType("Solar Panel 250W");
          setPanelQuantity(4);
          setPanelPrice(6000);
          setPanelSource("FROM_STOCK");

          setEquipmentList([
            {
              name: `${pumpModel} MPPT Solar Controller`,
              category: "PUMP_EQUIPMENT",
              quantity: 1,
              unit: "Piece",
              price: 12000,
              source: "FROM_STOCK",
              availableStock: 5,
            },
          ]);
        }
      } catch (err) {
        console.warn("Could not load pump equipment map:", err);
      }
    };

    loadPumpEquipment();
  }, [pumpModel, products]);

  // Sync all materials up to parent whenever lists change
  useEffect(() => {
    const matchedPanelProduct = products.find(
      (p) => p.productCategory === "SOLAR_PANEL" && p.name === panelType
    );

    const panelItems = panelQuantity > 0 ? [{
      name: panelType,
      productId: matchedPanelProduct?.id || `PRD-PANEL-MOCK`,
      productCode: matchedPanelProduct?.code ? String(matchedPanelProduct.code) : undefined,
      category: "SOLAR_PANEL" as ProductCategory,
      quantity: panelQuantity,
      unit: "Piece",
      price: panelPrice,
      source: panelSource,
      availableStock: Number(matchedPanelProduct?.quantity) || 0,
    }] : [];

    const allMaterials: PlannedMaterialItem[] = [
      // Pump as material item
      {
        name: pumpModel || "Solar Pump",
        productId: pumpProduct?.id,
        productCode: pumpProduct?.code ? String(pumpProduct.code) : undefined,
        category: "PUMP",
        serialNumber: pumpSerial.trim(),
        quantity: 1,
        unit: "Piece",
        price: pumpPurchasePrice,
        source: pumpSource,
        availableStock: pumpStock,
      },
      ...panelItems,
      ...equipmentList,
      ...workToolsList,
    ];

    onMaterialsChange(allMaterials);
    onPumpSerialChange(pumpSerial);
  }, [pumpSerial, pumpPurchasePrice, panelType, panelQuantity, panelPrice, panelSource, equipmentList, workToolsList, pumpSource, pumpStock]);

  // Add custom equipment item
  const handleAddEquipment = () => {
    setEquipmentList((prev) => [
      ...prev,
      {
        name: "New Equipment Accessory",
        category: "PUMP_EQUIPMENT",
        quantity: 1,
        unit: "Piece",
        price: 0,
        source: "FROM_STOCK",
        availableStock: 1,
      },
    ]);
  };

  // Add custom work tool (consumable)
  const handleAddWorkTool = () => {
    setWorkToolsList((prev) => [
      ...prev,
      {
        name: "Solar Cable / Fittings / Consumable",
        category: "WORK_TOOL",
        quantity: 10,
        unit: "Meter (m)",
        price: 250,
        source: "FROM_STOCK",
        availableStock: 100,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-border/40 pb-2">
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
          <Layers className="h-4 w-4" /> 4-Category Material & Tool Planning
        </h4>
        <p className="text-[11px] text-muted-foreground">
          Configure physical serial numbers, auto-loaded equipment, company tools, and consumables.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CATEGORY 1: PUMP UNIT
      ───────────────────────────────────────────────────────────── */}
      <Card className="p-3.5 border border-sky-500/20 bg-sky-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Droplets className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-foreground">1. Solar Pump Unit</span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                Model: <strong>{pumpModel || "Selected from Sizing"}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                pumpStock > 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
              }
            >
              {pumpStock > 0 ? `In Stock (${pumpStock} available)` : "Stock: 0 (Direct Purchase)"}
            </Badge>
            <Badge
              variant="outline"
              className={
                pumpSource === "FROM_STOCK"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40 text-[10px]"
                  : "bg-amber-500/20 text-amber-300 font-bold border-amber-500/40 text-[10px]"
              }
            >
              {pumpSource === "FROM_STOCK" ? "Source: From Stock" : "Source: Procured"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">
              Serial Number * <span className="text-[10px] text-muted-foreground font-normal">(Type from physical pump unit)</span>
            </Label>
            <Input
              placeholder="e.g. SN-PUMP-88472"
              value={pumpSerial}
              onChange={(e) => setPumpSerial(e.target.value)}
              className="h-8 text-xs font-mono font-bold bg-background text-sky-400 border-sky-500/30"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">
              Unit Price / Valuation (ETB)
            </Label>
            <Input
              type="number"
              value={pumpPurchasePrice}
              onChange={(e) => setPumpPurchasePrice(parseFloat(e.target.value) || 0)}
              className="h-8 text-xs font-mono bg-background"
            />
          </div>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          CATEGORY 1.5: SOLAR PANELS (Auto-sized / Customizable)
      ───────────────────────────────────────────────────────────── */}
      <Card className="p-3.5 border border-indigo-500/20 bg-indigo-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sun className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-foreground">1.5 Solar Panel Configuration</span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                Auto-sized panels (optional adjustment of wattage and counts)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {panelQuantity > 0 && (
              <>
                <Badge
                  variant="outline"
                  className={
                    (Number(products.find(p => p.productCategory === "SOLAR_PANEL" && p.name === panelType)?.quantity) || 0) >= panelQuantity
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
                  }
                >
                  {(Number(products.find(p => p.productCategory === "SOLAR_PANEL" && p.name === panelType)?.quantity) || 0) >= panelQuantity
                    ? "In Stock"
                    : "Low Stock (Direct Purchase)"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    panelSource === "FROM_STOCK"
                      ? "bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40 text-[10px]"
                      : "bg-amber-500/20 text-amber-300 font-bold border-amber-500/40 text-[10px]"
                  }
                >
                  {panelSource === "FROM_STOCK" ? "Source: From Stock" : "Source: Procured"}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Panel Model / Wattage</Label>
            <select
              value={panelType}
              onChange={(e) => setPanelType(e.target.value)}
              className="w-full bg-background border border-border/60 hover:border-border rounded-md text-xs h-8 px-2 font-sans text-foreground"
            >
              {products.filter(p => p.productCategory === "SOLAR_PANEL").length > 0 ? (
                products.filter(p => p.productCategory === "SOLAR_PANEL").map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.quantity} in stock)
                  </option>
                ))
              ) : (
                <>
                  <option value="Solar Panel 250W">Solar Panel 250W</option>
                  <option value="Solar Panel 350W">Solar Panel 350W</option>
                  <option value="Solar Panel 450W">Solar Panel 450W</option>
                  <option value="Solar Panel 550W">Solar Panel 550W</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Quantity needed (pcs)</Label>
            <Input
              type="number"
              min="0"
              value={panelQuantity}
              onChange={(e) => setPanelQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-8 text-xs font-mono bg-background text-foreground"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Unit Price (ETB)</Label>
            <div className="h-8 flex items-center justify-end px-3 bg-muted/30 border border-border/60 rounded-md text-xs font-mono text-foreground font-semibold">
              {formatCurrency(panelPrice)}
            </div>
          </div>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          CATEGORY 2: PUMP EQUIPMENT (Auto-loaded)
      ───────────────────────────────────────────────────────────── */}
      <Card className="p-3.5 border border-amber-500/20 bg-amber-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-foreground">2. Pump Equipment (Compatible Accessories)</span>
              <span className="text-[10px] text-muted-foreground block">
                Auto-mapped controllers, panels, and mounting hardware for {pumpModel}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddEquipment}
            className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Accessory
          </Button>
        </div>

        {equipmentList.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No specific equipment mapped. You can add accessories above.</p>
        ) : (
          <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold h-7 py-1">Equipment Name</TableHead>
                  <TableHead className="text-xs font-semibold h-7 py-1 text-center w-20">Qty</TableHead>
                  <TableHead className="text-xs font-semibold h-7 py-1 text-center w-28">Source</TableHead>
                  <TableHead className="text-xs font-semibold h-7 py-1 text-right w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentList.map((eq, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/20">
                    <TableCell className="py-1.5">
                      <Input
                        value={eq.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEquipmentList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                          );
                        }}
                        className="h-7 text-xs bg-transparent border-none p-0 focus-visible:ring-0 font-medium"
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <Input
                        type="number"
                        min="1"
                        value={eq.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          setEquipmentList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                          );
                        }}
                        className="h-7 text-xs text-center w-16 mx-auto bg-background font-mono"
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const nextSource: MaterialSource =
                            eq.source === "FROM_STOCK" ? "BOUGHT" : "FROM_STOCK";
                          setEquipmentList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, source: nextSource } : item))
                          );
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                          eq.source === "FROM_STOCK"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {eq.source === "FROM_STOCK" ? "From Stock" : "Procured"}
                      </button>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEquipmentList((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          CATEGORY 3: COMPANY TOOLS (Checked Out & Returned)
      ───────────────────────────────────────────────────────────── */}
      <Card className="p-3.5 border border-emerald-500/20 bg-emerald-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-foreground">3. Company Tools (Reusable Assets)</span>
              <span className="text-[10px] text-muted-foreground block">
                Checked out by TTL before departure, must be returned after installation
              </span>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
            {selectedTools.length} Tools Selected
          </Badge>
        </div>

        {availableCompanyTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 border rounded-lg bg-background/50 max-h-36 overflow-y-auto">
            {availableCompanyTools.map((tool) => {
              const isChecked = selectedTools.includes(tool.id);
              return (
                <label
                  key={tool.id}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                    isChecked
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                      : "bg-background border-border/40 hover:bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectedToolsChange([...selectedTools, tool.id]);
                        } else {
                          onSelectedToolsChange(selectedTools.filter((id) => id !== tool.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <span className="text-xs font-semibold text-foreground block">{tool.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">SN: {tool.serialNumber}</span>
                    </div>
                  </div>
                  {tool.category && (
                    <Badge variant="outline" className="text-[9px] bg-slate-800 text-slate-300 border-slate-700">
                      {tool.category}
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-1">No company tools currently available in warehouse.</p>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          CATEGORY 4: WORK TOOLS (Consumables)
      ───────────────────────────────────────────────────────────── */}
      <Card className="p-3.5 border border-purple-500/20 bg-purple-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-foreground">4. Work Tools (Expendables & Consumables)</span>
              <span className="text-[10px] text-muted-foreground block">
                Generic pipes, cables, cable ties, screws, Teflon tape consumed during installation
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddWorkTool}
            className="h-7 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Consumable
          </Button>
        </div>

        {workToolsList.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">
            No extra consumables planned. Click "+ Add Consumable" to request installation hardware.
          </p>
        ) : (
          <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold h-7 py-1">Material Name</TableHead>
                  <TableHead className="text-xs font-semibold h-7 py-1 text-center w-24">Qty</TableHead>
                  <TableHead className="text-xs font-semibold h-7 py-1 text-center w-20">Unit</TableHead>
                  <TableHead className="text-xs font-semibold h-7 py-1 text-center w-28">Source</TableHead>
                  <TableHead className="text-xs font-semibold h-7 py-1 text-right w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workToolsList.map((wt, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/20">
                    <TableCell className="py-1.5">
                      <Input
                        value={wt.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkToolsList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                          );
                        }}
                        className="h-7 text-xs bg-transparent border-none p-0 focus-visible:ring-0 font-medium"
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={wt.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          setWorkToolsList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item))
                          );
                        }}
                        className="h-7 text-xs text-center w-20 mx-auto bg-background font-mono"
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <select
                        value={wt.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWorkToolsList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                          );
                        }}
                        className="h-7 text-[10px] bg-background border border-border/40 rounded px-1 text-foreground"
                      >
                        <option value="pcs">pcs</option>
                        <option value="meters">meters</option>
                        <option value="rolls">rolls</option>
                        <option value="sets">sets</option>
                        <option value="kg">kg</option>
                        <option value="liters">liters</option>
                      </select>
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const nextSource: MaterialSource =
                            wt.source === "FROM_STOCK" ? "BOUGHT" : "FROM_STOCK";
                          setWorkToolsList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, source: nextSource } : item))
                          );
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                          wt.source === "FROM_STOCK"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        }`}
                      >
                        {wt.source === "FROM_STOCK" ? "● From Stock" : "🛒 Bought"}
                      </button>
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setWorkToolsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
