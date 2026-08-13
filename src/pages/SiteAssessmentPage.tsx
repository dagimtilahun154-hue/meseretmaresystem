import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Save, Send, MapPin, Droplets, Info, ClipboardCheck, CheckCircle2 } from "lucide-react";

const DEFAULT_DATA = {
  generalSite: {
    assessmentDate: new Date().toISOString().split('T')[0],
    region: "", zone: "", woreda: "", kebele: "", village: "",
    contactPerson: "", phone: "",
    beneficiaries: { male: "", female: "", youth: "", total: "" },
    existingGroup: "No", distanceFromMainRoad: "", roadAccessibility: "Good"
  },
  solarResource: {
    irradiation: "", solarExposure: "Good", shadingCondition: "No shading",
    sourceOfShading: [], availableLand: "", landHolding: "Beneficiary farmer",
    distancePvToWater: "", pvDistanceEnough: "Yes", securityRequired: "No",
    floodRisk: "Low", panelSuitability: "Suitable"
  },
  waterSource: {
    sourceType: "Borehole", useType: "Irrigation only", wellDepth: "",
    staticWaterLevel: "", dynamicWaterLevel: "", drawdown: "", recoveryTime: "",
    wellYield: "", seasonalAvailability: "Year-round", existingPumpType: "none",
    existingPumpCapacity: "", currentPumpingHours: "", currentIrrigationFrequency: "Daily",
    reliability: "High"
  },
  dischargeMeasurement: {
    method: "barrel method", containerVolume: "", fillingTime: "",
    flowRateLps: "", flowRateM3h: "", testRepeated: "1 time",
    averageFlowRate: "", observationContinuous: "Stable"
  },
  waterQuality: {
    colour: "Clear", turbidity: "Clear", smell: "No smell", visibleSediment: "None",
    oilSign: "No", saltCrustSign: "No salt crust", cropResponse: "Healthy",
    suitability: "Suitable", furtherTest: "not required"
  },
  cropSoil: {
    totalIrrigableArea: "", avgLandholding: "", soilType: "Loam",
    soilDrainage: "Good", waterloggingRisk: "Low", fieldSlope: "Flat",
    levellingRequired: "No", mainExistingCrops: "", plannedIrrigatedCrops: "",
    cropType: "Vegetable", highValuePotential: "High", existingExperience: "High"
  },
  irrigationLayout: {
    distanceSourceToField: "", elevationDifference: "", proposedMethod: "Drip",
    existingMethod: "Flood", pipeRouteAvailable: "Yes", mainlineLength: "",
    lateralLineLength: "", storageTankNeeded: "No", existingTankCapacity: "",
    proposedTankCapacity: "", drainageCanalNeeded: "No", futureExpansion: "Yes"
  },
  solarRequirement: {
    dailyWaterDemand: "", requiredFlowRate: "", totalPumpingHead: "",
    proposedPumpType: "submersible pump", proposedPumpCapacity: "",
    proposedPvCapacity: "", controllerRequired: "Yes", batteryRequired: "No",
    pumpingHoursPerDay: "", systemUse: "Individual", technicalFeasibility: "High"
  },
  institutionalReadiness: {
    existingCluster: "Yes", existingIwua: "Yes", willingnessFormIwua: "High",
    willingnessSolarPump: "High", willingnessLand: "Yes", willingnessLabor: "Yes",
    willingnessCash: "Yes", womenParticipation: "High", youthParticipation: "High",
    localGovtSupport: "High", conflictRisk: "Low", needBylaws: "Yes"
  },
  operationReadiness: {
    localTechnician: "Yes", sparePartsAccess: "Easy", securityArrangement: "fence",
    panelCleaning: "Yes", pumpOperatorIdentified: "Yes", committeeNeeded: "Yes",
    contributionSystem: "Monthly", trainingNeeded: [], warrantySupport: "Yes"
  },
  financialMarket: {
    currentDieselCost: "", currentMaintenanceCost: "", farmerPaymentCapacity: "",
    loanInterest: "No", grantSupportNeeded: "No", marketAccess: "Good",
    distanceToMarket: "", sellingChallenge: "Price fluctuation", incomePotential: "High"
  },
  environmentalAssessment: {
    floodRisk: "Low", erosionRisk: "Low", groundwaterDepletionRisk: "Low",
    waterloggingRisk: "Low", salinityRisk: "Low", bufferZoneIssue: "No",
    batteryDisposalConcern: "not applicable", mainRisk: "", mitigationRequired: ""
  },
  overallSummary: {
    solarRating: "High", waterRating: "High", yieldRating: "High",
    soilRating: "High", cropRating: "High", readinessRating: "High",
    installationRating: "High", omRating: "High", envRating: "Low",
    overallSuitability: "Highly suitable", fieldSummaryText: ""
  }
};

