import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEquipmentTotal, EquipmentItem } from "@/lib/pump-data";
import { pumpProductsDB } from "@/lib/db-service";
import { useStore } from "@/context/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecurityCodeDialog } from "@/components/SecurityCodeDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Zap,
  Droplets,
  Gauge,
  Sun,
  ChevronRight,
  ShoppingCart,
  Package,
  Pencil,
  Plus,
  Trash2,
  Save,
  Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type FlowUnit = "m3h" | "m3s";
type InfoTab = "introduction" | "catalog" | "packaging" | "wiring";

function getCatalogInfo(pump: any) {
  if (!pump) return { pdfUrl: "", pdfName: "", pageNum: 1, imagePath: "" };
  
  if (pump.sourceUrl === "陆地泵汽油机泵太阳能系列.pdf") {
    const pdfName = "陆地泵汽油机泵太阳能系列.pdf";
    const pdfUrl = `/uploads/${pdfName}`;
    return {
      pdfUrl,
      pdfName,
      pageNum: 2,
      imagePath: "/uploads/chinese_pdf_rendered/page_2.png"
    };
  }

  const isSolar = pump.firstCategory?.includes("DC Solar");
  const pdfName = isSolar 
    ? "DC solar water pumps 20230401 (1).pdf" 
    : "AC water pumps.pdf";
  const pdfUrl = `/uploads/${pdfName}`;

  let pageNum = 1;
  let imagePath = "";
  
  if (isSolar) {
    const secCat = pump.secondCategory || "";
    if (secCat.includes("SDC")) { pageNum = 21; imagePath = "/uploads/dc_rendered/page_21.png"; }
    else if (secCat.includes("SPC")) { pageNum = 22; imagePath = "/uploads/dc_rendered/page_22.png"; }
    else if (secCat.includes("2RSS")) { pageNum = 20; imagePath = "/uploads/dc_rendered/page_20.png"; }
    else if (secCat.includes("QGC")) { pageNum = 3; imagePath = "/uploads/dc_rendered/page_3.png"; }
    else if (secCat.includes("JTCPJW")) { pageNum = 17; imagePath = "/uploads/dc_rendered/page_17.png"; }
    else { imagePath = "/uploads/dc_rendered/page_1.png"; }
  } else {
    const match = pump.hydraulicCurveImage?.match(/cat_page_(\d+)_curve/);
    if (match) {
      const catPage = parseInt(match[1]);
      pageNum = Math.floor((catPage + 7) / 2);
      imagePath = `/uploads/rendered/page_${pageNum}.png`;
    } else {
      imagePath = "/uploads/rendered/page_4.png";
    }
  }
  return { pdfUrl, pdfName, pageNum, imagePath };
}

