import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Droplets, Receipt, Wrench, MessageSquare, ShieldCheck, Clock, MapPin,
  Phone, Mail, Calendar, Send, FileText, CheckCircle2, ArrowLeft, Printer, Camera, Sparkles, Download, ClipboardCheck, Truck, Eye
} from "lucide-react";
import { customersDB } from "@/lib/db-service";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { ExecutiveDocumentPdfTemplate } from "@/components/pdf/ExecutiveDocumentPdfTemplate";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CustomerDossierPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1").replace("/api/v1", "");
  const getFullImgUrl = (url: string) => {
    if (!url) return "";
    return url.startsWith("/uploads/") ? `${API_BASE}${url}` : url;
  };

  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [selectedSizingForModal, setSelectedSizingForModal] = useState<any | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");

  useEffect(() => {
    if (data?.sizingHistory?.length > 0 && !selectedAssessmentId) {
      const withDc = data.sizingHistory.find((s: any) => s.dataCollection);
      setSelectedAssessmentId(withDc?.id || data.sizingHistory[0]?.id || "");
    }
  }, [data, selectedAssessmentId]);

  const fetchCustomerData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await customersDB.get360(id);
      setData(res);
    } catch (e) {
      toast.error("Failed to load customer dossier file");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await customersDB.addNote(id, newNote);
      toast.success("Note added to customer master file");
      setNewNote("");
      fetchCustomerData();
    } catch (e) {
      toast.error("Failed to add customer note");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">Opening customer master dossier file...</p>
      </div>
    );
  }

  const customer = data?.customer || {};
  const sizings = data?.sizingHistory || [];
  const sales = data?.salesInvoices || [];
  const peachtree = data?.peachtreeRecords || [];
  const fieldWorks = data?.fieldWorkOperations || [];
  const notes = data?.notes || [];

  const completedFieldWork = fieldWorks.find((fw: any) => fw.status === "completed" || fw.completedDate || fw.status === "done");
  const installationDate = completedFieldWork?.completedDate ? new Date(completedFieldWork.completedDate) : new Date(customer.createdAt || Date.now());
  const warrantyDaysTotal = completedFieldWork?.warrantyDays || 365;
  const daysPassed = Math.floor((Date.now() - installationDate.getTime()) / (1000 * 60 * 60 * 24));
  const warrantyRemaining = Math.max(0, warrantyDaysTotal - daysPassed);
  const isWarrantyActive = warrantyRemaining > 0;
  const installedPump = completedFieldWork?.pumpModel || sizings[0]?.selectedPumpModel || sales[0]?.items?.[0]?.name || "Solar Pump System";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Bar Navigation & Print Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Button variant="ghost" onClick={() => navigate("/customers")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Customers Registry
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2 border-primary/20 hover:bg-primary/10">
            <Printer className="h-4 w-4 text-primary" /> Print / Export Master Dossier PDF
          </Button>
        </div>
      </div>

      {/* Main Print Container */}
      <div className="max-w-5xl mx-auto space-y-6 print:m-0 print:p-0 print:max-w-none">
        {/* Printable Executive PDF Template (Only visible when printing) */}
        <div className="hidden print:block">
          <ExecutiveDocumentPdfTemplate
            data={{
              documentTitle: "SolarFlow Master Client Information Sheet",
              subtitle: "Unified 360° Technical & Commercial Master Dossier",
              refNumber: customer.id || "CUST-1001",
              date: new Date(customer.createdAt || Date.now()).toLocaleDateString(),
              clientSection: {
                title: "CLIENT / TAXPAYER PROFILE",
                fields: [
                  { label: "Client Full Name", value: customer.name },
                  { label: "Phone Number", value: customer.phone },
                  { label: "Email Address", value: customer.email },
                  { label: "Site Address / City", value: customer.address || customer.city },
                  { label: "System Status", value: isWarrantyActive ? "Active System Warranty" : "Out of Warranty" },
                  { label: "Account ID", value: customer.id },
                ]
              },
              secondarySection: {
                title: "HYDRAULIC, WELL & BENEFICIARY PARAMETERS",
                fields: [
                  { label: "Installed Solar Pump", value: installedPump },
                  { label: "Daily Water Demand", value: sizings[0]?.dailyWaterNeed ? `${sizings[0].dailyWaterNeed} m³/day` : "50 m³/day" },
                  { label: "Total Dynamic Lift", value: sizings[0]?.headLift ? `${sizings[0].headLift} Meters` : "100 Meters" },
                  { label: "Solar Array Capacity", value: sizings[0]?.panelPower ? `${sizings[0].panelPower} Watts` : "1200 Watts" },
                  { label: "Total Well Depth", value: sizings[0]?.dataCollection?.waterSource?.wellDepth ? `${sizings[0].dataCollection.waterSource.wellDepth} Meters` : "—" },
                  { label: "Static Water Level", value: sizings[0]?.dataCollection?.waterSource?.staticWaterLevel ? `${sizings[0].dataCollection.waterSource.staticWaterLevel} Meters` : "—" },
                  { label: "Dynamic Water Level", value: sizings[0]?.dataCollection?.waterSource?.dynamicWaterLevel ? `${sizings[0].dataCollection.waterSource.dynamicWaterLevel} Meters` : "—" },
                  { label: "Total Beneficiaries", value: sizings[0]?.dataCollection?.generalSite?.beneficiaries?.total ? `${sizings[0].dataCollection.generalSite.beneficiaries.total} People (M: ${sizings[0].dataCollection.generalSite.beneficiaries.male || 0}, F: ${sizings[0].dataCollection.generalSite.beneficiaries.female || 0})` : "—" },
                  { label: "Irrigation Area & Crop", value: (sizings[0]?.dataCollection?.cropSoil?.totalIrrigableArea || sizings[0]?.dataCollection?.cropInformation?.totalIrrigableArea) ? `${sizings[0].dataCollection.cropSoil?.totalIrrigableArea || sizings[0].dataCollection.cropInformation?.totalIrrigableArea} ha (${sizings[0].dataCollection.cropSoil?.mainExistingCrops || sizings[0].dataCollection.cropInformation?.mainExistingCrops || "Crops"})` : "—" },
                  { label: "Warranty Remaining", value: `${warrantyRemaining} Days` },
                ]
              },
              tableData: {
                title: "FORMULATED SIZING PROPOSALS & OPERATIONAL HISTORY",
                headers: ["PROPOSAL / JOB ID", "EQUIPMENT / MODEL", "LOCATION", "STATUS", "TOTAL AMOUNT"],
                rows: [
                  ...sizings.map((sz: any) => [
                    sz.id,
                    sz.selectedPumpModel || "Custom Pump",
                    sz.location || customer.address || "Site",
                    "PROPOSED",
                    `${formatCurrency(sz.totalCost || sz.totalPrice || 0)} ETB`
                  ]),
                  ...fieldWorks.map((fw: any) => [
                    fw.id,
                    fw.pumpModel || installedPump,
                    fw.location || customer.address || "Site",
                    (fw.status || "COMPLETED").toUpperCase(),
                    "VERIFIED"
                  ])
                ]
              },
              completionPhotos: completedFieldWork?.payload?.completionPhotos || [],
              financials: {
                totalFee: sales.reduce((acc: number, s: any) => acc + (s.totalAmount || s.amount || 0), 0) || 250000,
                adjustments: 0,
                totalDue: sales.reduce((acc: number, s: any) => acc + (s.totalAmount || s.amount || 0), 0) || 250000,
                payment1: sales.reduce((acc: number, s: any) => acc + (s.totalAmount || s.amount || 0), 0) || 250000,
                payment2: 0,
                balanceDue: 0,
              }
            }}
          />
        </div>

        {/* Master Dossier File Banner Card (Web View) */}
        <Card className="overflow-hidden border-2 border-primary/20 shadow-md print:hidden">
          <div className="bg-slate-900 text-white p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] uppercase">
                    MASTER CUSTOMER DOSSIER FILE
                  </Badge>
                  <Badge variant="outline" className="text-slate-300 border-white/20 text-[10px] font-mono">
                    ID: {customer.id}
                  </Badge>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  {customer.name || "Customer Account"}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-amber-400" /> {customer.phone}
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-amber-400" /> {customer.address}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" /> Created: {new Date(customer.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Warranty Card Quick Status */}
              <div className="bg-white/10 backdrop-blur border border-white/10 p-3.5 rounded-xl space-y-1 min-w-[200px]">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> System Warranty
                  </span>
                  <Badge className={isWarrantyActive ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300"}>
                    {isWarrantyActive ? "ACTIVE" : "EXPIRED"}
                  </Badge>
                </div>
                <div className="text-xl font-bold text-white pt-0.5">
                  {isWarrantyActive ? `${warrantyRemaining} Days Left` : "Warranty Expired"}
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  Equipment: {installedPump}
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
              <div className="bg-white/5 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium">Solar Pump System</span>
                <span className="text-xs font-bold text-amber-300 truncate block">{installedPump}</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium">Sizing Proposals</span>
                <span className="text-xs font-bold text-white block">{sizings.length} Formulated</span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium">Total Invoiced</span>
                <span className="text-xs font-bold text-white block">
                  {formatCurrency(sales.reduce((acc: number, s: any) => acc + (s.totalAmount || s.amount || 0), 0))}
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium">Field Operations</span>
                <span className="text-xs font-bold text-white block">{fieldWorks.length} Jobs Assigned</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Master File Tabs Section */}
        <Tabs defaultValue="assessment" className="space-y-6">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full bg-muted/60 p-1 rounded-xl print:hidden">
            <TabsTrigger value="assessment" className="gap-1.5 text-xs font-semibold">
              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" /> Site Assessment
            </TabsTrigger>
            <TabsTrigger value="sizing" className="gap-1.5 text-xs font-semibold">
              <Droplets className="h-3.5 w-3.5 text-sky-500" /> Sizing History ({sizings.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1.5 text-xs font-semibold">
              <Receipt className="h-3.5 w-3.5 text-emerald-500" /> Invoices & Peachtree ({sales.length + peachtree.length})
            </TabsTrigger>
            <TabsTrigger value="fieldwork" className="gap-1.5 text-xs font-semibold">
              <Wrench className="h-3.5 w-3.5 text-amber-500" /> Operations ({fieldWorks.length})
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs font-semibold">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> File Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="warranty" className="gap-1.5 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Warranty Card
            </TabsTrigger>
          </TabsList>

          {/* TAB 0: SITE ASSESSMENT QUESTIONNAIRE */}
          <TabsContent value="assessment" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-2">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-500" /> Technical Site Assessment Questionnaire
              </h3>
              
              {/* Proposal selector if multiple exist */}
              {sizings.filter((s: any) => s.dataCollection).length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-semibold">Select Assessment Version:</span>
                  <select
                    value={selectedAssessmentId}
                    onChange={(e) => setSelectedAssessmentId(e.target.value)}
                    className="flex h-8 rounded border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none font-semibold text-slate-800"
                  >
                    {sizings.filter((s: any) => s.dataCollection).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        Proposal #{s.id} ({new Date(s.createdAt).toLocaleDateString()}) - {s.selectedPumpModel}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {(() => {
              const activeSizing = sizings.find((s: any) => s.id === selectedAssessmentId) || sizings.find((s: any) => s.dataCollection) || sizings[0];
              if (!activeSizing || !activeSizing.dataCollection) {
                return (
                  <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                    No technical site assessment questionnaire has been filled for this customer yet. Sizing proposals can be promoted to a full customer assessment on the Pump Sizing proposals tab.
                  </Card>
                );
              }

              const dc = activeSizing.dataCollection;
              return (
                <div className="space-y-4 pr-2 mt-2">
                  <Tabs defaultValue="site" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full text-xs bg-muted/70 p-1.5 rounded-xl border">
                      <TabsTrigger value="site" className="font-bold py-1.5">1. Site & Well</TabsTrigger>
                      <TabsTrigger value="solar" className="font-bold py-1.5">2. Solar & Layout</TabsTrigger>
                      <TabsTrigger value="socio" className="font-bold py-1.5">3. Soils & O&M</TabsTrigger>
                      <TabsTrigger value="finance" className="font-bold py-1.5">4. Feasibility</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="site" className="space-y-4 pt-4 text-xs">
                      {/* Section 1: General Site Profile */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 1: General Site Profile</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Assessment Date:</strong> {dc.generalSite?.assessmentDate || "—"}</div>
                          <div><strong>Region:</strong> {dc.generalSite?.region || "—"}</div>
                          <div><strong>Zone:</strong> {dc.generalSite?.zone || "—"}</div>
                          <div><strong>Woreda:</strong> {dc.generalSite?.woreda || "—"}</div>
                          <div><strong>Kebele:</strong> {dc.generalSite?.kebele || "—"}</div>
                          <div><strong>Village:</strong> {dc.generalSite?.village || "—"}</div>
                          <div><strong>Distance from Main Road:</strong> {dc.generalSite?.distanceFromMainRoad ? `${dc.generalSite.distanceFromMainRoad} km` : "—"}</div>
                          <div><strong>Road Accessibility:</strong> {dc.generalSite?.roadAccessibility || "—"}</div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-muted-foreground/10">
                          <div><strong>Male Beneficiaries:</strong> {dc.generalSite?.beneficiaries?.male || "—"}</div>
                          <div><strong>Female Beneficiaries:</strong> {dc.generalSite?.beneficiaries?.female || "—"}</div>
                          <div><strong>Youth Beneficiaries:</strong> {dc.generalSite?.beneficiaries?.youth || "—"}</div>
                          <div><strong>Total Beneficiaries:</strong> {dc.generalSite?.beneficiaries?.total || "—"}</div>
                        </div>
                      </div>

                      {/* Section 2: Water Source */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 2: Water Source</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Source Type:</strong> {dc.waterSource?.sourceType || "—"}</div>
                          <div><strong>Use Type:</strong> {dc.waterSource?.useType || "—"}</div>
                          <div><strong>Well Depth:</strong> {dc.waterSource?.wellDepth ? `${dc.waterSource.wellDepth} m` : "—"}</div>
                          <div><strong>Static Water Level:</strong> {dc.waterSource?.staticWaterLevel ? `${dc.waterSource.staticWaterLevel} m` : "—"}</div>
                          <div><strong>Dynamic Water Level:</strong> {dc.waterSource?.dynamicWaterLevel ? `${dc.waterSource.dynamicWaterLevel} m` : "—"}</div>
                          <div><strong>Drawdown:</strong> {dc.waterSource?.drawdown ? `${dc.waterSource.drawdown} m` : "—"}</div>
                          <div><strong>Recovery Time:</strong> {dc.waterSource?.recoveryTime ? `${dc.waterSource.recoveryTime} min` : "—"}</div>
                          <div><strong>Well Yield:</strong> {dc.waterSource?.wellYield ? `${dc.waterSource.wellYield} L/s` : "—"}</div>
                          <div><strong>Seasonal Availability:</strong> {dc.waterSource?.seasonalAvailability || "—"}</div>
                          <div><strong>Reliability:</strong> {dc.waterSource?.reliability || "—"}</div>
                        </div>
                      </div>

                      {/* Section 3: Water Quality */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 3: Water Quality</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Colour:</strong> {dc.waterQuality?.colour || "—"}</div>
                          <div><strong>Turbidity:</strong> {dc.waterQuality?.turbidity || "—"}</div>
                          <div><strong>Smell:</strong> {dc.waterQuality?.smell || "—"}</div>
                          <div><strong>Visible Sediment:</strong> {dc.waterQuality?.visibleSediment || "—"}</div>
                          <div><strong>Suitability:</strong> {dc.waterQuality?.suitability || "—"}</div>
                          <div><strong>Further Test Required:</strong> {dc.waterQuality?.furtherTest || "—"}</div>
                        </div>
                      </div>

                      {/* Section 4: Discharge Measurement */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 4: Discharge Test</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Measurement Method:</strong> {dc.dischargeMeasurement?.method || "—"}</div>
                          <div><strong>Container Volume:</strong> {dc.dischargeMeasurement?.containerVolume ? `${dc.dischargeMeasurement.containerVolume} L` : "—"}</div>
                          <div><strong>Filling Time:</strong> {dc.dischargeMeasurement?.fillingTime ? `${dc.dischargeMeasurement.fillingTime} s` : "—"}</div>
                          <div><strong>Flow Rate (L/s):</strong> {dc.dischargeMeasurement?.flowRateLps || "—"}</div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="solar" className="space-y-4 pt-4 text-xs">
                      {/* Section 5: Solar Resource */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 5: Solar Resource</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Solar Irradiation:</strong> {dc.solarResource?.irradiation ? `${dc.solarResource.irradiation} kWh/m²/day` : "—"}</div>
                          <div><strong>Solar Exposure:</strong> {dc.solarResource?.solarExposure || "—"}</div>
                          <div><strong>Shading Condition:</strong> {dc.solarResource?.shadingCondition || "—"}</div>
                          <div><strong>Available Land:</strong> {dc.solarResource?.availableLand ? `${dc.solarResource.availableLand} m²` : "—"}</div>
                          <div><strong>PV to Water Source:</strong> {dc.solarResource?.distancePvToWater ? `${dc.solarResource.distancePvToWater} m` : "—"}</div>
                          <div><strong>PV Flood Risk:</strong> {dc.solarResource?.floodRisk || "—"}</div>
                          <div><strong>Panel Suitability:</strong> {dc.solarResource?.panelSuitability || "—"}</div>
                        </div>
                      </div>

                      {/* Section 6: Irrigation Layout */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 6: Irrigation & Pipe Layout</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Source to Field:</strong> {dc.irrigationLayout?.distanceSourceToField ? `${dc.irrigationLayout.distanceSourceToField} m` : "—"}</div>
                          <div><strong>Elevation Diff:</strong> {dc.irrigationLayout?.elevationDifference ? `${dc.irrigationLayout.elevationDifference} m` : "—"}</div>
                          <div><strong>Proposed Method:</strong> {dc.irrigationLayout?.proposedMethod || "—"}</div>
                          <div><strong>Mainline Length:</strong> {dc.irrigationLayout?.mainlineLength ? `${dc.irrigationLayout.mainlineLength} m` : "—"}</div>
                          <div><strong>Lateral Length:</strong> {dc.irrigationLayout?.lateralLineLength ? `${dc.irrigationLayout.lateralLineLength} m` : "—"}</div>
                          <div><strong>Storage Tank Needed:</strong> {dc.irrigationLayout?.storageTankNeeded || "—"}</div>
                          <div><strong>Proposed Tank Cap:</strong> {dc.irrigationLayout?.proposedTankCapacity ? `${dc.irrigationLayout.proposedTankCapacity} L` : "—"}</div>
                        </div>
                      </div>

                      {/* Section 7: Solar Pump Requirement */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 7: Solar Pump Requirement</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Daily Water Demand:</strong> {dc.solarRequirement?.dailyWaterDemand ? `${dc.solarRequirement.dailyWaterDemand} m³` : "—"}</div>
                          <div><strong>Total Pumping Head:</strong> {dc.solarRequirement?.totalPumpingHead ? `${dc.solarRequirement.totalPumpingHead} m` : "—"}</div>
                          <div><strong>Proposed Pump:</strong> {dc.solarRequirement?.proposedPumpCapacity || "—"}</div>
                          <div><strong>Proposed PV Capacity:</strong> {dc.solarRequirement?.proposedPvCapacity ? `${dc.solarRequirement.proposedPvCapacity} Wp` : "—"}</div>
                          <div><strong>Pumping Hours / Day:</strong> {dc.solarRequirement?.pumpingHoursPerDay || "—"}</div>
                          <div><strong>Technical Feasibility:</strong> {dc.solarRequirement?.technicalFeasibility || "—"}</div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="socio" className="space-y-4 pt-4 text-xs">
                      {/* Section 8: Crop & Soil */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 8: Crop & Soil</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Total Irrigable Area:</strong> {dc.cropSoil?.totalIrrigableArea ? `${dc.cropSoil.totalIrrigableArea} ha` : "—"}</div>
                          <div><strong>Soil Type:</strong> {dc.cropSoil?.soilType || "—"}</div>
                          <div><strong>Soil Drainage:</strong> {dc.cropSoil?.soilDrainage || "—"}</div>
                          <div><strong>Field Slope:</strong> {dc.cropSoil?.fieldSlope || "—"}</div>
                          <div className="col-span-2"><strong>Main Existing Crops:</strong> {dc.cropSoil?.mainExistingCrops || "—"}</div>
                          <div className="col-span-2"><strong>Planned Irrigated Crops:</strong> {dc.cropSoil?.plannedIrrigatedCrops || "—"}</div>
                        </div>
                      </div>

                      {/* Section 10: Institutional Readiness */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 10: Institutional Readiness</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Willingness solar pump:</strong> {dc.institutionalReadiness?.willingnessSolarPump || "—"}</div>
                          <div><strong>Willingness cash contrib:</strong> {dc.institutionalReadiness?.willingnessCash || "—"}</div>
                          <div><strong>Willingness for Land:</strong> {dc.institutionalReadiness?.willingnessLand || "—"}</div>
                          <div><strong>Women Participation:</strong> {dc.institutionalReadiness?.womenParticipation || "—"}</div>
                          <div><strong>Conflict Risk:</strong> {dc.institutionalReadiness?.conflictRisk || "—"}</div>
                        </div>
                      </div>

                      {/* Section 11 O&M Readiness */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 11: O&M Readiness</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Technician Available:</strong> {dc.operationReadiness?.localTechnician || "—"}</div>
                          <div><strong>Spare Parts Access:</strong> {dc.operationReadiness?.sparePartsAccess || "—"}</div>
                          <div><strong>Security Guard/Fence:</strong> {dc.operationReadiness?.securityArrangement || "—"}</div>
                          <div><strong>O&M Tariff Contrib:</strong> {dc.operationReadiness?.contributionSystem || "—"}</div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="finance" className="space-y-4 pt-4 text-xs">
                      {/* Section 12: Financial & Market */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 12: Financial & Market</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Monthly Diesel Cost:</strong> {dc.financialMarket?.currentDieselCost ? `${dc.financialMarket.currentDieselCost} ETB` : "—"}</div>
                          <div><strong>Maint Cost:</strong> {dc.financialMarket?.currentMaintenanceCost ? `${dc.financialMarket.currentMaintenanceCost} ETB` : "—"}</div>
                          <div><strong>Farmer Pay Capacity:</strong> {dc.financialMarket?.farmerPaymentCapacity ? `${dc.financialMarket.farmerPaymentCapacity} ETB` : "—"}</div>
                          <div><strong>Market Access:</strong> {dc.financialMarket?.marketAccess || "—"}</div>
                          <div><strong>Distance to Market:</strong> {dc.financialMarket?.distanceToMarket ? `${dc.financialMarket.distanceToMarket} km` : "—"}</div>
                        </div>
                      </div>

                      {/* Section 9: Environmental Assessment */}
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 9: Environmental Assessment</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Flood Risk:</strong> {dc.environmentalAssessment?.floodRisk || "—"}</div>
                          <div><strong>Erosion Risk:</strong> {dc.environmentalAssessment?.erosionRisk || "—"}</div>
                          <div><strong>Groundwater Depletion Risk:</strong> {dc.environmentalAssessment?.groundwaterDepletionRisk || "—"}</div>
                          <div><strong>Salinity Risk:</strong> {dc.environmentalAssessment?.salinityRisk || "—"}</div>
                          <div className="col-span-2"><strong>Main Environmental Risk:</strong> {dc.environmentalAssessment?.mainRisk || "—"}</div>
                        </div>
                      </div>

                      {/* Feasibility Ratings & Statement */}
                      <div className="space-y-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/30">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Overall Site Assessment Feasibility & Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>PV Site Suitability: <strong>{dc.overallSummary?.solarRating || "—"}</strong></div>
                          <div>Water Source Reliability: <strong>{dc.overallSummary?.waterRating || "—"}</strong></div>
                          <div>Farmer/IWUA Readiness: <strong>{dc.overallSummary?.readinessRating || "—"}</strong></div>
                          <div>Overall site suitability rating: <strong className="text-emerald-600">{dc.overallSummary?.overallSuitability || "—"}</strong></div>
                        </div>
                        {dc.overallSummary?.fieldSummaryText && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded border mt-2">
                            <strong>Site Summary Statement:</strong>
                            <p className="italic mt-1 text-slate-600 dark:text-slate-400">"{dc.overallSummary.fieldSummaryText}"</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              );
            })()}
          </TabsContent>

          {/* TAB 1: PUMP SIZING HISTORY */}
          <TabsContent value="sizing" className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
              <Droplets className="h-4 w-4 text-sky-500" /> Solar Pump Sizing Technical Proposals
            </h3>

            {sizings.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                No pump sizing calculations filed for this customer yet.
              </Card>
            ) : (
              sizings.map((sz: any) => (
                <Card key={sz.id} className="p-5 space-y-4 border border-sky-500/20 bg-sky-500/5">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-sky-500/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                          {sz.selectedPumpModel || "Custom Solar Pump Proposal"}
                        </span>
                        <Badge className="bg-sky-600 text-white font-mono text-[10px]">
                          PROPOSAL #{sz.id}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Formulated on {new Date(sz.createdAt).toLocaleDateString()} for site: {sz.location || "Default Site"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block font-medium">Estimated Project Budget</span>
                      <span className="text-lg font-black text-sky-600 dark:text-sky-400">
                        {formatCurrency(sz.totalCost || sz.totalPrice || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Technical Calculation Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-background p-3 rounded-lg border text-xs space-y-0.5">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Daily Water Requirement</span>
                      <span className="font-bold text-sky-700 dark:text-sky-300 text-sm block">{sz.dailyWaterNeed || sz.waterRequirement || 0} m³/day</span>
                    </div>
                    <div className="bg-background p-3 rounded-lg border text-xs space-y-0.5">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Total Vertical Lift / Head</span>
                      <span className="font-bold text-sky-700 dark:text-sky-300 text-sm block">{sz.headLift || sz.verticalLift || 0} Meters</span>
                    </div>
                    <div className="bg-background p-3 rounded-lg border text-xs space-y-0.5">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Solar Array Power</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-sm block">{sz.panelPower || sz.solarWattage || 0} Watts</span>
                    </div>
                    <div className="bg-background p-3 rounded-lg border text-xs space-y-0.5">
                      <span className="text-muted-foreground font-medium block text-[10px] uppercase">Inverter / Controller Rating</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block">{sz.inverterRating || "Standard Controller"}</span>
                    </div>
                  </div>

                  {/* Registered Well Hydraulics, Beneficiaries & Agricultural Parameters */}
                  {sz.dataCollection && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-lg border border-border/50 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Well Depth</span>
                        <strong className="text-foreground font-mono">{sz.dataCollection?.waterSource?.wellDepth || "—"} m</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Static / Dynamic Level</span>
                        <strong className="text-foreground font-mono">
                          {sz.dataCollection?.waterSource?.staticWaterLevel || "—"}m / {sz.dataCollection?.waterSource?.dynamicWaterLevel || "—"}m
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Beneficiaries</span>
                        <strong className="text-foreground">
                          {sz.dataCollection?.generalSite?.beneficiaries?.total ? `${sz.dataCollection.generalSite.beneficiaries.total} People` : "—"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Crop & Land Area</span>
                        <strong className="text-foreground">
                          {(sz.dataCollection?.cropSoil?.totalIrrigableArea || sz.dataCollection?.cropInformation?.totalIrrigableArea) ? `${sz.dataCollection.cropSoil?.totalIrrigableArea || sz.dataCollection.cropInformation?.totalIrrigableArea} ha (${sz.dataCollection.cropSoil?.mainExistingCrops || sz.dataCollection.cropInformation?.mainExistingCrops || "Crops"})` : "—"}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Recommended Pump System Details */}
                  {sz.pumpDetails && (
                    <div className="p-3 bg-background border rounded-lg space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">System Specifications</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                        {typeof sz.pumpDetails === "string" ? sz.pumpDetails : JSON.stringify(sz.pumpDetails, null, 2)}
                      </p>
                    </div>
                  )}

                  {sz.dataCollection && (
                    <div className="flex justify-end pt-2 border-t mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSizingForModal(sz)}
                        className="gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                      >
                        <FileText className="h-4 w-4" /> View Technical Site Assessment
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          {/* TAB 2: INVOICES & PEACHTREE */}
          <TabsContent value="sales" className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
              <Receipt className="h-4 w-4 text-emerald-500" /> Sales Invoices & Peachtree Ledgers
            </h3>

            {sales.length === 0 && peachtree.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                No financial invoices or Peachtree records logged for this customer.
              </Card>
            ) : (
              <div className="space-y-3">
                {sales.map((s: any) => (
                  <Card key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3 border border-emerald-500/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">System Invoice #{s.id}</span>
                        <Badge className="bg-emerald-600 text-white font-mono text-[10px]">{s.status || "PAID"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Date: {new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-base text-emerald-600 block">{formatCurrency(s.totalAmount || s.amount || 0)}</span>
                    </div>
                  </Card>
                ))}

                {peachtree.map((p: any, idx: number) => (
                  <Card key={idx} className="p-4 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Peachtree Imported Ledger</span>
                        <Badge variant="outline" className="font-mono text-[10px]">PEACHTREE</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Invoice Reference: {p.invoiceNumber || p.id}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm block">{formatCurrency(p.amount || 0)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: OPERATIONS & FIELDWORK PHOTOS */}
          <TabsContent value="fieldwork" className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
              <Wrench className="h-4 w-4 text-amber-500" /> Field Operations & Site Completion Verification
            </h3>

            {fieldWorks.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                No fieldwork installation jobs logged for this customer.
              </Card>
            ) : (
              fieldWorks.map((fw: any) => (
                <Card key={fw.id} className="p-5 space-y-4 border border-amber-500/20">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                          {fw.pumpModel || "Solar Pump Installation Project"}
                        </span>
                        <Badge className="bg-amber-600 text-white font-mono text-[10px] uppercase">
                          {fw.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Location: {fw.location} | Scheduled: {fw.startDate} to {fw.endDate}
                      </p>
                    </div>
                    {fw.completedDate && (
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block font-medium">Completed On</span>
                        <span className="text-xs font-bold text-emerald-600">{new Date(fw.completedDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Site Completion Photos */}
                  {Array.isArray(fw.payload?.completionPhotos) && fw.payload.completionPhotos.length > 0 ? (
                    <div className="space-y-2 bg-muted/20 p-4 rounded-xl border">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <Camera className="h-4 w-4 text-amber-500" /> Verified Site Completion Photos (4 Required Items)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {fw.payload.completionPhotos.map((url: string, idx: number) => {
                          const photoTitles = [
                            "1. Inverter & Control Box",
                            "2. Solar Panel Array",
                            "3. Pump & Well Head",
                            "4. Overall Installed Site"
                          ];
                          return (
                            <div key={idx} className="p-2 border rounded-lg bg-background space-y-1">
                              <span className="text-[11px] font-bold text-primary block truncate">{photoTitles[idx] || `Photo #${idx + 1}`}</span>
                              <div className="h-28 bg-slate-900/10 rounded flex items-center justify-center border text-xs text-muted-foreground p-2 overflow-hidden">
                                {url.startsWith("http") || url.startsWith("data:") ? (
                                  <img src={url} alt={`Site photo ${idx + 1}`} className="h-full w-full object-cover rounded" />
                                ) : (
                                  <span className="font-mono text-[10px] text-center break-all">{url}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No completion photos attached to this job yet.</p>
                  )}

                  {/* Daily EOD Progress Reports & Daily Photos */}
                  {Array.isArray(fw.dailyReports) && fw.dailyReports.length > 0 && (
                    <div className="space-y-3 border-t pt-3 mt-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-purple-500" /> Daily EOD On-Site Progress Logs ({fw.dailyReports.length})
                      </span>
                      <div className="space-y-3">
                        {fw.dailyReports.map((rep: any) => (
                          <div key={rep.id} className="p-3 border rounded-lg bg-background text-xs space-y-2">
                            <div className="flex items-center justify-between border-b pb-1">
                              <span className="font-bold text-foreground">Submitted by TTL {rep.submittedBy}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {rep.date ? new Date(rep.date).toLocaleString() : ''}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <span className="font-semibold text-primary block text-[10px] uppercase">Achievements:</span>
                              <p className="whitespace-pre-wrap text-foreground">{rep.achievements || rep.content}</p>
                            </div>
                            {rep.challenges && (
                              <div className="bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                <span className="font-semibold text-amber-700 dark:text-amber-400 block text-[10px] uppercase">Challenges:</span>
                                <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">{rep.challenges}</p>
                              </div>
                            )}
                            {((Array.isArray(rep.photos) && rep.photos.length > 0) || rep.imageUrl) && (
                              <div className="pt-1">
                                <span className="font-semibold text-muted-foreground block text-[10px] uppercase mb-1">Attached Daily Photos:</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {(rep.photos && rep.photos.length > 0 ? rep.photos : [rep.imageUrl]).map((imgUrl: string, idx: number) => {
                                    const fullUrl = getFullImgUrl(imgUrl);
                                    return (
                                      <Dialog key={idx}>
                                        <DialogTrigger asChild>
                                          <button type="button" className="h-20 w-full bg-slate-900/10 rounded overflow-hidden border flex items-center justify-center font-mono text-[9px] relative group cursor-pointer hover:shadow-md transition-shadow">
                                            {imgUrl && (imgUrl.startsWith("http") || imgUrl.startsWith("/")) ? (
                                              <img src={fullUrl} alt={`Daily ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                              }} />
                                            ) : null}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <Eye className="h-5 w-5 text-white" />
                                            </div>
                                            <span className="p-1 break-all truncate block absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] opacity-0 group-hover:opacity-100 transition-opacity text-left">{imgUrl.split('/').pop() || imgUrl}</span>
                                          </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center h-[90vh]">
                                          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
                                          <img src={fullUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                                          <a href={fullUrl} download={`CustomerFile-Photo-${idx+1}.jpg`} target="_blank" rel="noreferrer" className="mt-4">
                                            <Button variant="secondary" className="gap-2 shadow-lg hover:scale-105 transition-transform"><Download className="h-4 w-4" /> Download Photo</Button>
                                          </a>
                                        </DialogContent>
                                      </Dialog>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          {/* TAB 4: FILE NOTES */}
          <TabsContent value="notes" className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
              <MessageSquare className="h-4 w-4 text-indigo-500" /> Master File Operational Notes
            </h3>

            <Card className="p-4 space-y-3 border-indigo-500/20 bg-indigo-500/5 print:hidden">
              <Label className="text-xs font-semibold">Add Internal Note to Master File</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type operational notes, customer preference, or maintenance records..."
                className="bg-background text-xs"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleAddNote} disabled={submittingNote || !newNote.trim()} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Save Note to File
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              {notes.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                  No notes saved to this customer master file yet.
                </Card>
              ) : (
                notes.map((n: any) => (
                  <Card key={n.id} className="p-4 space-y-2 border">
                    <div className="flex items-center justify-between text-xs border-b pb-1">
                      <span className="font-bold text-indigo-600">{n.user?.displayName || n.user?.username || "System Officer"}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{n.note}</p>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 5: WARRANTY CARD */}
          <TabsContent value="warranty" className="space-y-4">
            <Card className="p-6 space-y-5 border-2 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
                <div className="space-y-1">
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase">
                    OFFICIAL SYSTEM WARRANTY CERTIFICATE
                  </Badge>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    SolarFlow Manufacturer & Installation Guarantee
                  </h3>
                </div>
                <Badge className={isWarrantyActive ? "bg-emerald-600 text-white text-xs px-3 py-1" : "bg-red-600 text-white text-xs px-3 py-1"}>
                  {isWarrantyActive ? "ACTIVE COVERAGE" : "COVERAGE EXPIRED"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-background border rounded-xl space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Installed Equipment</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">{installedPump}</span>
                </div>
                <div className="p-4 bg-background border rounded-xl space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Installation Date</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">{installationDate.toLocaleDateString()}</span>
                </div>
                <div className="p-4 bg-background border rounded-xl space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Remaining Coverage</span>
                  <span className="font-bold text-sm text-emerald-600 block">{warrantyRemaining} Days ({warrantyDaysTotal} Total Days)</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2 border-t border-emerald-500/20 pt-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Warranty Terms & Inspection Policy</h4>
                <p>
                  This official warranty covers mechanical pump defaults, controller electronic failures, and solar module output degradation under normal operating conditions. Regular technical checkups by certified SolarFlow technicians are included.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sizing Data Sheet Modal inside Customer Dossier */}
      <Dialog open={!!selectedSizingForModal} onOpenChange={(open) => !open && setSelectedSizingForModal(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Technical Site Assessment: {selectedSizingForModal?.clientName || data?.customer?.name}</DialogTitle>
            <DialogDescription>
              Comprehensive Solar Irrigation Sheet data mapped for Proposal #{selectedSizingForModal?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSizingForModal?.dataCollection ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 mt-2">
              <Tabs defaultValue="site" className="w-full">
                <TabsList className="grid grid-cols-4 w-full text-xs bg-muted p-1 rounded-lg">
                  <TabsTrigger value="site">Site & Well</TabsTrigger>
                  <TabsTrigger value="solar">Solar & Layout</TabsTrigger>
                  <TabsTrigger value="socio">Soils & O&M</TabsTrigger>
                  <TabsTrigger value="finance">Feasibility</TabsTrigger>
                </TabsList>
                
                <TabsContent value="site" className="space-y-3 pt-2 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                    <div><strong>Date:</strong> {selectedSizingForModal.dataCollection.generalSite?.assessmentDate}</div>
                    <div><strong>Region/Kebele:</strong> {selectedSizingForModal.dataCollection.generalSite?.region} / {selectedSizingForModal.dataCollection.generalSite?.kebele}</div>
                    <div><strong>Contact:</strong> {selectedSizingForModal.dataCollection.generalSite?.contactPerson} ({selectedSizingForModal.dataCollection.generalSite?.phone})</div>
                    <div><strong>Beneficiaries:</strong> {selectedSizingForModal.dataCollection.generalSite?.beneficiaries?.total || 'N/A'} (M: {selectedSizingForModal.dataCollection.generalSite?.beneficiaries?.male}, F: {selectedSizingForModal.dataCollection.generalSite?.beneficiaries?.female})</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                    <div><strong>Well Depth:</strong> {selectedSizingForModal.dataCollection.waterSource?.wellDepth} m</div>
                    <div><strong>Static Level:</strong> {selectedSizingForModal.dataCollection.waterSource?.staticWaterLevel} m</div>
                    <div><strong>Dynamic Level:</strong> {selectedSizingForModal.dataCollection.waterSource?.dynamicWaterLevel} m</div>
                    <div><strong>Discharge Yield:</strong> {selectedSizingForModal.dataCollection.waterSource?.wellYield} L/s</div>
                    <div><strong>Source Reliability:</strong> {selectedSizingForModal.dataCollection.waterSource?.reliability}</div>
                    <div><strong>Water Color/Smell:</strong> {selectedSizingForModal.dataCollection.waterQuality?.colour} / {selectedSizingForModal.dataCollection.waterQuality?.smell}</div>
                  </div>
                </TabsContent>

                <TabsContent value="solar" className="space-y-3 pt-2 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                    <div><strong>Solar Exposure:</strong> {selectedSizingForModal.dataCollection.solarResource?.solarExposure}</div>
                    <div><strong>Shading Condition:</strong> {selectedSizingForModal.dataCollection.solarResource?.shadingCondition}</div>
                    <div><strong>Land for PV:</strong> {selectedSizingForModal.dataCollection.solarResource?.availableLand} m²</div>
                    <div><strong>PV Land Holding:</strong> {selectedSizingForModal.dataCollection.solarResource?.landHolding}</div>
                    <div><strong>PV to Source Dist:</strong> {selectedSizingForModal.dataCollection.solarResource?.distancePvToWater} m</div>
                    <div><strong>PV Flood Risk:</strong> {selectedSizingForModal.dataCollection.solarResource?.floodRisk}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                    <div><strong>Source to Field Dist:</strong> {selectedSizingForModal.dataCollection.irrigationLayout?.distanceSourceToField} m</div>
                    <div><strong>Elevation Diff:</strong> {selectedSizingForModal.dataCollection.irrigationLayout?.elevationDifference} m</div>
                    <div><strong>Proposed Method:</strong> {selectedSizingForModal.dataCollection.irrigationLayout?.proposedMethod}</div>
                    <div><strong>Storage Tank:</strong> {selectedSizingForModal.dataCollection.irrigationLayout?.storageTankNeeded}</div>
                    <div><strong>Proposed Tank Cap:</strong> {selectedSizingForModal.dataCollection.irrigationLayout?.proposedTankCapacity} L</div>
                  </div>
                </TabsContent>

                <TabsContent value="socio" className="space-y-3 pt-2 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                    <div><strong>Command Area:</strong> {selectedSizingForModal.dataCollection.cropSoil?.totalIrrigableArea} ha</div>
                    <div><strong>Soil Type:</strong> {selectedSizingForModal.dataCollection.cropSoil?.soilType}</div>
                    <div><strong>Soil Drainage:</strong> {selectedSizingForModal.dataCollection.cropSoil?.soilDrainage}</div>
                    <div><strong>Main Crops:</strong> {selectedSizingForModal.dataCollection.cropSoil?.mainExistingCrops}</div>
                    <div><strong>Willingness solar pump:</strong> {selectedSizingForModal.dataCollection.institutionalReadiness?.willingnessSolarPump}</div>
                    <div><strong>Willingness cash contrib:</strong> {selectedSizingForModal.dataCollection.institutionalReadiness?.willingnessCash}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                    <div><strong>Technician Available:</strong> {selectedSizingForModal.dataCollection.operationReadiness?.localTechnician}</div>
                    <div><strong>Spare Parts Access:</strong> {selectedSizingForModal.dataCollection.operationReadiness?.sparePartsAccess}</div>
                    <div><strong>Security Guard/Fence:</strong> {selectedSizingForModal.dataCollection.operationReadiness?.securityArrangement}</div>
                    <div><strong>O&M Tariff Contrib:</strong> {selectedSizingForModal.dataCollection.operationReadiness?.contributionSystem}</div>
                  </div>
                </TabsContent>

                <TabsContent value="finance" className="space-y-3 pt-2 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                    <div><strong>Monthly Diesel Cost:</strong> {selectedSizingForModal.dataCollection.financialMarket?.currentDieselCost} ETB</div>
                    <div><strong>Maint Cost:</strong> {selectedSizingForModal.dataCollection.financialMarket?.currentMaintenanceCost} ETB</div>
                    <div><strong>Farmer Pay Capacity:</strong> {selectedSizingForModal.dataCollection.financialMarket?.farmerPaymentCapacity} ETB</div>
                    <div><strong>Market Access:</strong> {selectedSizingForModal.dataCollection.financialMarket?.marketAccess}</div>
                    <div><strong>Distance to Market:</strong> {selectedSizingForModal.dataCollection.financialMarket?.distanceToMarket} km</div>
                  </div>
                  <div className="bg-primary/5 p-3 rounded border space-y-1">
                    <span className="font-semibold text-primary">Feasibility Rating Scores:</span>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div>PV Site Suitability: <strong>{selectedSizingForModal.dataCollection.overallSummary?.solarRating}</strong></div>
                      <div>Water Source Reliability: <strong>{selectedSizingForModal.dataCollection.overallSummary?.waterRating}</strong></div>
                      <div>Farmer/IWUA Readiness: <strong>{selectedSizingForModal.dataCollection.overallSummary?.readinessRating}</strong></div>
                      <div>Overall site suitability rating: <strong className="text-primary">{selectedSizingForModal.dataCollection.overallSummary?.overallSuitability}</strong></div>
                    </div>
                  </div>
                  {selectedSizingForModal.dataCollection.overallSummary?.fieldSummaryText && (
                    <div className="bg-slate-50 p-2.5 rounded border">
                      <strong>Site Summary Statement:</strong>
                      <p className="italic mt-1">"{selectedSizingForModal.dataCollection.overallSummary.fieldSummaryText}"</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSizingForModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
