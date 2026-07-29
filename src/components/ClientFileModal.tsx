import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  MapPin,
  Phone,
  Droplets,
  Sun,
  Wrench,
  CreditCard,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Printer,
} from "lucide-react";

interface ClientFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: any | null;
}

export function ClientFileModal({ open, onOpenChange, proposal }: ClientFileModalProps) {
  if (!proposal) return null;

  const data = proposal.dataCollection || {};
  const site = data.generalSite || {};
  const solar = data.solarResource || {};
  const water = data.waterSource || {};
  const discharge = data.dischargeMeasurement || {};
  const layout = data.irrigationLayout || {};
  const crop = data.cropSoil || {};
  const req = data.solarRequirement || {};
  const equipment = proposal.calculatedEquipment || [];

  const formatMoney = (val: number | string | undefined | null) => {
    if (!val) return "—";
    const num = Number(val);
    return isNaN(num) ? "—" : `${num.toLocaleString()} ETB`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
                  CLIENT DOSSIER #{proposal.id?.substring(0, 8)}
                </Badge>
                <Badge
                  className={
                    proposal.status === "APPROVED_TM"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : proposal.status === "PAID"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : proposal.status === "FIELDWORK_CREATED"
                      ? "bg-teal-100 text-teal-800 border-teal-200"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {proposal.status === "APPROVED_TM"
                    ? "TM Approved (Awaiting Payment)"
                    : proposal.status === "PAID"
                    ? "Paid (Awaiting Crew)"
                    : proposal.status === "FIELDWORK_CREATED"
                    ? "Fieldwork Active"
                    : proposal.status || "Pending"}
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-black font-heading mt-2 text-foreground flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                {proposal.clientName || site.contactPerson || "Client Dossier"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {proposal.address || `${site.region || ""}, ${site.woreda || ""}, ${site.kebele || ""}`}
                </span>
                {site.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {site.phone}
                  </span>
                )}
              </DialogDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1 text-xs">
              <Printer className="h-3.5 w-3.5" /> Print Dossier
            </Button>
          </div>
        </DialogHeader>

        {/* Client Master Details Summary Grid */}
        <div className="grid grid-cols-4 gap-3 bg-muted/20 p-4 rounded-xl border border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Selected Pump</span>
            <strong className="text-primary font-bold">{proposal.selectedPumpModel || req.proposedPumpCapacity || "—"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Daily Water Need</span>
            <strong className="font-mono font-bold">{proposal.dailyWaterNeed || req.dailyWaterDemand || "—"} m³/day</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Dynamic Lift</span>
            <strong className="font-mono font-bold">{proposal.verticalLift || req.totalPumpingHead || "—"} meters</strong>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Package Price</span>
            <strong className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatMoney(proposal.totalPrice)}
            </strong>
          </div>
        </div>

        {/* Tabs for Detailed Technical Form & Package Breakdown */}
        <Tabs defaultValue="site" className="w-full mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="site" className="text-xs gap-1">
              <MapPin className="h-3.5 w-3.5" /> Site & Customer
            </TabsTrigger>
            <TabsTrigger value="water" className="text-xs gap-1">
              <Droplets className="h-3.5 w-3.5" /> Water & Solar Form
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-xs gap-1">
              <Layers className="h-3.5 w-3.5" /> Equipment BOM
            </TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs gap-1">
              <FileText className="h-3.5 w-3.5" /> Sign-off Logs
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Site & Customer Overview */}
          <TabsContent value="site" className="space-y-4 pt-3 text-xs">
            <Card>
              <CardHeader className="py-3 bg-muted/10 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> General Site & Contact Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Client / Farm Name</span>
                  <strong className="text-foreground">{proposal.clientName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Contact Person</span>
                  <strong className="text-foreground">{site.contactPerson || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Phone Number</span>
                  <strong className="text-foreground font-mono">{site.phone || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Region / Zone</span>
                  <strong className="text-foreground">{site.region || "—"} / {site.zone || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Woreda / Kebele</span>
                  <strong className="text-foreground">{site.woreda || "—"} / {site.kebele || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Village</span>
                  <strong className="text-foreground">{site.village || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">GPS Coordinates</span>
                  <strong className="font-mono text-primary">
                    {proposal.latitude && proposal.longitude
                      ? `${Number(proposal.latitude).toFixed(4)}, ${Number(proposal.longitude).toFixed(4)}`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Road Accessibility</span>
                  <strong className="text-foreground">{site.roadAccessibility || "Good"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Distance from Main Road</span>
                  <strong className="text-foreground">{site.distanceFromMainRoad || "—"} km</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 bg-muted/10 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" /> Soil, Crop & Land Characteristics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Total Irrigable Area</span>
                  <strong className="text-foreground">{crop.totalIrrigableArea || "—"} ha</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Soil Type</span>
                  <strong className="text-foreground">{crop.soilType || "Loam"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Main Existing Crops</span>
                  <strong className="text-foreground">{crop.mainExistingCrops || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Irrigation Method</span>
                  <strong className="text-foreground">{layout.proposedMethod || "Drip"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Distance to Field</span>
                  <strong className="text-foreground">{layout.distanceSourceToField || "—"} m</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Storage Tank Needed</span>
                  <strong className="text-foreground">{layout.storageTankNeeded || "No"}</strong>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Water Source & Solar Resources */}
          <TabsContent value="water" className="space-y-4 pt-3 text-xs">
            <Card>
              <CardHeader className="py-3 bg-muted/10 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" /> Water Source & Well Hydraulics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Water Source Type</span>
                  <strong className="text-foreground">{water.sourceType || proposal.waterSource || "Borehole"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Total Well Depth</span>
                  <strong className="font-mono text-foreground">{water.wellDepth || "—"} m</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Static Water Level</span>
                  <strong className="font-mono text-foreground">{water.staticWaterLevel || "—"} m</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Dynamic Water Level</span>
                  <strong className="font-mono text-foreground">{water.dynamicWaterLevel || "—"} m</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Drawdown</span>
                  <strong className="font-mono text-foreground">{water.drawdown || "—"} m</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Well Yield / Flow</span>
                  <strong className="font-mono text-foreground">{water.wellYield || "—"} L/s</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Discharge Test Method</span>
                  <strong className="text-foreground">{discharge.method || "Barrel method"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Measured Flow Rate</span>
                  <strong className="font-mono text-foreground">{discharge.flowRateM3h || "—"} m³/h</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Seasonal Availability</span>
                  <strong className="text-foreground">{water.seasonalAvailability || "Year-round"}</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 bg-muted/10 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" /> Solar Resource & PV Area
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Solar Irradiation</span>
                  <strong className="font-mono text-foreground">{solar.irradiation || "5.8"} kWh/m²/day</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Solar Exposure</span>
                  <strong className="text-foreground">{solar.solarExposure || "Good"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Shading Condition</span>
                  <strong className="text-foreground">{solar.shadingCondition || "No shading"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Available Land for PV</span>
                  <strong className="font-mono text-foreground">{solar.availableLand || "—"} m²</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Land Holding / Rights</span>
                  <strong className="text-foreground">{solar.landHolding || "Beneficiary farmer"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase">Flood Risk</span>
                  <strong className="text-foreground">{solar.floodRisk || "Low"}</strong>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Calculated Equipment Package & BOM */}
          <TabsContent value="equipment" className="space-y-4 pt-3 text-xs">
            <Card>
              <CardHeader className="py-3 bg-muted/10 border-b flex justify-between items-center">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Itemized Solar Pump Equipment Package
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs bg-primary/5 text-primary border-primary/20">
                  Total: {formatMoney(proposal.totalPrice)}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.length > 0 ? (
                      equipment.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-bold">{item.name || item.productName}</TableCell>
                          <TableCell className="text-muted-foreground text-[10px] uppercase font-semibold">
                            {item.category || "Consumable"}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">{item.quantity || item.qty || 1}</TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(item.unitPrice || item.price)}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            {formatMoney(item.total || item.totalPrice || (item.quantity * item.unitPrice))}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          No itemized BOM items available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Workflow & Approval History */}
          <TabsContent value="workflow" className="space-y-4 pt-3 text-xs">
            <Card>
              <CardHeader className="py-3 bg-muted/10 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Approval & Clearance Audit Log
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <User className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <strong className="text-foreground">Prepared & Calculated By</strong>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{proposal.preparedByName || "Sales Engineer / Manager"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Wrench className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <strong className="text-foreground">Technical Manager Verification</strong>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {proposal.checkedAt ? new Date(proposal.checkedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {proposal.checkedByName ? `Verified & Signed off by ${proposal.checkedByName}` : "Awaiting Technical Manager verification"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <CreditCard className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <strong className="text-foreground">Finance Payment Status</strong>
                      <Badge variant="outline" className={proposal.status === "PAID" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                        {proposal.status === "PAID" ? "PAID" : "Awaiting Payment"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {proposal.status === "PAID" ? "Client payment registered in Finance Center" : "Payment registration pending in Finance Center"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