export default function PumpDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products } = useStore();
  const [pump, setPump] = useState<any | null>(null);
  const [parentCategory, setParentCategory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [editPerformance, setEditPerformance] = useState(false);
  const [editEquipment, setEditEquipment] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("m3h");
  const [activeTab, setActiveTab] = useState<InfoTab>("introduction");
  const [pdfOpen, setPdfOpen] = useState(false);

  const [perfData, setPerfData] = useState<any[]>([]);
  const [equipData, setEquipData] = useState<EquipmentItem[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    pumpProductsDB.getById(id)
      .then((data) => {
        const parsed = {
          ...data,
          technicalData: typeof data.technicalData === 'string' ? JSON.parse(data.technicalData) : (data.technicalData || []),
          performanceData: typeof data.performanceData === 'string' ? JSON.parse(data.performanceData) : (data.performanceData || []),
          equipment: typeof data.equipment === 'string' ? JSON.parse(data.equipment) : (data.equipment || []),
        };
        setPump(parsed);
        setPerfData(parsed.performanceData);
        setEquipData(parsed.equipment);
        setParentCategory({
          name: parsed.firstCategory || "Solar Pumps"
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const requestSecurity = (action: () => void) => {
    setPendingAction(() => action);
    setSecurityOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!pump) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Pump model not found.</p>
        <Button variant="outline" onClick={() => navigate("/pumps")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Products
        </Button>
      </div>
    );
  }

  const totalEquipmentCost = getEquipmentTotal(equipData);

  const convertFlow = (flow: number) => {
    if (flowUnit === "m3s") return flow / 60;
    return flow;
  };

  const formatFlow = (flow: number) => {
    const converted = convertFlow(flow);
    return flowUnit === "m3s" ? converted.toFixed(4) : converted.toFixed(2);
  };

  const flowLabel = flowUnit === "m3h" ? "m³/h" : "m³/s";

  const updatePerfRow = (index: number, field: "head" | "flow", value: number | "") => {
    setPerfData(perfData.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addPerfRow = () => setPerfData([...perfData, { head: "", flow: "" }]);
  const removePerfRow = (index: number) => setPerfData(perfData.filter((_, i) => i !== index));

  const updateEquipRow = (index: number, field: keyof EquipmentItem, value: string | number) => {
    setEquipData(equipData.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addEquipRow = () =>
    setEquipData([...equipData, { productId: "", name: "", quantity: 1, unit: "Piece", price: "" }]);

  const removeEquipRow = (index: number) => setEquipData(equipData.filter((_, i) => i !== index));

  const savePerformance = () => {
    if (!pump) return;
    const updatedPump = {
      ...pump,
      performanceData: perfData
    };
    pumpProductsDB.update(pump.id, updatedPump)
      .then(() => {
        toast.success("Performance data updated in database");
        setEditPerformance(false);
        setPump(updatedPump);
      })
      .catch((err) => {
        toast.error("Failed to update performance data");
        console.error(err);
      });
  };

  const saveEquipment = () => {
    if (!pump) return;
    const updatedPump = {
      ...pump,
      equipment: equipData
    };
    pumpProductsDB.update(pump.id, updatedPump)
      .then(() => {
        toast.success("Equipment list updated in database");
        setEditEquipment(false);
        setPump(updatedPump);
      })
      .catch((err) => {
        toast.error("Failed to update equipment list");
        console.error(err);
      });
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

      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <button onClick={() => navigate("/pumps")} className="hover:text-foreground transition-colors">
          Solar Pumps
        </button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={() => navigate("/pumps")} className="hover:text-foreground transition-colors">
          {parentCategory?.name || "Category"}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{pump.model}</span>
      </div>

      <Button variant="ghost" onClick={() => navigate("/pumps")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Models
      </Button>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-2xl border shadow-sm">
            <div className="h-72 md:h-80 bg-white flex items-center justify-center p-6">
              {pump.image ? (
                <img
                  src={pump.image}
                  alt={pump.model}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="text-center space-y-2">
                  <Droplets className="h-16 w-16 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Pump Image</p>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="h-44 md:h-48 bg-white flex items-center justify-center p-4">
                {pump.controllerImage ? (
                  <img
                    src={pump.controllerImage}
                    alt={`${pump.model} controller`}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <Gauge className="h-8 w-8 text-info mx-auto" />
                    <p className="text-xs text-muted-foreground">Controller</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="h-44 md:h-48 bg-white flex items-center justify-center p-4">
                {pump.panelImage ? (
                  <img
                    src={pump.panelImage}
                    alt={`${pump.model} solar panel`}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <Sun className="h-8 w-8 text-success mx-auto" />
                    <p className="text-xs text-muted-foreground">Solar Panel</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold font-heading">{pump.model}</h1>
            <p className="text-muted-foreground mt-1">{pump.description}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Zap className="h-3 w-3 mr-1" /> {pump.power}
            </Badge>
            <Badge variant="outline">{pump.voltage}</Badge>
            <Badge variant="outline">
              <Droplets className="h-3 w-3 mr-1" /> Max {perfData[0]?.head}m
            </Badge>
          </div>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading">Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Power</p>
                  <p className="font-medium">{pump.power}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Voltage Range</p>
                  <p className="font-medium">{pump.voltage}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Max Head</p>
                  <p className="font-medium">{perfData[0]?.head}m</p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Max Flow</p>
                  <p className="font-medium">
                    {formatFlow(perfData[perfData.length - 1]?.flow || 0)} {flowLabel}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Equipment Cost</p>
                  <p className="text-2xl font-bold font-heading text-primary">
                    {totalEquipmentCost.toLocaleString()} ETB
                  </p>
                </div>
                <Button onClick={() => navigate(`/pos?model=${pump.id}`)}>
                  <ShoppingCart className="h-4 w-4 mr-1" /> Sell This Model
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-heading">Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "introduction" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("introduction")}
            >
              Introduction
            </Button>
            <Button
              variant={activeTab === "catalog" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("catalog")}
            >
              Brochure Page
            </Button>
            <Button
              variant={activeTab === "packaging" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("packaging")}
            >
              Product Packaging
            </Button>
            <Button
              variant={activeTab === "wiring" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("wiring")}
            >
              Wiring Instructions
            </Button>
          </div>

          {activeTab === "introduction" && (
            <div className="space-y-6">
              <div className="rounded-xl border bg-white p-4 md:p-6 space-y-6">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-6">
                    {pump.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{pump.brand || "REDBUD"}</Badge>
                    <Badge variant="outline">{pump.secondCategory || "Solar Pumps"}</Badge>
                    <Badge variant="outline">{pump.power}</Badge>
                    <Badge variant="outline">{pump.voltage}</Badge>
                    <Badge variant="outline">CE Certified</Badge>
                    <Badge variant="outline">Premium Quality</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold font-heading text-primary">
                    {pump.model} high-performance water pump
                  </h3>

                  <p className="font-medium">{pump.brand} Water Supply Solutions</p>
                  <p className="text-sm text-muted-foreground leading-7">
                    This model is classified under the {pump.secondCategory} series. It is specifically designed to meet demanding applications, offering high reliability, advanced hydraulic efficiency, and long-term durability. Suitable for residential supply, agricultural irrigation, or site drainage depending on configuration.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-primary">
                    {pump.model} Technical Parameters
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="p-3 font-medium">PARAMETER</th>
                          <th className="p-3 font-medium">VALUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pump.technicalData && pump.technicalData.length > 0 ? (
                          pump.technicalData.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="p-3 font-medium text-muted-foreground">{item.parameter}</td>
                              <td className="p-3 font-semibold">{item.value}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-b">
                            <td className="p-3 font-medium text-muted-foreground">Brand</td>
                            <td className="p-3 font-semibold">{pump.brand}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-primary">
                    {pump.hydraulicCurveTitle || "Hydraulic Performance Curve"}
                  </h3>

                  {pump.hydraulicCurveImage ? (
                    <div className="flex items-center justify-center rounded-xl border bg-white p-4">
                      <img
                        src={pump.hydraulicCurveImage}
                        alt={`${pump.model} hydraulic performance curve`}
                        className="max-w-full h-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8 rounded-xl border">
                      Hydraulic curve image not added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "catalog" && (() => {
            const info = getCatalogInfo(pump);
            return (
              <div className="space-y-6">
                <div className="rounded-xl border bg-white p-4 md:p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold font-heading text-primary">Official Catalog Brochure</h3>
                      <p className="text-xs text-muted-foreground">PDF Source: {info.pdfName} (Page {info.pageNum})</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPdfOpen(true)}>
                        <Eye className="mr-1 h-4 w-4" /> Interactive PDF View (Option B)
                      </Button>
                      <a href={info.pdfUrl} target="_blank" rel="noreferrer">
                        <Button variant="secondary" size="sm">
                          Open Original PDF
                        </Button>
                      </a>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden bg-white p-2 flex justify-center shadow-inner">
                    <img 
                      src={info.imagePath} 
                      alt={`${pump.model} Brochure page`} 
                      className="max-w-full h-auto max-h-[800px] object-contain transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === "packaging" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-4">
                <h3 className="text-base font-semibold text-primary mb-4">Product Packaging</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-white p-4 flex items-center justify-center min-h-[220px]">
                    {pump.image ? (
                      <img
                        src={pump.image}
                        alt={`${pump.model} packaging`}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Packaging image not added yet.</p>
                    )}
                  </div>

                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      Add your packaging content here without affecting the other sections.
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Carton / box image</li>
                      <li>• Package dimensions</li>
                      <li>• Gross weight</li>
                      <li>• Included accessories</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "wiring" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-4">
                <h3 className="text-base font-semibold text-primary mb-4">Wiring Instructions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-white p-4 flex items-center justify-center min-h-[220px]">
                    {pump.controllerImage ? (
                      <img
                        src={pump.controllerImage}
                        alt={`${pump.model} wiring`}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Wiring image not added yet.</p>
                    )}
                  </div>

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>Add your wiring instruction content here.</p>
                    <ul className="space-y-2">
                      <li>• Solar panel to controller</li>
                      <li>• Controller to pump</li>
                      <li>• Grounding / protection notes</li>
                      <li>• Voltage connection notes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base font-heading">Performance Data</CardTitle>

            <div className="flex flex-wrap gap-2 items-center">
              <Select value={flowUnit} onValueChange={(v) => setFlowUnit(v as FlowUnit)}>
                <SelectTrigger className="h-9 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m3h">Flow in m³/h</SelectItem>
                  <SelectItem value="m3s">Flow in m³/s</SelectItem>
                </SelectContent>
              </Select>

              {!editPerformance ? (
                <Button variant="outline" size="sm" onClick={() => requestSecurity(() => setEditPerformance(true))}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={savePerformance}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPerfData(pump.performanceData);
                      setEditPerformance(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            m³/s is calculated by dividing m³/h by 60
          </p>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Head (m)</th>
                  <th className="pb-2 font-medium text-right">
                    {editPerformance ? "Flow (m³/h base)" : `Flow (${flowLabel})`}
                  </th>
                  {editPerformance && <th className="pb-2 w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {perfData.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3">
                      {editPerformance ? (
                        <Input
                          type="number"
                          value={row.head === "" ? "" : row.head}
                          onChange={(e) => updatePerfRow(i, "head", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-28 h-8"
                        />
                      ) : (
                        <span className="font-medium">{row.head}</span>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      {editPerformance ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={row.flow === "" ? "" : row.flow}
                          onChange={(e) => updatePerfRow(i, "flow", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-28 h-8 ml-auto"
                        />
                      ) : (
                        formatFlow(row.flow)
                      )}
                    </td>

                    {editPerformance && (
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePerfRow(i)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {editPerformance && (
              <Button variant="outline" size="sm" className="mt-2" onClick={addPerfRow}>
                <Plus className="h-3 w-3 mr-1" /> Add Row
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Package className="h-4 w-4" /> Equipment Used for This Model
            </CardTitle>

            {!editEquipment ? (
              <Button variant="outline" size="sm" onClick={() => requestSecurity(() => setEditEquipment(true))}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEquipment}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEquipData(pump.equipment);
                    setEditEquipment(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium text-center">Quantity</th>
                  <th className="pb-2 font-medium text-center">Unit</th>
                  <th className="pb-2 font-medium text-right">Unit Price</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  {editEquipment && <th className="pb-2 w-12"></th>}
                </tr>
              </thead>

              <tbody>
                {equipData.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3">
                      {editEquipment ? (
                        <Select
                          value={item.productId || ""}
                          onValueChange={(prodId) => {
                            const selectedProd = products.find((p) => p.id === prodId);
                            if (selectedProd) {
                              updateEquipRow(i, "productId", prodId);
                              updateEquipRow(i, "name", selectedProd.name);
                              updateEquipRow(i, "unit", selectedProd.measurementUnit || selectedProd.unit || "Piece");
                              updateEquipRow(i, "price", selectedProd.sellPrice || 0);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.code || "No code"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </td>

                    <td className="py-3 text-center">
                      {editEquipment ? (
                        <Input
                          type="number"
                          value={item.quantity === "" ? "" : item.quantity}
                          onChange={(e) => updateEquipRow(i, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-20 h-8 mx-auto text-center"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>

                    <td className="py-3 text-center">
                      {editEquipment ? (
                        <Input
                          value={item.unit}
                          disabled
                          className="w-24 h-8 mx-auto text-center bg-muted"
                          placeholder="Unit"
                        />
                      ) : (
                        <span className="text-muted-foreground">{item.unit}</span>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      {editEquipment ? (
                        <Input
                          type="number"
                          value={item.price === "" ? "" : item.price}
                          onChange={(e) => updateEquipRow(i, "price", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-28 h-8 ml-auto"
                        />
                      ) : (
                        <>{item.price.toLocaleString()} ETB</>
                      )}
                    </td>

                    <td className="py-3 text-right font-medium">
                      {(item.price * item.quantity).toLocaleString()} ETB
                    </td>

                    {editEquipment && (
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEquipRow(i)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={4} className="py-3 font-bold text-right">
                    Total Equipment Cost
                  </td>
                  <td className="py-3 text-right font-bold text-primary">
                    {totalEquipmentCost.toLocaleString()} ETB
                  </td>
                  {editEquipment && <td></td>}
                </tr>
              </tfoot>
            </table>

            {editEquipment && (
              <Button variant="outline" size="sm" className="mt-2" onClick={addEquipRow}>
                <Plus className="h-3 w-3 mr-1" /> Add Equipment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold font-heading">
              {pump ? getCatalogInfo(pump).pdfName : ""} - Page {pump ? getCatalogInfo(pump).pageNum : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full rounded-lg overflow-hidden border bg-muted">
            {pump && (
              <iframe
                src={`${getCatalogInfo(pump).pdfUrl}#page=${getCatalogInfo(pump).pageNum}`}
                className="w-full h-full border-0"
                title="Interactive PDF Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}