export default function SiteAssessmentPage() {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState<any>(null);

  // Lead info (editable)
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");

  // Questionnaire data
  const [dc, setDc] = useState<any>(JSON.parse(JSON.stringify(DEFAULT_DATA)));

  useEffect(() => {
    if (!proposalId) return;
    apiClient.get(`/sizing-requests/${proposalId}`)
      .then(res => {
        const p = res.data;
        setProposal(p);

        // Auto-populate lead info
        setClientName(p.clientName || "");
        setClientAddress(p.address || "");

        // Merge saved dataCollection if it exists
        const saved = p.dataCollection || {};
        const merged = JSON.parse(JSON.stringify(DEFAULT_DATA));

        // Deep merge saved data over defaults
        for (const section of Object.keys(saved)) {
          if (merged[section] && typeof saved[section] === "object") {
            merged[section] = { ...merged[section], ...saved[section] };
          }
        }

        // Auto-fill from sizing specs
        merged.waterSource.sourceType = p.waterSource || merged.waterSource.sourceType;
        merged.waterSource.wellDepth = p.verticalLift ? String(p.verticalLift) : merged.waterSource.wellDepth;
        merged.waterSource.staticWaterLevel = p.verticalLift ? String(p.verticalLift) : merged.waterSource.staticWaterLevel;
        merged.irrigationLayout.mainlineLength = p.pipeLength ? String(p.pipeLength) : merged.irrigationLayout.mainlineLength;
        merged.irrigationLayout.elevationDifference = p.verticalLift ? String(p.verticalLift) : merged.irrigationLayout.elevationDifference;
        merged.irrigationLayout.distanceSourceToField = p.pipeLength ? String(p.pipeLength) : merged.irrigationLayout.distanceSourceToField;
        merged.solarRequirement.dailyWaterDemand = p.dailyWaterNeed ? String(p.dailyWaterNeed) : merged.solarRequirement.dailyWaterDemand;
        merged.solarRequirement.proposedPumpCapacity = p.selectedPumpModel || merged.solarRequirement.proposedPumpCapacity;

        setContactPerson(merged.generalSite.contactPerson || p.clientName || "");
        setPhone(merged.generalSite.phone || "");

        setDc(merged);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load proposal data.");
        navigate("/fieldwork/sizing");
      })
      .finally(() => setLoading(false));
  }, [proposalId, navigate]);

  const handleSaveProgress = async () => {
    setSaving(true);
    try {
      // Update generalSite with current lead fields
      const updatedDc = {
        ...dc,
        generalSite: { ...dc.generalSite, contactPerson, phone },
      };
      await apiClient.put(`/sizing-requests/${proposalId}`, {
        clientName,
        address: clientAddress,
        dataCollection: updatedDc,
      });
      toast.success("Assessment progress saved!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save progress.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForTm = async () => {
    if (!clientName.trim()) {
      toast.error("Client name is required.");
      return;
    }
    setSubmitting(true);
    try {
      // Save the full data first
      const updatedDc = {
        ...dc,
        generalSite: { ...dc.generalSite, contactPerson, phone },
      };
      await apiClient.put(`/sizing-requests/${proposalId}`, {
        clientName,
        address: clientAddress,
        dataCollection: updatedDc,
      });
      // Then submit for TM
      await apiClient.patch(`/sizing-requests/${proposalId}/submit-to-tm`);
      toast.success("Assessment submitted for Technical Manager approval! Customer record created.");
      navigate("/fieldwork/sizing");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to submit for approval.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading proposal data...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <p className="text-sm text-muted-foreground">Proposal not found.</p>
        <Button variant="outline" onClick={() => navigate("/fieldwork/sizing")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sizing
        </Button>
      </div>
    );
  }

  // Helper for select fields
  const sel = (value: string, onChange: (v: string) => void, options: string[], className = "") => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none ${className}`}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/fieldwork/sizing")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Customer Site Assessment</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete the technical field questionnaire for <strong>{clientName || "—"}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveProgress} disabled={saving} className="gap-1.5 text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Progress
          </Button>
          <Button onClick={handleSubmitForTm} disabled={submitting} className="gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for TM Approval
          </Button>
        </div>
      </div>

      {/* Sizing Specs Summary (read-only) */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" /> Sizing Specifications (Auto-filled)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="bg-muted/40 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[10px] uppercase">Pump Model</span>
            <span className="font-bold text-foreground">{proposal.selectedPumpModel || "—"}</span>
          </div>
          <div className="bg-muted/40 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[10px] uppercase">Vertical Lift</span>
            <span className="font-bold text-foreground">{proposal.verticalLift || "—"} m</span>
          </div>
          <div className="bg-muted/40 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[10px] uppercase">Pipe Length</span>
            <span className="font-bold text-foreground">{proposal.pipeLength || "—"} m</span>
          </div>
          <div className="bg-muted/40 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[10px] uppercase">Daily Need</span>
            <span className="font-bold text-foreground">{proposal.dailyWaterNeed || "—"} m³/day</span>
          </div>
          <div className="bg-muted/40 rounded-lg p-2.5 border">
            <span className="text-muted-foreground block text-[10px] uppercase">Coordinates</span>
            <span className="font-bold text-foreground font-mono text-[10px]">{proposal.latitude?.toFixed(4)}, {proposal.longitude?.toFixed(4)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Lead Info (editable) */}
      <Card className="border-emerald-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" /> Client Information
          </CardTitle>
          <CardDescription className="text-xs">Pre-filled from lead data. Edit if needed.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-semibold">Client / Farm Name *</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="bg-background font-semibold" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Site Address</Label>
            <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="bg-background" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Contact Person</Label>
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="bg-background" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-background font-mono" />
          </div>
        </CardContent>
      </Card>

      {/* Full 12-Section Questionnaire */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Technical Field Questionnaire
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">12 Sections</Badge>
          </div>
          <CardDescription className="text-xs">
            Complete the comprehensive solar irrigation site assessment. Fields pre-populated from sizing data are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tabSiteWater" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-muted/70 p-1.5 rounded-xl border">
              <TabsTrigger value="tabSiteWater" className="text-xs font-bold py-2">1. Site & Water</TabsTrigger>
              <TabsTrigger value="tabSolarLayout" className="text-xs font-bold py-2">2. Solar & Pipe</TabsTrigger>
              <TabsTrigger value="tabSoilsCrops" className="text-xs font-bold py-2">3. Soil & Crops</TabsTrigger>
              <TabsTrigger value="tabInstFin" className="text-xs font-bold py-2">4. Ops & Finance</TabsTrigger>
            </TabsList>

            {/* TAB 1: SITE & WATER */}
            <TabsContent value="tabSiteWater" className="space-y-6 pt-4 text-xs">
              {/* Section 1: General Site Profile */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 1: General Site Profile</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Assessment Date</Label>
                    <Input type="date" value={dc.generalSite.assessmentDate} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, assessmentDate: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Region</Label>
                    <Input placeholder="e.g. SNNPR" value={dc.generalSite.region} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, region: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Zone</Label>
                    <Input placeholder="e.g. Gamo" value={dc.generalSite.zone} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, zone: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Woreda</Label>
                    <Input placeholder="e.g. Arba Minch Zuria" value={dc.generalSite.woreda} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, woreda: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Kebele</Label>
                    <Input value={dc.generalSite.kebele} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, kebele: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Village / Locality</Label>
                    <Input value={dc.generalSite.village} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, village: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Distance from Main Road (km)</Label>
                    <Input value={dc.generalSite.distanceFromMainRoad} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, distanceFromMainRoad: e.target.value}})} className="bg-background border-border font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Road Accessibility</Label>
                    {sel(dc.generalSite.roadAccessibility, (v) => setDc({...dc, generalSite: {...dc.generalSite, roadAccessibility: v}}), ["Good", "Moderate", "Poor"])}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Male Beneficiaries</Label><Input value={dc.generalSite.beneficiaries.male} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, beneficiaries: {...dc.generalSite.beneficiaries, male: e.target.value}}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Female Beneficiaries</Label><Input value={dc.generalSite.beneficiaries.female} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, beneficiaries: {...dc.generalSite.beneficiaries, female: e.target.value}}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Youth Beneficiaries</Label><Input value={dc.generalSite.beneficiaries.youth} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, beneficiaries: {...dc.generalSite.beneficiaries, youth: e.target.value}}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Total Beneficiaries</Label><Input value={dc.generalSite.beneficiaries.total} onChange={(e) => setDc({...dc, generalSite: {...dc.generalSite, beneficiaries: {...dc.generalSite.beneficiaries, total: e.target.value}}})} className="bg-background border-border font-mono" /></div>
                </div>
              </div>

              {/* Section 2: Water Source */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 2: Water Source</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Source Type</Label>{sel(dc.waterSource.sourceType, (v) => setDc({...dc, waterSource: {...dc.waterSource, sourceType: v}}), ["Borehole", "Open Well", "River / Stream", "Lake / Reservoir", "Spring"])}</div>
                  <div><Label className="text-[10px] font-semibold">Use Type</Label>{sel(dc.waterSource.useType, (v) => setDc({...dc, waterSource: {...dc.waterSource, useType: v}}), ["Irrigation only", "Domestic + Irrigation", "Livestock + Irrigation", "Multi-purpose"])}</div>
                  <div><Label className="text-[10px] font-semibold">Well Depth (m)</Label><Input value={dc.waterSource.wellDepth} onChange={(e) => setDc({...dc, waterSource: {...dc.waterSource, wellDepth: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Static Water Level (m)</Label><Input value={dc.waterSource.staticWaterLevel} onChange={(e) => setDc({...dc, waterSource: {...dc.waterSource, staticWaterLevel: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Dynamic Water Level (m)</Label><Input value={dc.waterSource.dynamicWaterLevel} onChange={(e) => setDc({...dc, waterSource: {...dc.waterSource, dynamicWaterLevel: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Drawdown (m)</Label><Input value={dc.waterSource.drawdown} onChange={(e) => setDc({...dc, waterSource: {...dc.waterSource, drawdown: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Recovery Time (min)</Label><Input value={dc.waterSource.recoveryTime} onChange={(e) => setDc({...dc, waterSource: {...dc.waterSource, recoveryTime: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Well Yield (L/s)</Label><Input value={dc.waterSource.wellYield} onChange={(e) => setDc({...dc, waterSource: {...dc.waterSource, wellYield: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Seasonal Availability</Label>{sel(dc.waterSource.seasonalAvailability, (v) => setDc({...dc, waterSource: {...dc.waterSource, seasonalAvailability: v}}), ["Year-round", "Seasonal", "Unreliable"])}</div>
                  <div><Label className="text-[10px] font-semibold">Reliability</Label>{sel(dc.waterSource.reliability, (v) => setDc({...dc, waterSource: {...dc.waterSource, reliability: v}}), ["High", "Medium", "Low"])}</div>
                </div>
              </div>

              {/* Section 3: Water Quality */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 3: Water Quality</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label className="text-[10px] font-semibold">Colour</Label>{sel(dc.waterQuality.colour, (v) => setDc({...dc, waterQuality: {...dc.waterQuality, colour: v}}), ["Clear", "Slightly coloured", "Highly coloured"])}</div>
                  <div><Label className="text-[10px] font-semibold">Turbidity</Label>{sel(dc.waterQuality.turbidity, (v) => setDc({...dc, waterQuality: {...dc.waterQuality, turbidity: v}}), ["Clear", "Slightly turbid", "Highly turbid"])}</div>
                  <div><Label className="text-[10px] font-semibold">Smell</Label>{sel(dc.waterQuality.smell, (v) => setDc({...dc, waterQuality: {...dc.waterQuality, smell: v}}), ["No smell", "Slight smell", "Strong smell"])}</div>
                  <div><Label className="text-[10px] font-semibold">Visible Sediment</Label>{sel(dc.waterQuality.visibleSediment, (v) => setDc({...dc, waterQuality: {...dc.waterQuality, visibleSediment: v}}), ["None", "Little", "Heavy"])}</div>
                  <div><Label className="text-[10px] font-semibold">Suitability</Label>{sel(dc.waterQuality.suitability, (v) => setDc({...dc, waterQuality: {...dc.waterQuality, suitability: v}}), ["Suitable", "Marginal", "Not suitable"])}</div>
                  <div><Label className="text-[10px] font-semibold">Further Test Required</Label>{sel(dc.waterQuality.furtherTest, (v) => setDc({...dc, waterQuality: {...dc.waterQuality, furtherTest: v}}), ["not required", "recommended", "mandatory"])}</div>
                </div>
              </div>

              {/* Section 4: Discharge Measurement */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 4: Discharge Test</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Measurement Method</Label>{sel(dc.dischargeMeasurement.method, (v) => setDc({...dc, dischargeMeasurement: {...dc.dischargeMeasurement, method: v}}), ["barrel method", "flow meter", "v-notch weir"])}</div>
                  <div><Label className="text-[10px] font-semibold">Container Volume (L)</Label><Input value={dc.dischargeMeasurement.containerVolume} onChange={(e) => setDc({...dc, dischargeMeasurement: {...dc.dischargeMeasurement, containerVolume: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Filling Time (s)</Label><Input value={dc.dischargeMeasurement.fillingTime} onChange={(e) => setDc({...dc, dischargeMeasurement: {...dc.dischargeMeasurement, fillingTime: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Flow Rate (L/s)</Label><Input value={dc.dischargeMeasurement.flowRateLps} onChange={(e) => setDc({...dc, dischargeMeasurement: {...dc.dischargeMeasurement, flowRateLps: e.target.value}})} className="bg-background border-border font-mono" /></div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: SOLAR & PIPE LAYOUT */}
            <TabsContent value="tabSolarLayout" className="space-y-6 pt-4 text-xs">
              {/* Section 5: Solar Resource */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 5: Solar Resource</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Solar Irradiation (kWh/m²/day)</Label><Input value={dc.solarResource.irradiation} onChange={(e) => setDc({...dc, solarResource: {...dc.solarResource, irradiation: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Solar Exposure</Label>{sel(dc.solarResource.solarExposure, (v) => setDc({...dc, solarResource: {...dc.solarResource, solarExposure: v}}), ["Good", "Moderate", "Poor"])}</div>
                  <div><Label className="text-[10px] font-semibold">Shading Condition</Label>{sel(dc.solarResource.shadingCondition, (v) => setDc({...dc, solarResource: {...dc.solarResource, shadingCondition: v}}), ["No shading", "Partial shading", "Heavy shading"])}</div>
                  <div><Label className="text-[10px] font-semibold">Available Land (m²)</Label><Input value={dc.solarResource.availableLand} onChange={(e) => setDc({...dc, solarResource: {...dc.solarResource, availableLand: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">PV to Water Source (m)</Label><Input value={dc.solarResource.distancePvToWater} onChange={(e) => setDc({...dc, solarResource: {...dc.solarResource, distancePvToWater: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Flood Risk</Label>{sel(dc.solarResource.floodRisk, (v) => setDc({...dc, solarResource: {...dc.solarResource, floodRisk: v}}), ["Low", "Medium", "High"])}</div>
                  <div><Label className="text-[10px] font-semibold">Panel Suitability</Label>{sel(dc.solarResource.panelSuitability, (v) => setDc({...dc, solarResource: {...dc.solarResource, panelSuitability: v}}), ["Suitable", "Moderate", "Not suitable"])}</div>
                </div>
              </div>

              {/* Section 6: Irrigation Layout */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 6: Irrigation & Pipe Layout</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Source to Field (m)</Label><Input value={dc.irrigationLayout.distanceSourceToField} onChange={(e) => setDc({...dc, irrigationLayout: {...dc.irrigationLayout, distanceSourceToField: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Elevation Diff (m)</Label><Input value={dc.irrigationLayout.elevationDifference} onChange={(e) => setDc({...dc, irrigationLayout: {...dc.irrigationLayout, elevationDifference: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Proposed Method</Label>{sel(dc.irrigationLayout.proposedMethod, (v) => setDc({...dc, irrigationLayout: {...dc.irrigationLayout, proposedMethod: v}}), ["Drip", "Sprinkler", "Surface", "Furrow"])}</div>
                  <div><Label className="text-[10px] font-semibold">Mainline Length (m)</Label><Input value={dc.irrigationLayout.mainlineLength} onChange={(e) => setDc({...dc, irrigationLayout: {...dc.irrigationLayout, mainlineLength: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Lateral Length (m)</Label><Input value={dc.irrigationLayout.lateralLineLength} onChange={(e) => setDc({...dc, irrigationLayout: {...dc.irrigationLayout, lateralLineLength: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Storage Tank Needed</Label>{sel(dc.irrigationLayout.storageTankNeeded, (v) => setDc({...dc, irrigationLayout: {...dc.irrigationLayout, storageTankNeeded: v}}), ["No", "Yes"])}</div>
                  <div><Label className="text-[10px] font-semibold">Future Expansion</Label>{sel(dc.irrigationLayout.futureExpansion, (v) => setDc({...dc, irrigationLayout: {...dc.irrigationLayout, futureExpansion: v}}), ["Yes", "No", "Maybe"])}</div>
                </div>
              </div>

              {/* Section 7: Solar Pump Requirement */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 7: Solar Pump Requirement</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Daily Water Demand (m³)</Label><Input value={dc.solarRequirement.dailyWaterDemand} onChange={(e) => setDc({...dc, solarRequirement: {...dc.solarRequirement, dailyWaterDemand: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Total Pumping Head (m)</Label><Input value={dc.solarRequirement.totalPumpingHead} onChange={(e) => setDc({...dc, solarRequirement: {...dc.solarRequirement, totalPumpingHead: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Proposed Pump</Label><Input value={dc.solarRequirement.proposedPumpCapacity} onChange={(e) => setDc({...dc, solarRequirement: {...dc.solarRequirement, proposedPumpCapacity: e.target.value}})} className="bg-primary/5 border-primary/30 font-mono font-semibold" /></div>
                  <div><Label className="text-[10px] font-semibold">Proposed PV Capacity</Label><Input value={dc.solarRequirement.proposedPvCapacity} onChange={(e) => setDc({...dc, solarRequirement: {...dc.solarRequirement, proposedPvCapacity: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Pumping Hours / Day</Label><Input value={dc.solarRequirement.pumpingHoursPerDay} onChange={(e) => setDc({...dc, solarRequirement: {...dc.solarRequirement, pumpingHoursPerDay: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Technical Feasibility</Label>{sel(dc.solarRequirement.technicalFeasibility, (v) => setDc({...dc, solarRequirement: {...dc.solarRequirement, technicalFeasibility: v}}), ["High", "Medium", "Low"])}</div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: SOIL, CROPS & ENVIRONMENT */}
            <TabsContent value="tabSoilsCrops" className="space-y-6 pt-4 text-xs">
              {/* Section 8: Crop & Soil */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 8: Crop & Soil</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Total Irrigable Area (ha)</Label><Input value={dc.cropSoil.totalIrrigableArea} onChange={(e) => setDc({...dc, cropSoil: {...dc.cropSoil, totalIrrigableArea: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Soil Type</Label>{sel(dc.cropSoil.soilType, (v) => setDc({...dc, cropSoil: {...dc.cropSoil, soilType: v}}), ["Loam", "Clay", "Sandy", "Silt", "Mixed"])}</div>
                  <div><Label className="text-[10px] font-semibold">Soil Drainage</Label>{sel(dc.cropSoil.soilDrainage, (v) => setDc({...dc, cropSoil: {...dc.cropSoil, soilDrainage: v}}), ["Good", "Moderate", "Poor"])}</div>
                  <div><Label className="text-[10px] font-semibold">Field Slope</Label>{sel(dc.cropSoil.fieldSlope, (v) => setDc({...dc, cropSoil: {...dc.cropSoil, fieldSlope: v}}), ["Flat", "Gentle slope", "Steep slope"])}</div>
                  <div className="col-span-2"><Label className="text-[10px] font-semibold">Main Existing Crops</Label><Input value={dc.cropSoil.mainExistingCrops} onChange={(e) => setDc({...dc, cropSoil: {...dc.cropSoil, mainExistingCrops: e.target.value}})} placeholder="e.g. Maize, Banana, Mango" className="bg-background border-border" /></div>
                  <div className="col-span-2"><Label className="text-[10px] font-semibold">Planned Irrigated Crops</Label><Input value={dc.cropSoil.plannedIrrigatedCrops} onChange={(e) => setDc({...dc, cropSoil: {...dc.cropSoil, plannedIrrigatedCrops: e.target.value}})} placeholder="e.g. Tomato, Pepper, Onion" className="bg-background border-border" /></div>
                </div>
              </div>

              {/* Section 9: Environmental Assessment */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 9: Environmental Assessment</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label className="text-[10px] font-semibold">Flood Risk</Label>{sel(dc.environmentalAssessment.floodRisk, (v) => setDc({...dc, environmentalAssessment: {...dc.environmentalAssessment, floodRisk: v}}), ["Low", "Medium", "High"])}</div>
                  <div><Label className="text-[10px] font-semibold">Erosion Risk</Label>{sel(dc.environmentalAssessment.erosionRisk, (v) => setDc({...dc, environmentalAssessment: {...dc.environmentalAssessment, erosionRisk: v}}), ["Low", "Medium", "High"])}</div>
                  <div><Label className="text-[10px] font-semibold">Groundwater Depletion Risk</Label>{sel(dc.environmentalAssessment.groundwaterDepletionRisk, (v) => setDc({...dc, environmentalAssessment: {...dc.environmentalAssessment, groundwaterDepletionRisk: v}}), ["Low", "Medium", "High"])}</div>
                  <div><Label className="text-[10px] font-semibold">Salinity Risk</Label>{sel(dc.environmentalAssessment.salinityRisk, (v) => setDc({...dc, environmentalAssessment: {...dc.environmentalAssessment, salinityRisk: v}}), ["Low", "Medium", "High"])}</div>
                  <div className="col-span-2"><Label className="text-[10px] font-semibold">Main Environmental Risk</Label><Input value={dc.environmentalAssessment.mainRisk} onChange={(e) => setDc({...dc, environmentalAssessment: {...dc.environmentalAssessment, mainRisk: e.target.value}})} placeholder="Describe any key environmental concern" className="bg-background border-border" /></div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: OPERATIONS & FINANCIALS */}
            <TabsContent value="tabInstFin" className="space-y-6 pt-4 text-xs">
              {/* Section 10: Institutional Readiness */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 10: Institutional Readiness</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-[10px] font-semibold">Willingness for Solar Pump</Label>{sel(dc.institutionalReadiness.willingnessSolarPump, (v) => setDc({...dc, institutionalReadiness: {...dc.institutionalReadiness, willingnessSolarPump: v}}), ["High", "Medium", "Low"])}</div>
                  <div><Label className="text-[10px] font-semibold">Willingness for Land</Label>{sel(dc.institutionalReadiness.willingnessLand, (v) => setDc({...dc, institutionalReadiness: {...dc.institutionalReadiness, willingnessLand: v}}), ["Yes", "Partial", "No"])}</div>
                  <div><Label className="text-[10px] font-semibold">Women Participation</Label>{sel(dc.institutionalReadiness.womenParticipation, (v) => setDc({...dc, institutionalReadiness: {...dc.institutionalReadiness, womenParticipation: v}}), ["High", "Medium", "Low"])}</div>
                  <div><Label className="text-[10px] font-semibold">Conflict Risk</Label>{sel(dc.institutionalReadiness.conflictRisk, (v) => setDc({...dc, institutionalReadiness: {...dc.institutionalReadiness, conflictRisk: v}}), ["Low", "Medium", "High"])}</div>
                </div>
              </div>

              {/* Section 11: O&M Readiness */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 11: O&M Readiness</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label className="text-[10px] font-semibold">Local Technician Available</Label>{sel(dc.operationReadiness.localTechnician, (v) => setDc({...dc, operationReadiness: {...dc.operationReadiness, localTechnician: v}}), ["Yes", "No", "Partially"])}</div>
                  <div><Label className="text-[10px] font-semibold">Spare Parts Access</Label>{sel(dc.operationReadiness.sparePartsAccess, (v) => setDc({...dc, operationReadiness: {...dc.operationReadiness, sparePartsAccess: v}}), ["Easy", "Moderate", "Difficult"])}</div>
                  <div><Label className="text-[10px] font-semibold">Security Arrangement</Label>{sel(dc.operationReadiness.securityArrangement, (v) => setDc({...dc, operationReadiness: {...dc.operationReadiness, securityArrangement: v}}), ["fence", "guard", "community watch", "none"])}</div>
                </div>
              </div>

              {/* Section 12: Financial & Market */}
              <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 12: Financial & Market</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label className="text-[10px] font-semibold">Current Diesel Cost (ETB/mo)</Label><Input value={dc.financialMarket.currentDieselCost} onChange={(e) => setDc({...dc, financialMarket: {...dc.financialMarket, currentDieselCost: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Market Access</Label>{sel(dc.financialMarket.marketAccess, (v) => setDc({...dc, financialMarket: {...dc.financialMarket, marketAccess: v}}), ["Good", "Moderate", "Poor"])}</div>
                  <div><Label className="text-[10px] font-semibold">Income Potential</Label>{sel(dc.financialMarket.incomePotential, (v) => setDc({...dc, financialMarket: {...dc.financialMarket, incomePotential: v}}), ["High", "Medium", "Low"])}</div>
                  <div><Label className="text-[10px] font-semibold">Distance to Market (km)</Label><Input value={dc.financialMarket.distanceToMarket} onChange={(e) => setDc({...dc, financialMarket: {...dc.financialMarket, distanceToMarket: e.target.value}})} className="bg-background border-border font-mono" /></div>
                  <div><Label className="text-[10px] font-semibold">Farmer Payment Capacity</Label><Input value={dc.financialMarket.farmerPaymentCapacity} onChange={(e) => setDc({...dc, financialMarket: {...dc.financialMarket, farmerPaymentCapacity: e.target.value}})} placeholder="ETB / month" className="bg-background border-border font-mono" /></div>
                </div>
              </div>

              {/* Overall Summary */}
              <div className="space-y-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/30">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Overall Site Assessment Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label className="text-[10px] font-semibold">Solar Rating</Label>{sel(dc.overallSummary.solarRating, (v) => setDc({...dc, overallSummary: {...dc.overallSummary, solarRating: v}}), ["High", "Medium", "Low"])}</div>
                  <div><Label className="text-[10px] font-semibold">Water Rating</Label>{sel(dc.overallSummary.waterRating, (v) => setDc({...dc, overallSummary: {...dc.overallSummary, waterRating: v}}), ["High", "Medium", "Low"])}</div>
                  <div><Label className="text-[10px] font-semibold">Yield Rating</Label>{sel(dc.overallSummary.yieldRating, (v) => setDc({...dc, overallSummary: {...dc.overallSummary, yieldRating: v}}), ["High", "Medium", "Low"])}</div>
                  <div><Label className="text-[10px] font-semibold">Soil Rating</Label>{sel(dc.overallSummary.soilRating, (v) => setDc({...dc, overallSummary: {...dc.overallSummary, soilRating: v}}), ["High", "Medium", "Low"])}</div>
                  <div><Label className="text-[10px] font-semibold">Overall Suitability</Label>{sel(dc.overallSummary.overallSuitability, (v) => setDc({...dc, overallSummary: {...dc.overallSummary, overallSuitability: v}}), ["Highly suitable", "Suitable", "Moderately suitable", "Not suitable"])}</div>
                </div>
                <div className="pt-2">
                  <Label className="text-[10px] font-semibold">Final Assessment Summary Statement</Label>
                  <textarea
                    value={dc.overallSummary.fieldSummaryText}
                    onChange={(e) => setDc({...dc, overallSummary: {...dc.overallSummary, fieldSummaryText: e.target.value}})}
                    placeholder="Comprehensive summary covering solar, hydraulic, agronomic, and community feasibility..."
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-background p-3 text-xs focus-visible:outline-none mt-1"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bottom action bar */}
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border">
        <Button variant="ghost" onClick={() => navigate("/fieldwork/sizing")} className="gap-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Sizing
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveProgress} disabled={saving} className="gap-1.5 text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Progress
          </Button>
          <Button onClick={handleSubmitForTm} disabled={submitting} className="gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for TM Approval
          </Button>
        </div>
      </div>
    </div>
  );
}
