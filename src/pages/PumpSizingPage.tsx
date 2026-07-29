import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, MapPin, Droplets, Zap, CheckCircle2, Sun, Calendar, Info, ShieldCheck, ShoppingCart, Search, UserCheck, CreditCard, ClipboardCheck, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api/client";
import { ClientFileModal } from "@/components/ClientFileModal";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
  Area,
  Line
} from "recharts";

// Fix leaflet icon issue with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

function LocationMarker({ position, setPosition, setMapCenter, setClientAddress }: { position: any, setPosition: any, setMapCenter: any, setClientAddress: any }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      // Ethiopia bounding box check
      if (lat < 3.0 || lat > 15.0 || lng < 33.0 || lng > 48.0) {
        toast.error("Please click inside Ethiopia boundaries (Lat: 3 to 15, Lng: 33 to 48).");
        return;
      }
      setPosition(e.latlng);
      setMapCenter([lat, lng]);

      // Reverse geocode to get a precise address
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortAddress = parts.slice(0, 3).join(',').trim();
            setClientAddress(shortAddress);
          }
        })
        .catch(err => console.error("Reverse geocoding error:", err));
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function PumpSizingPage() {
  const { currentUser, hasAccess } = useAuth();
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([9.03, 38.74]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [verticalLift, setVerticalLift] = useState<string>("45");
  const [pipeLength, setPipeLength] = useState<string>("60");
  const [pipeDiameter, setPipeDiameter] = useState<string>("1.25");
  const [dailyWaterNeed, setDailyWaterNeed] = useState<string>("20");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("curves");

  // Workflow integration states
  const [activeMainTab, setActiveMainTab] = useState<string>("calculator");
  const [proposals, setProposals] = useState<any[]>([]);
  const [fetchingProposals, setFetchingProposals] = useState<boolean>(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState<boolean>(false);
  const [savingProposal, setSavingProposal] = useState<boolean>(false);

  const [isDataSheetOpen, setIsDataSheetOpen] = useState<boolean>(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [fileModalOpen, setFileModalOpen] = useState<boolean>(false);
  const [fileModalProposal, setFileModalProposal] = useState<any | null>(null);
  const [allPumps, setAllPumps] = useState<any[]>([]);
  const [ttls, setTtls] = useState<any[]>([]);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState<boolean>(false);
  const [isFieldworkDialogOpen, setIsFieldworkDialogOpen] = useState<boolean>(false);
  const [suggestedPumpModel, setSuggestedPumpModel] = useState<string>("");
  const [rejectComment, setRejectComment] = useState<string>("");
  const [selectedTtl, setSelectedTtl] = useState<string>("");
  const [submittingReject, setSubmittingReject] = useState<boolean>(false);
  const [creatingFieldwork, setCreatingFieldwork] = useState<boolean>(false);

  // Initializing empty data collection sheet structure
  const [dataCollection, setDataCollection] = useState<any>({
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
  });

  // Proposal form state
  const [clientName, setClientName] = useState<string>("");
  const [clientAddress, setClientAddress] = useState<string>("");
  const [waterSource, setWaterSource] = useState<string>("Borehole");

  // Fetch proposals
  const fetchProposals = async () => {
    setFetchingProposals(true);
    try {
      const response = await apiClient.get("/sizing-requests");
      setProposals(response.data);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load proposals list.");
    } finally {
      setFetchingProposals(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === "proposals") {
      fetchProposals();
    }
  }, [activeMainTab]);

  useEffect(() => {
    apiClient.get("/pumps").then(res => {
      setAllPumps(res.data);
      if (res.data.length > 0) setSuggestedPumpModel(res.data[0].model);
    }).catch(console.error);

    apiClient.get("/users").then(res => {
      const filtered = res.data.filter((u: any) => 
        u.role === 'ttl' || u.role === 'fieldwork' || u.role === 'technician' ||
        (u.roles && u.roles.some((r: any) => ['ttl', 'fieldwork', 'technician'].includes(r.role?.name)))
      );
      setTtls(filtered);
      if (filtered.length > 0) setSelectedTtl(filtered[0].username);
    }).catch(console.error);
  }, []);

  // Helper to auto-populate assessment questionnaire from current sizing inputs & calculation results
  const syncSizingToAssessment = () => {
    setDataCollection((prev: any) => ({
      ...prev,
      generalSite: {
        ...prev.generalSite,
        contactPerson: clientName || prev.generalSite.contactPerson,
        village: clientAddress || prev.generalSite.village,
      },
      waterSource: {
        ...prev.waterSource,
        sourceType: waterSource || prev.waterSource.sourceType,
        wellDepth: verticalLift || prev.waterSource.wellDepth,
        staticWaterLevel: verticalLift || prev.waterSource.staticWaterLevel,
      },
      irrigationLayout: {
        ...prev.irrigationLayout,
        mainlineLength: pipeLength || prev.irrigationLayout.mainlineLength,
        elevationDifference: verticalLift || prev.irrigationLayout.elevationDifference,
        distanceSourceToField: pipeLength || prev.irrigationLayout.distanceSourceToField,
      },
      solarRequirement: {
        ...prev.solarRequirement,
        dailyWaterDemand: dailyWaterNeed || prev.solarRequirement.dailyWaterDemand,
        totalPumpingHead: result?.calculated_tdh ? String(result.calculated_tdh) : (verticalLift || prev.solarRequirement.totalPumpingHead),
        proposedPumpCapacity: result?.exact_match?.model || prev.solarRequirement.proposedPumpCapacity,
        proposedPvCapacity: result?.exact_match?.pv_capacity_kw 
          ? `${result.exact_match.pv_capacity_kw} kW` 
          : prev.solarRequirement.proposedPvCapacity,
      }
    }));
  };

  const handleOpenDataSheet = () => {
    syncSizingToAssessment();
    setIsDataSheetOpen(true);
  };

  // Save new proposal draft
  const handleSaveProposal = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter a client name.");
      return;
    }
    if (!position || !result?.exact_match?.model) {
      toast.error("Invalid state. Perform sizing calculation first.");
      return;
    }

    setSavingProposal(true);
    try {
      await apiClient.post("/sizing-requests", {
        clientName,
        address: clientAddress,
        latitude: position.lat,
        longitude: position.lng,
        waterSource,
        dailyWaterNeed: parseFloat(dailyWaterNeed),
        pipeLength: parseFloat(pipeLength),
        verticalLift: parseFloat(verticalLift),
        selectedPumpModel: result.exact_match.model,
        dataCollection,
      });

      toast.success("Sizing Proposal and Data Sheet saved successfully!");
      setIsSaveDialogOpen(false);
      setClientName("");
      setClientAddress("");
      setActiveMainTab("proposals");
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to save proposal draft.");
    } finally {
      setSavingProposal(false);
    }
  };

  // Submit assessment to Technical Manager
  const handleSubmitToTm = async (id: string) => {
    try {
      await apiClient.patch(`/sizing-requests/${id}/submit-to-tm`);
      toast.success("Sizing assessment submitted to Technical Manager.");
      fetchProposals();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to submit proposal to TM.");
    }
  };

  // Technical Manager approve
  const handleCheckSizing = async (id: string) => {
    try {
      await apiClient.patch(`/sizing-requests/${id}/check`);
      toast.success("Sizing checked and routed to Finance for payment collection.");
      fetchProposals();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to approve proposal.");
    }
  };

  // TM Reject
  const handleTmReject = async (id: string) => {
    if (!suggestedPumpModel) {
      toast.error("Please choose a suggested pump model.");
      return;
    }
    if (!rejectComment.trim()) {
      toast.error("Please supply a rejection reason.");
      return;
    }
    setSubmittingReject(true);
    try {
      await apiClient.patch(`/sizing-requests/${id}/tm-reject`, {
        suggestedPumpModel,
        comment: rejectComment,
      });
      toast.success("Sizing assessment rejected and returned to Sales with pump suggestions.");
      setIsRejectDialogOpen(false);
      setRejectComment("");
      setSelectedProposal(null);
      fetchProposals();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to reject proposal.");
    } finally {
      setSubmittingReject(false);
    }
  };

  // Keep GM Approve for compatibility
  const handleGmApprove = async (id: string) => {
    try {
      await apiClient.patch(`/sizing-requests/${id}/gm-approve`);
      toast.success("GM signoff approved.");
      fetchProposals();
    } catch (e: any) {
      console.error(e);
      toast.error("Error approving.");
    }
  };

  // Finance: Mark PAID
  const handleFinancePay = async (id: string) => {
    try {
      await apiClient.patch(`/sizing-requests/${id}/finance-pay`);
      toast.success("Payment verified! Proposal is PAID. Technical Manager notified to initiate fieldwork.");
      fetchProposals();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to log payment.");
    }
  };

  // TM manual fieldwork launch
  const handleCreateFieldwork = async (id: string) => {
    if (!selectedTtl) {
      toast.error("Please select a Technical Team Leader.");
      return;
    }
    setCreatingFieldwork(true);
    try {
      await apiClient.post(`/sizing-requests/${id}/create-fieldwork`, {
        assignedTo: selectedTtl,
      });
      toast.success("Fieldwork job successfully instantiated and crew dispatch notified!");
      setIsFieldworkDialogOpen(false);
      setSelectedProposal(null);
      fetchProposals();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to create fieldwork.");
    } finally {
      setCreatingFieldwork(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;

    // Check if the query is a latitude/longitude coordinate pair (e.g. "9.03, 38.74" or "9.03 38.74")
    const coordRegex = /^\s*(-?\d+(?:\.\d+)?)\s*[\s,]\s*(-?\d+(?:\.\d+)?)\s*$/;
    const match = searchQuery.match(coordRegex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat < 3.0 || lat > 15.0 || lng < 33.0 || lng > 48.0) {
        toast.error("Coordinates must be within Ethiopia (Lat: 3 to 15, Lng: 33 to 48).");
        return;
      }
      const latlng = L.latLng(lat, lng);
      setPosition(latlng);
      setMapCenter([lat, lng]);
      toast.success(`Centered on coordinates: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
      
      // Reverse geocode coordinates to update client address
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortAddress = parts.slice(0, 3).join(',').trim();
            setClientAddress(shortAddress);
          }
        })
        .catch(err => console.error("Reverse geocoding coordinates failed", err));
      return;
    }

    setSearching(true);
    try {
      // Limit geocoder to Ethiopia only
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=et&q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Search service error");
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        if (lat < 3.0 || lat > 15.0 || lon < 33.0 || lon > 48.0) {
          toast.error("Found location is outside Ethiopia.");
          return;
        }
        const latlng = L.latLng(lat, lon);
        setPosition(latlng);
        setMapCenter([lat, lon]);
        setClientAddress(first.display_name.split(',').slice(0, 3).join(',').trim());
        toast.success(`Found: ${first.display_name.split(',')[0]}`);
      } else {
        toast.error("Location not found in Ethiopia. Try another name.");
      }
    } catch (e: any) {
      toast.error("Failed to search location: " + e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleCalculate = async () => {
    if (!position) {
      toast.error("Please select a location on the map.");
      return;
    }
    if (position.lat < 3.0 || position.lat > 15.0 || position.lng < 33.0 || position.lng > 48.0) {
      toast.error("Coordinates must be inside Ethiopia.");
      return;
    }
    if (!verticalLift || !pipeLength || !pipeDiameter || !dailyWaterNeed) {
      toast.error("Please fill in all constraints.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/recommend-pump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.lat,
          longitude: position.lng,
          vertical_lift_m: parseFloat(verticalLift),
          pipe_length_m: parseFloat(pipeLength),
          pipe_diameter_inch: parseFloat(pipeDiameter),
          daily_water_need_m3: parseFloat(dailyWaterNeed),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate. Please ensure the Python AI Engine is running.");
      }

      const data = await response.json();
      setResult(data);
      toast.success("Pump sizing calculations completed!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred while calculating.");
    } finally {
      setLoading(false);
    }
  };

  // Process data for Recharts
  const getCurveData = (pump: any) => {
    if (!pump || !pump.performanceData) return [];
    return pump.performanceData.map((pt: any) => ({
      flow: pt.flow,
      head: pt.head
    }));
  };

  const getMonthlyData = () => {
    if (!result || !result.climate_data) return [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const insolation = result.climate_data.sol_insolation;
    const yields = result.exact_match?.monthly_yields || [];
    
    return months.map((m, idx) => ({
      name: m,
      insolation: insolation[idx] ? parseFloat(insolation[idx].toFixed(2)) : 0,
      yield: yields[idx] ? parseFloat(yields[idx].toFixed(2)) : 0
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">AI Pump Sizing Engine</h1>
          <p className="text-muted-foreground mt-1">Professional solar water pump sizing, dynamic operating curves, and climate analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs px-3 py-1 flex items-center gap-1.5 rounded-full mr-2 hidden sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Lorentz Compass Clone v1.2
          </Badge>
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-[300px]">
            <TabsList className="grid grid-cols-2 w-full border">
              <TabsTrigger value="calculator">Sizing Calc</TabsTrigger>
              <TabsTrigger value="proposals">Proposals & Logs</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeMainTab === "calculator" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Inputs & Map */}
          <div className="lg:col-span-5 space-y-6">
            
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-heading">
                  <MapPin className="h-5 w-5 text-primary" />
                  Sizing Location Context
                </CardTitle>
                <CardDescription>Search or select a location to fetch NASA solar irradiation parameters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search city, town, or paste 'lat, lng'..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchLocation();
                      }}
                      className="pl-8 bg-background border-border"
                    />
                  </div>
                  <Button onClick={handleSearchLocation} disabled={searching} variant="secondary" className="border">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
                  </Button>
                </div>

                <div className="h-[420px] w-full rounded-md overflow-hidden border border-border shadow-inner relative z-0">
                  <MapContainer
                    center={mapCenter}
                    zoom={6}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                    maxBounds={[[3.0, 33.0], [15.0, 48.0]]}
                  >
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                      attribution="&copy; Google Maps"
                    />
                    <LocationMarker position={position} setPosition={setPosition} setMapCenter={setMapCenter} setClientAddress={setClientAddress} />
                    <ChangeView center={mapCenter} />
                  </MapContainer>
                </div>
                {position ? (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border border-border/50">
                    <span className="font-mono">Lat: {position.lat.toFixed(5)}</span>
                    <span className="font-mono">Lng: {position.lng.toFixed(5)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-2 rounded text-center">
                    ⚠️ Click the map or search to drop a coordinates marker.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-heading">
                  <Droplets className="h-5 w-5 text-primary" />
                  Hydraulic & Demand Inputs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lift">Vertical Lift (meters)</Label>
                  <Input id="lift" type="number" placeholder="e.g. 45" value={verticalLift} onChange={(e) => setVerticalLift(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">Elevation difference from water source level to discharge level.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="length">Pipe Length (m)</Label>
                    <Input id="length" type="number" placeholder="e.g. 60" value={pipeLength} onChange={(e) => setPipeLength(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diameter">Diameter (inches)</Label>
                    <Input id="diameter" type="number" placeholder="e.g. 1.25" value={pipeDiameter} onChange={(e) => setPipeDiameter(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 border-t pt-3 border-border/50">
                  <Label htmlFor="demand" className="text-primary font-semibold">Daily Water Requirement (m³/day)</Label>
                  <Input id="demand" type="number" placeholder="e.g. 20" value={dailyWaterNeed} onChange={(e) => setDailyWaterNeed(e.target.value)} className="border-primary/30 focus-visible:ring-primary" />
                  <p className="text-[10px] text-muted-foreground">Volume of water required daily at point of use.</p>
                </div>

                <Button className="w-full mt-2 font-bold shadow-lg" onClick={handleCalculate} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Solving System Equations...
                    </>
                  ) : (
                    "Size System & Draw Curves"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
    
          {/* RIGHT COLUMN: AI Results & Charts */}
          <div className="lg:col-span-7">
            {result ? (
              <div className="space-y-6">
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Calculated TDH</span>
                    <div>
                      <span className="text-2xl font-bold text-primary font-mono">{result.calculated_tdh}</span>
                      <span className="text-xs text-muted-foreground ml-1">meters</span>
                    </div>
                  </div>
                  
                  <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Required Flow Rate</span>
                    <div>
                      <span className="text-2xl font-bold text-cyan-600 font-mono">{result.target_flow_m3h}</span>
                      <span className="text-xs text-muted-foreground ml-1">m³/h</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Avg Daily Yield</span>
                    <div>
                      <span className="text-2xl font-bold text-amber-600 font-mono">{result.exact_match?.daily_water_yield_m3 || 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">m³/day</span>
                    </div>
                  </div>
                </div>

                {/* Exact Match display */}
                {result.exact_match && (
                  <Card className="border border-border shadow-md overflow-hidden">
                    <div className="bg-muted/50 p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Recommended Pump</span>
                        <h2 className="text-2xl font-bold font-heading mt-1 text-foreground">{result.exact_match.model}</h2>
                        <p className="text-xs text-muted-foreground">{result.exact_match.firstCategory || result.exact_match.brand}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className="bg-slate-800 text-white hover:bg-slate-800/90">{result.exact_match.power}</Badge>
                        <Badge className="bg-blue-600 text-white hover:bg-blue-600/90">{result.exact_match.voltage}</Badge>
                        <Button size="sm" onClick={() => setIsSaveDialogOpen(true)} className="gap-1.5 ml-2 font-semibold">
                          <ShoppingCart className="h-3.5 w-3.5" /> Save Proposal
                        </Button>
                      </div>
                    </div>

                    <CardContent className="pt-6">
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid grid-cols-4 w-full h-11 bg-muted p-1 border">
                          <TabsTrigger value="curves" className="text-xs py-2 font-semibold">Operating Curves</TabsTrigger>
                          <TabsTrigger value="monthly" className="text-xs py-2 font-semibold">Monthly Yield</TabsTrigger>
                          <TabsTrigger value="daily" className="text-xs py-2 font-semibold">Daily Profile</TabsTrigger>
                          <TabsTrigger value="equipment" className="text-xs py-2 font-semibold">Required Kit</TabsTrigger>
                        </TabsList>

                        <TabsContent value="curves" className="space-y-4 outline-none">
                          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-foreground">
                              <Info className="h-4 w-4 text-primary" /> Hydraulic Operating Point Curve (Q vs H)
                            </h3>
                            <div className="h-[280px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" dataKey="flow" name="Flow" unit="m³/h" label={{ value: "Flow (m³/h)", position: "insideBottom", offset: -5 }} />
                                  <YAxis type="number" dataKey="head" name="Head" unit="m" label={{ value: "Head (m)", angle: -90, position: "insideLeft", offset: 5 }} />
                                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: any, name: any) => [value, name]} />
                                  <Legend />
                                  <Scatter
                                    name="Pump H-Q Performance Limit"
                                    data={getCurveData(result.exact_match)}
                                    line={{ stroke: '#2563eb', strokeWidth: 3 }}
                                    lineType="joint"
                                    shape="circle"
                                    fill="#2563eb"
                                  />
                                  <Scatter
                                    name="Actual Sized Operating Point"
                                    data={[{ flow: result.exact_match.calculated_flow_m3h || 0, head: result.calculated_tdh }]}
                                    fill="#22c55e"
                                    shape="circle"
                                    r={8}
                                  />
                                  <Scatter
                                    name="Design Required Target Flow"
                                    data={[{ flow: result.target_flow_m3h || 0, head: result.calculated_tdh }]}
                                    fill="#ef4444"
                                    shape="triangle"
                                    r={8}
                                  />
                                </ScatterChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="bg-muted/40 p-4 rounded-xl border border-dashed text-xs space-y-2">
                            <p className="font-semibold text-foreground">AI Engineering Review Verdict:</p>
                            <p className="italic text-muted-foreground">"{result.ai_reasoning || "Selected based on optimal efficiency for the specified Total Dynamic Head (TDH) and daily requirements."}"</p>
                            <div className="grid grid-cols-2 gap-4 mt-2 border-t pt-2 font-mono">
                              <div>• Flow at Design Head: <span className="font-bold text-primary">{result.exact_match.calculated_flow_m3h} m³/h</span></div>
                              <div>• Pump Head Range: <span className="font-bold text-primary">{result.exact_match.maxHead} meters max</span></div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="monthly" className="space-y-4 outline-none">
                          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-foreground">
                              <Calendar className="h-4 w-4 text-primary" /> Monthly Irradiation (NASA POWER) vs Water Output
                            </h3>
                            <div className="h-[280px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={getMonthlyData()} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis yAxisId="left" label={{ value: "Insolation (kWh/m²/day)", angle: -90, position: "insideLeft", offset: 0 }} />
                                  <YAxis yAxisId="right" orientation="right" label={{ value: "Daily Yield (m³/day)", angle: 90, position: "insideRight", offset: 0 }} />
                                  <Tooltip formatter={(value: any, name: any) => [value, name]} />
                                  <Legend />
                                  <Bar yAxisId="left" dataKey="insolation" name="Solar Insolation" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                  <Area yAxisId="right" type="monotone" dataKey="yield" name="Water Yield" fill="#3b82f6" stroke="#1d4ed8" fillOpacity={0.2} />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="bg-muted/40 p-4 rounded-xl border text-xs space-y-1">
                            <div className="font-semibold text-foreground mb-1">NASA Weather Station Context:</div>
                            <div>• Annual Solar Climatology Average: <span className="font-semibold font-mono">{(result.climate_data?.sol_insolation ? (result.climate_data.sol_insolation.reduce((a:any,b:any)=>a+b, 0)/12).toFixed(2) : 5.5)} kWh/m²/day</span></div>
                            <div>• Average Ground Skin Temperature: <span className="font-semibold font-mono">{(result.climate_data?.temperature ? (result.climate_data.temperature.reduce((a:any,b:any)=>a+b, 0)/12).toFixed(1) : 20.0)} °C</span></div>
                          </div>
                        </TabsContent>

                        <TabsContent value="daily" className="space-y-4 outline-none">
                          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-foreground">
                              <Sun className="h-4 w-4 text-primary" /> Hourly Solar Radiation & Pumping Cycle (12-hour day)
                            </h3>
                            <div className="h-[280px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={result.exact_match.daily_profile} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="time" />
                                  <YAxis yAxisId="left" label={{ value: "Irradiance (W/m²)", angle: -90, position: "insideLeft", offset: 0 }} />
                                  <YAxis yAxisId="right" orientation="right" label={{ value: "Flow Rate (m³/h)", angle: 90, position: "insideRight", offset: 0 }} />
                                  <Tooltip formatter={(value: any, name: any) => [value, name]} />
                                  <Legend />
                                  <Area yAxisId="left" type="monotone" dataKey="irradiance" name="Solar Radiation" fill="#fef08a" stroke="#ca8a04" fillOpacity={0.3} />
                                  <Line yAxisId="right" type="monotone" dataKey="flow" name="Pump Flow Rate" stroke="#06b6d4" strokeWidth={3} dot={false} />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="bg-muted/40 p-4 rounded-xl border text-xs">
                            💡 **Threshold Detection**: Flow starts when solar radiation exceeds **200 W/m²** (startup threshold of the MPPT inverter controller). Flow rate dynamically scales matching solar power availability.
                          </div>
                        </TabsContent>

                        <TabsContent value="equipment" className="space-y-4 outline-none">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center mb-1">
                              <h3 className="text-sm font-semibold text-foreground">Itemized Equipment Invoice Package</h3>
                              <span className="text-[10px] text-muted-foreground">Standard Retail Rates</span>
                            </div>
                            
                            <div className="divide-y border rounded-lg bg-background overflow-hidden">
                              {result.exact_match.equipment && result.exact_match.equipment.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 text-xs hover:bg-muted/20">
                                  <div>
                                    <p className="font-semibold text-foreground">{item.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{item.productId} • Qty: {item.quantity} {item.unit}</p>
                                  </div>
                                  <div className="text-right font-mono font-semibold">
                                    ${(item.price * item.quantity).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex justify-between items-center mt-4">
                              <div>
                                <p className="text-xs font-semibold text-primary">System Total Price Package</p>
                                <p className="text-[9px] text-muted-foreground">Excludes shipping, installation labor, and optional storage tanks.</p>
                              </div>
                              <div className="text-xl font-bold font-mono text-primary">
                                ${result.exact_match.equipment ? result.exact_match.equipment.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toLocaleString() : 0}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}

                {/* Alternatives grid */}
                {result.alternatives && result.alternatives.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="font-semibold text-lg border-b pb-2 text-foreground font-heading">Alternative Pump Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {result.alternatives.map((alt: any, idx: number) => (
                        <Card key={idx} className="hover:border-primary/30 transition-colors border shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-heading flex justify-between items-center">
                              <span>{alt.model}</span>
                              <Badge className="bg-slate-700 text-white text-[10px]">{alt.power}</Badge>
                            </CardTitle>
                            <CardDescription className="text-[11px]">{alt.firstCategory || alt.brand}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-1">
                            <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center font-mono">
                              <div className="bg-muted p-1.5 rounded">
                                <span className="text-muted-foreground block text-[8px] uppercase">TDH Flow</span>
                                <span className="font-bold text-foreground">{alt.calculated_flow_m3h || 0} m³/h</span>
                              </div>
                              <div className="bg-muted p-1.5 rounded">
                                <span className="text-muted-foreground block text-[8px] uppercase">Daily Yield</span>
                                <span className="font-bold text-foreground">{alt.daily_water_yield_m3 || 0} m³</span>
                              </div>
                              <div className="bg-muted p-1.5 rounded">
                                <span className="text-muted-foreground block text-[8px] uppercase">Package Price</span>
                                <span className="font-bold text-primary">
                                  ${alt.equipment ? alt.equipment.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toLocaleString() : 0}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full min-h-[450px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20 p-8 text-center border-border">
                <Droplets className="h-16 w-16 mb-4 text-muted-foreground/30 animate-pulse" />
                <h3 className="text-lg font-medium text-foreground mb-1">Awaiting Sizing Coordinates</h3>
                <p className="text-sm max-w-sm">Provide map context coordinates, hydraulic plumbing dimensions, and daily water needs, then calculate to render detailed pump curve graphs and monthly climate diagnostics.</p>
              </div>
            )}
          </div>
          
        </div>
      ) : (
        /* PROPOSALS LIST VIEW */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold font-heading text-foreground">Saved Sizing Proposals & Approvals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click on any proposal card to view full details and the field data collection sheet.</p>
            </div>
            <Button size="sm" onClick={fetchProposals} variant="outline" disabled={fetchingProposals} className="gap-1 bg-background">
              {fetchingProposals ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {fetchingProposals && proposals.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-16 border rounded-xl bg-muted/10">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading active proposals registry...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl bg-muted/10">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium text-foreground">No Saved Proposals Found</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                Go back to the Sizing Calculator, run pump dimensions, and click "Save Proposal" to log client assessments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposals.map((p) => {
                const isTM = hasAccess(["fieldwork", "manager"]);
                const isFinance = hasAccess(["finance", "manager"]);

                const statusColors: Record<string, string> = {
                  DRAFT: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700",
                  PENDING_TM: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/50",
                  REJECTED_TM: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
                  APPROVED_TM: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50",
                  PAID: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50",
                  FIELDWORK_CREATED: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50",
                  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
                };

                const statusLabels: Record<string, string> = {
                  DRAFT: "Draft Assessment",
                  PENDING_TM: "Awaiting TM Check",
                  REJECTED_TM: "Rejected by TM",
                  APPROVED_TM: "TM Approved (Payable)",
                  PAID: "Paid (Awaiting Crew)",
                  FIELDWORK_CREATED: "Fieldwork In Progress",
                  COMPLETED: "Sale Completed",
                };

                const eqList = p.calculatedEquipment ? (typeof p.calculatedEquipment === 'string' ? JSON.parse(p.calculatedEquipment) : p.calculatedEquipment) : [];

                return (
                  <Card key={p.id} className="shadow-sm hover:shadow-md transition-shadow border flex flex-col justify-between bg-card text-card-foreground cursor-pointer" onClick={() => setSelectedProposal(p)}>
                    <CardHeader className="pb-3 border-b bg-muted/15 flex flex-row justify-between items-start gap-2">
                      <div className="space-y-1">
                        <h3 className="font-bold font-heading text-base truncate max-w-[180px]" title={p.clientName}>
                          {p.clientName}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">{p.address || "No site address"}</p>
                      </div>
                      <Badge className={`${statusColors[p.status] || "bg-slate-100"} border text-[9px] font-bold px-2 py-0.5 rounded-full`}>
                        {statusLabels[p.status] || p.status}
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="pt-4 pb-4 space-y-4 flex-1">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-medium border-b pb-3">
                        <div className="text-muted-foreground">Pump Model: <span className="text-foreground font-semibold block">{p.selectedPumpModel}</span></div>
                        <div className="text-muted-foreground">Water Source: <span className="text-foreground font-semibold block">{p.waterSource || "Borehole"}</span></div>
                        <div className="text-muted-foreground">Daily Need: <span className="text-foreground font-semibold font-mono block">{Number(p.dailyWaterNeed)} m³</span></div>
                        <div className="text-muted-foreground">Head & Lift: <span className="text-foreground font-semibold font-mono block">{Number(p.verticalLift || 0)}m Lift / {Number(p.pipeLength || 0)}m Pipe</span></div>
                      </div>

                      {p.totalPrice && (
                        <div className="space-y-0.5 text-[11px]">
                          <span className="text-muted-foreground font-semibold block">Calculated Package Cost:</span>
                          <span className="text-lg font-bold font-mono text-primary block">${Number(p.totalPrice).toLocaleString()}</span>
                        </div>
                      )}

                      {/* Timeline Audit Logs */}
                      <div className="space-y-1.5 border-t pt-3 text-[10px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          <span>Prepared by {p.preparedByName}</span>
                        </div>
                        {p.checkedByName && (
                          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-500">
                            <UserCheck className="h-3 w-3" />
                            <span>Approved by TM {p.checkedByName}</span>
                          </div>
                        )}
                        {p.status === "REJECTED_TM" && (
                          <div className="text-red-600 dark:text-red-400 font-semibold p-1.5 rounded bg-red-500/10 border border-red-500/25">
                            TM suggestions logged. Click card to view.
                          </div>
                        )}
                        {p.status === "PAID" && (
                          <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                            <CreditCard className="h-3 w-3" />
                            <span>Paid - Awaiting TM Fieldwork dispatch</span>
                          </div>
                        )}
                        {p.status === "FIELDWORK_CREATED" && (
                          <div className="flex items-center gap-1 text-teal-700 dark:text-teal-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Fieldwork job active</span>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    {/* Actions block */}
                    <CardFooter className="pt-3 pb-3 border-t bg-muted/10 flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => { setFileModalProposal(p); setFileModalOpen(true); }} className="gap-1 text-xs font-semibold">
                        <Info className="h-3.5 w-3.5 text-primary" /> Full Client File
                      </Button>

                      {(p.status === "DRAFT" || p.status === "REJECTED_TM") && (
                        <Button size="sm" onClick={() => handleSubmitToTm(p.id)} className="w-full bg-primary hover:bg-primary/95 font-semibold gap-1 text-white">
                          Submit to TM for Check
                        </Button>
                      )}
                      
                      {p.status === "PENDING_TM" && isTM && (
                        <div className="flex gap-2 w-full">
                          <Button size="sm" variant="destructive" onClick={() => {
                            setSelectedProposal(p);
                            setIsRejectDialogOpen(true);
                          }} className="flex-1 font-semibold">
                            Deny
                          </Button>
                          <Button size="sm" onClick={() => handleCheckSizing(p.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold">
                            Approve
                          </Button>
                        </div>
                      )}

                      {p.status === "APPROVED_TM" && isFinance && (
                        <Button size="sm" onClick={() => handleFinancePay(p.id)} className="w-full bg-green-600 hover:bg-green-700 font-semibold gap-1 text-white">
                          <CreditCard className="h-3.5 w-3.5" /> Mark Paid
                        </Button>
                      )}

                      {p.status === "PAID" && isTM && (
                        <Button size="sm" onClick={() => {
                          setSelectedProposal(p);
                          setIsFieldworkDialogOpen(true);
                        }} className="w-full bg-blue-600 hover:bg-blue-700 font-semibold text-white">
                          Create Fieldwork Job
                        </Button>
                      )}

                      {p.status === "FIELDWORK_CREATED" && (
                        <div className="w-full text-center text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-500/10 py-1 rounded border border-teal-500/20">
                          Fieldwork In Progress
                        </div>
                      )}

                      {p.status === "COMPLETED" && (
                        <div className="w-full text-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 py-1 rounded border border-emerald-500/20">
                          Sale Completed
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Save Sizing Proposal Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Save Sizing Proposal</DialogTitle>
            <DialogDescription>
              Enter client registration details to save this hydraulic sizing assessment as a draft proposal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-1">
              <Label htmlFor="clientName" className="text-xs font-semibold">Client Name *</Label>
              <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g., Abebe Farms / Chala K." className="bg-background border-border" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="clientAddress" className="text-xs font-semibold">Site Address</Label>
              <Input id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="e.g., Arba Minch, Gamo" className="bg-background border-border" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="waterSource" className="text-xs font-semibold">Water Source</Label>
              <select id="waterSource" value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="Borehole">Borehole</option>
                <option value="Open Well">Open Well</option>
                <option value="River / Stream">River / Stream</option>
                <option value="Lake / Reservoir">Lake / Reservoir</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground bg-muted/60 p-3 rounded font-mono border mt-2">
              <div>Lat: {position?.lat.toFixed(5)}</div>
              <div>Lng: {position?.lng.toFixed(5)}</div>
              <div>Pump: {result?.exact_match?.model}</div>
              <div>Need: {dailyWaterNeed} m³/day</div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-2 border-primary/50 text-primary bg-primary/5 hover:bg-primary/10 gap-1.5 font-semibold text-xs"
              onClick={handleOpenDataSheet}
            >
              <ClipboardCheck className="h-4 w-4" />
              Fill Field Data Collection Sheet
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProposal} disabled={savingProposal}>
              {savingProposal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Proposal Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TM Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Deny / Suggest Alternative Pump</DialogTitle>
            <DialogDescription>
              Provide TM evaluation feedback and suggest an alternative pump from the active product inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Suggested Alternative Pump *</Label>
              <select
                value={suggestedPumpModel}
                onChange={(e) => setSuggestedPumpModel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {allPumps.map((pump) => (
                  <option key={pump.id} value={pump.model}>{pump.model} ({pump.brand || 'Retail'})</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">TM Denial Comments / Reason *</Label>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Reasoning for suggesting another model (e.g. well depth insufficient for surface pump model)..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleTmReject(selectedProposal?.id)} disabled={submittingReject} variant="destructive">
              {submittingReject ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Reject & Route Back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TM Manual Fieldwork Init Dialog */}
      <Dialog open={isFieldworkDialogOpen} onOpenChange={setIsFieldworkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Initiate Fieldwork Job</DialogTitle>
            <DialogDescription>
              Assign the fieldwork crew details for client "{selectedProposal?.clientName}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-1">
              <Label className="text-xs font-semibold">Assign Technical Team Leader *</Label>
              <select
                value={selectedTtl}
                onChange={(e) => setSelectedTtl(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ttls.length === 0 && (
                  <option value="" disabled>No TTL / Technical users found</option>
                )}
                {ttls.map((t) => {
                  const roleLabel = t.role === 'ttl' ? 'TTL' : t.role === 'fieldwork' ? 'Tech Manager' : t.role === 'technician' ? 'Technician' : t.role;
                  return (
                    <option key={t.id} value={t.username}>
                      {t.displayName || t.username} — {roleLabel} (@{t.username})
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="text-[11px] text-muted-foreground bg-muted/60 p-3 rounded font-mono border">
              <div>Job Title: Field Installation - {selectedProposal?.clientName}</div>
              <div>Pump: {selectedProposal?.selectedPumpModel}</div>
              <div>Address: {selectedProposal?.address}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldworkDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleCreateFieldwork(selectedProposal?.id)} disabled={creatingFieldwork} className="bg-primary text-white">
              {creatingFieldwork ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Dispatch Crew Planning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clickable Proposal Detail Dialog */}
      {selectedProposal && !isRejectDialogOpen && !isFieldworkDialogOpen && (
        <Dialog open={!!selectedProposal} onOpenChange={(open) => !open && setSelectedProposal(null)}>
          <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading flex justify-between items-center pr-6">
                <span>Sizing Proposal Details: {selectedProposal.clientName}</span>
                <Badge className={`border text-xs px-2.5 py-0.5 rounded-full`}>
                  {selectedProposal.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Prepared by {selectedProposal.preparedByName} on {new Date(selectedProposal.preparedAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4 border-t border-b">
              {/* Left side: sizing data & calculations */}
              <div className="md:col-span-5 space-y-4 border-r pr-0 md:pr-6">
                <div className="bg-muted/40 p-4 rounded-lg border space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">Sizing Parameters</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Water Source: <span className="font-semibold">{selectedProposal.waterSource}</span></div>
                    <div>Daily Water Need: <span className="font-semibold font-mono">{Number(selectedProposal.dailyWaterNeed)} m³</span></div>
                    <div>Vertical Lift: <span className="font-semibold font-mono">{Number(selectedProposal.verticalLift || 0)} m</span></div>
                    <div>Pipe Length: <span className="font-semibold font-mono">{Number(selectedProposal.pipeLength || 0)} m</span></div>
                    <div>Latitude: <span className="font-semibold font-mono">{Number(selectedProposal.latitude).toFixed(5)}</span></div>
                    <div>Longitude: <span className="font-semibold font-mono">{Number(selectedProposal.longitude).toFixed(5)}</span></div>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-2">
                  <h4 className="font-semibold text-sm text-primary">Sizing System Calculations</h4>
                  <div className="text-xs">
                    <div>Selected Pump Model: <span className="font-bold text-foreground">{selectedProposal.selectedPumpModel}</span></div>
                    {selectedProposal.totalPrice && (
                      <div className="mt-2">
                        <span className="text-muted-foreground text-[10px]">Invoice Package Total:</span>
                        <div className="text-xl font-extrabold font-mono text-primary">${Number(selectedProposal.totalPrice).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TM Suggested Pump details if rejected */}
                {selectedProposal.status === 'REJECTED_TM' && (
                  <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-xs text-red-700 space-y-1">
                    <span className="font-bold block">Technical Manager Feedback:</span>
                    <div>• Status: Rejected assessment</div>
                    <div>• Suggested Pump Model: <span className="font-bold">{selectedProposal.selectedPumpModel}</span></div>
                    {selectedProposal.notes && <div>• TM Note: {selectedProposal.notes}</div>}
                  </div>
                )}

                {/* Calculated Equipment List */}
                {(() => {
                  const eqList = selectedProposal.calculatedEquipment ? (typeof selectedProposal.calculatedEquipment === 'string' ? JSON.parse(selectedProposal.calculatedEquipment) : selectedProposal.calculatedEquipment) : [];
                  return eqList.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-foreground">Calculated Equipment Package</h4>
                      <div className="max-h-[180px] overflow-y-auto border rounded divide-y bg-background text-xs">
                        {eqList.map((item: any, idx: number) => (
                          <div key={idx} className="p-2 flex justify-between hover:bg-muted/10">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">Qty: {item.qty || item.quantity} x ${item.price}</p>
                            </div>
                            <span className="font-mono font-semibold">${((item.qty || item.quantity) * item.price).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Right side: Data Collection Sheet preview */}
              <div className="md:col-span-7 space-y-4">
                <h4 className="font-bold text-sm text-foreground border-b pb-2 flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Field Data Collection Sheet
                </h4>

                {selectedProposal.dataCollection ? (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    <Tabs defaultValue="site" className="w-full">
                      <TabsList className="grid grid-cols-4 w-full text-xs">
                        <TabsTrigger value="site">Site & Well</TabsTrigger>
                        <TabsTrigger value="solar">Solar & Layout</TabsTrigger>
                        <TabsTrigger value="socio">Soils & O&M</TabsTrigger>
                        <TabsTrigger value="finance">Feasibility</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="site" className="space-y-3 pt-2 text-xs">
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                          <div><strong>Date:</strong> {selectedProposal.dataCollection.generalSite?.assessmentDate}</div>
                          <div><strong>Region/Kebele:</strong> {selectedProposal.dataCollection.generalSite?.region} / {selectedProposal.dataCollection.generalSite?.kebele}</div>
                          <div><strong>Contact:</strong> {selectedProposal.dataCollection.generalSite?.contactPerson} ({selectedProposal.dataCollection.generalSite?.phone})</div>
                          <div><strong>Beneficiaries:</strong> {selectedProposal.dataCollection.generalSite?.beneficiaries?.total || 'N/A'} (M: {selectedProposal.dataCollection.generalSite?.beneficiaries?.male}, F: {selectedProposal.dataCollection.generalSite?.beneficiaries?.female})</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                          <div><strong>Well Depth:</strong> {selectedProposal.dataCollection.waterSource?.wellDepth} m</div>
                          <div><strong>Static Level:</strong> {selectedProposal.dataCollection.waterSource?.staticWaterLevel} m</div>
                          <div><strong>Dynamic Level:</strong> {selectedProposal.dataCollection.waterSource?.dynamicWaterLevel} m</div>
                          <div><strong>Discharge Yield:</strong> {selectedProposal.dataCollection.waterSource?.wellYield} L/s</div>
                          <div><strong>Source Reliability:</strong> {selectedProposal.dataCollection.waterSource?.reliability}</div>
                          <div><strong>Water Color/Smell:</strong> {selectedProposal.dataCollection.waterQuality?.colour} / {selectedProposal.dataCollection.waterQuality?.smell}</div>
                        </div>
                      </TabsContent>

                      <TabsContent value="solar" className="space-y-3 pt-2 text-xs">
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                          <div><strong>Solar Exposure:</strong> {selectedProposal.dataCollection.solarResource?.solarExposure}</div>
                          <div><strong>Shading Condition:</strong> {selectedProposal.dataCollection.solarResource?.shadingCondition}</div>
                          <div><strong>Land for PV:</strong> {selectedProposal.dataCollection.solarResource?.availableLand} m²</div>
                          <div><strong>PV Land Holding:</strong> {selectedProposal.dataCollection.solarResource?.landHolding}</div>
                          <div><strong>PV to Source Dist:</strong> {selectedProposal.dataCollection.solarResource?.distancePvToWater} m</div>
                          <div><strong>PV Flood Risk:</strong> {selectedProposal.dataCollection.solarResource?.floodRisk}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                          <div><strong>Source to Field Dist:</strong> {selectedProposal.dataCollection.irrigationLayout?.distanceSourceToField} m</div>
                          <div><strong>Elevation Diff:</strong> {selectedProposal.dataCollection.irrigationLayout?.elevationDifference} m</div>
                          <div><strong>Proposed Method:</strong> {selectedProposal.dataCollection.irrigationLayout?.proposedMethod}</div>
                          <div><strong>Storage Tank:</strong> {selectedProposal.dataCollection.irrigationLayout?.storageTankNeeded}</div>
                          <div><strong>Proposed Tank Cap:</strong> {selectedProposal.dataCollection.irrigationLayout?.proposedTankCapacity} L</div>
                        </div>
                      </TabsContent>

                      <TabsContent value="socio" className="space-y-3 pt-2 text-xs">
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                          <div><strong>Command Area:</strong> {selectedProposal.dataCollection.cropSoil?.totalIrrigableArea} ha</div>
                          <div><strong>Soil Type:</strong> {selectedProposal.dataCollection.cropSoil?.soilType}</div>
                          <div><strong>Soil Drainage:</strong> {selectedProposal.dataCollection.cropSoil?.soilDrainage}</div>
                          <div><strong>Main Crops:</strong> {selectedProposal.dataCollection.cropSoil?.mainExistingCrops}</div>
                          <div><strong>Willingness solar pump:</strong> {selectedProposal.dataCollection.institutionalReadiness?.willingnessSolarPump}</div>
                          <div><strong>Willingness cash contrib:</strong> {selectedProposal.dataCollection.institutionalReadiness?.willingnessCash}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                          <div><strong>Technician Available:</strong> {selectedProposal.dataCollection.operationReadiness?.localTechnician}</div>
                          <div><strong>Spare Parts Access:</strong> {selectedProposal.dataCollection.operationReadiness?.sparePartsAccess}</div>
                          <div><strong>Security Guard/Fence:</strong> {selectedProposal.dataCollection.operationReadiness?.securityArrangement}</div>
                          <div><strong>O&M Tariff Contrib:</strong> {selectedProposal.dataCollection.operationReadiness?.contributionSystem}</div>
                        </div>
                      </TabsContent>

                      <TabsContent value="finance" className="space-y-3 pt-2 text-xs">
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded border">
                          <div><strong>Monthly Diesel Cost:</strong> {selectedProposal.dataCollection.financialMarket?.currentDieselCost} ETB</div>
                          <div><strong>Maint Cost:</strong> {selectedProposal.dataCollection.financialMarket?.currentMaintenanceCost} ETB</div>
                          <div><strong>Farmer Pay Capacity:</strong> {selectedProposal.dataCollection.financialMarket?.farmerPaymentCapacity} ETB</div>
                          <div><strong>Market Access:</strong> {selectedProposal.dataCollection.financialMarket?.marketAccess}</div>
                          <div><strong>Distance to Market:</strong> {selectedProposal.dataCollection.financialMarket?.distanceToMarket} km</div>
                        </div>
                        <div className="bg-primary/5 p-3 rounded border space-y-1">
                          <span className="font-semibold text-primary">Feasibility Rating Scores:</span>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            <div>PV Site Suitability: <strong>{selectedProposal.dataCollection.overallSummary?.solarRating}</strong></div>
                            <div>Water Source Reliability: <strong>{selectedProposal.dataCollection.overallSummary?.waterRating}</strong></div>
                            <div>Farmer/IWUA Readiness: <strong>{selectedProposal.dataCollection.overallSummary?.readinessRating}</strong></div>
                            <div>Overall site suitability rating: <strong className="text-primary">{selectedProposal.dataCollection.overallSummary?.overallSuitability}</strong></div>
                          </div>
                        </div>
                        {selectedProposal.dataCollection.overallSummary?.fieldSummaryText && (
                          <div className="bg-slate-50 p-2.5 rounded border">
                            <strong>Site Summary Statement:</strong>
                            <p className="italic mt-1">"{selectedProposal.dataCollection.overallSummary.fieldSummaryText}"</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed rounded bg-muted/10 text-muted-foreground text-xs">
                    No Data Collection Sheet filled out for this proposal.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedProposal(null)}>Close Details</Button>
              {selectedProposal.status === 'PENDING_TM' && hasAccess(["fieldwork", "manager"]) && (
                <>
                  <Button onClick={() => {
                    setIsRejectDialogOpen(true);
                  }} variant="destructive" className="gap-1 font-semibold">
                    Deny
                  </Button>
                  <Button onClick={() => {
                    handleCheckSizing(selectedProposal.id);
                    setSelectedProposal(null);
                  }} className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-1">
                    Approve
                  </Button>
                </>
              )}
              {selectedProposal.status === 'APPROVED_TM' && hasAccess(["finance", "manager"]) && (
                <Button onClick={() => {
                  handleFinancePay(selectedProposal.id);
                  setSelectedProposal(null);
                }} className="bg-green-600 hover:bg-green-700 text-white font-semibold gap-1">
                  Mark Paid
                </Button>
              )}
              {selectedProposal.status === 'PAID' && hasAccess(["fieldwork", "manager"]) && (
                <Button onClick={() => {
                  setIsFieldworkDialogOpen(true);
                }} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1">
                  Create Fieldwork Job
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Massive Data Collection Form Dialog */}
      <Dialog open={isDataSheetOpen} onOpenChange={setIsDataSheetOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Solar Irrigation Site - Data Collection Questionnaire</DialogTitle>
            <DialogDescription>
              Complete the field metrics mapped directly from the official Solar Irrigation System Data Collection Sheet.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="siteGeneral" className="w-full py-2">
            <TabsList className="grid grid-cols-4 w-full text-xs">
              <TabsTrigger value="siteGeneral">1. Site & Well</TabsTrigger>
              <TabsTrigger value="solarPv">2. Solar & Layout</TabsTrigger>
              <TabsTrigger value="soilsOm">3. Soils & O&M</TabsTrigger>
              <TabsTrigger value="feasibility">4. Feasibility Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="siteGeneral" className="space-y-4 pt-4 text-xs">
              {/* Site General info */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">General Site Information</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Assessment Date</Label>
                    <Input type="date" value={dataCollection.generalSite.assessmentDate} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, assessmentDate: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Region</Label>
                    <Input placeholder="e.g. Oromia" value={dataCollection.generalSite.region} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, region: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Zone</Label>
                    <Input placeholder="e.g. East Shewa" value={dataCollection.generalSite.zone} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, zone: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Woreda</Label>
                    <Input placeholder="e.g. Adama" value={dataCollection.generalSite.woreda} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, woreda: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Kebele</Label>
                    <Input placeholder="e.g. Kebele 02" value={dataCollection.generalSite.kebele} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, kebele: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Village / Cluster</Label>
                    <Input placeholder="e.g. Melka" value={dataCollection.generalSite.village} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, village: e.target.value}})} className="bg-background border-border" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[10px] font-semibold">Farmer Representative Name</Label>
                      {clientName && <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium">Auto-filled from Sizing</span>}
                    </div>
                    <Input placeholder="Name of representative" value={dataCollection.generalSite.contactPerson} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, contactPerson: e.target.value}})} className="bg-background border-border font-medium text-foreground" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Phone Number</Label>
                    <Input placeholder="e.g. 0911000000" value={dataCollection.generalSite.phone} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, phone: e.target.value}})} className="bg-background border-border" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Beneficiary Male</Label>
                    <Input placeholder="Male Qty" value={dataCollection.generalSite.beneficiaries.male} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, beneficiaries: {...dataCollection.generalSite.beneficiaries, male: e.target.value}}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Beneficiary Female</Label>
                    <Input placeholder="Female Qty" value={dataCollection.generalSite.beneficiaries.female} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, beneficiaries: {...dataCollection.generalSite.beneficiaries, female: e.target.value}}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Youth</Label>
                    <Input placeholder="Youth Qty" value={dataCollection.generalSite.beneficiaries.youth} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, beneficiaries: {...dataCollection.generalSite.beneficiaries, youth: e.target.value}}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Total Beneficiary</Label>
                    <Input placeholder="Total" value={dataCollection.generalSite.beneficiaries.total} onChange={(e) => setDataCollection({...dataCollection, generalSite: {...dataCollection.generalSite, beneficiaries: {...dataCollection.generalSite.beneficiaries, total: e.target.value}}})} className="bg-background border-border" />
                  </div>
                </div>
              </div>

              {/* Water source & Well info */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">Water Source & Well Information</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Water Source Type</Label>
                    <select value={dataCollection.waterSource.sourceType} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, sourceType: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Borehole">Borehole</option>
                      <option value="HD well">HD well</option>
                      <option value="River">River</option>
                      <option value="Lake">Lake</option>
                      <option value="Spring">Spring</option>
                      <option value="Pond">Pond</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Well/Borehole Depth (m)</Label>
                    <Input placeholder="Depth in meters" value={dataCollection.waterSource.wellDepth} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, wellDepth: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Static Water Level (m)</Label>
                    <Input placeholder="Static level" value={dataCollection.waterSource.staticWaterLevel} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, staticWaterLevel: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Dynamic Water Level (m)</Label>
                    <Input placeholder="Dynamic level" value={dataCollection.waterSource.dynamicWaterLevel} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, dynamicWaterLevel: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Drawdown (m)</Label>
                    <Input placeholder="Dynamic - Static level" value={dataCollection.waterSource.drawdown} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, drawdown: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Recovery / Refill Time</Label>
                    <Input placeholder="e.g. 30 minutes" value={dataCollection.waterSource.recoveryTime} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, recoveryTime: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Well Yield / Discharge</Label>
                    <Input placeholder="e.g. 5.5 L/s" value={dataCollection.waterSource.wellYield} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, wellYield: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Seasonal Availability</Label>
                    <select value={dataCollection.waterSource.seasonalAvailability} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, seasonalAvailability: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Year-round">Year-round</option>
                      <option value="Dry season only">Dry season only</option>
                      <option value="Wet season only">Wet season only</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Reliability</Label>
                    <select value={dataCollection.waterSource.reliability} onChange={(e) => setDataCollection({...dataCollection, waterSource: {...dataCollection.waterSource, reliability: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Water quality */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">Water Quality Field Observation</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Water Colour</Label>
                    <select value={dataCollection.waterQuality.colour} onChange={(e) => setDataCollection({...dataCollection, waterQuality: {...dataCollection.waterQuality, colour: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Clear">Clear</option>
                      <option value="Brown">Brown</option>
                      <option value="Green">Green</option>
                      <option value="Black">Black</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Turbidity</Label>
                    <select value={dataCollection.waterQuality.turbidity} onChange={(e) => setDataCollection({...dataCollection, waterQuality: {...dataCollection.waterQuality, turbidity: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Clear">Clear</option>
                      <option value="Slightly muddy">Slightly muddy</option>
                      <option value="Very muddy">Very muddy</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Smell</Label>
                    <select value={dataCollection.waterQuality.smell} onChange={(e) => setDataCollection({...dataCollection, waterQuality: {...dataCollection.waterQuality, smell: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="No smell">No smell</option>
                      <option value="Bad smell">Bad smell</option>
                      <option value="Chemical smell">Chemical smell</option>
                    </select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="solarPv" className="space-y-4 pt-4 text-xs">
              {/* Solar resource */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">Solar Resource and PV Installation Area</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Irradiation (kWh/m²/day)</Label>
                    <Input placeholder="e.g. 5.8" value={dataCollection.solarResource.irradiation} onChange={(e) => setDataCollection({...dataCollection, solarResource: {...dataCollection.solarResource, irradiation: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Solar Exposure</Label>
                    <select value={dataCollection.solarResource.solarExposure} onChange={(e) => setDataCollection({...dataCollection, solarResource: {...dataCollection.solarResource, solarExposure: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Good">Good</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Shading Condition</Label>
                    <select value={dataCollection.solarResource.shadingCondition} onChange={(e) => setDataCollection({...dataCollection, solarResource: {...dataCollection.solarResource, shadingCondition: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="No shading">No shading</option>
                      <option value="Partial shading">Partial shading</option>
                      <option value="Heavy shading">Heavy shading</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Available Land for PV (m²)</Label>
                    <Input placeholder="e.g. 50" value={dataCollection.solarResource.availableLand} onChange={(e) => setDataCollection({...dataCollection, solarResource: {...dataCollection.solarResource, availableLand: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Land Use Rights</Label>
                    <select value={dataCollection.solarResource.landHolding} onChange={(e) => setDataCollection({...dataCollection, solarResource: {...dataCollection.solarResource, landHolding: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Beneficiary farmer">Beneficiary farmer</option>
                      <option value="Farmer group">Farmer group</option>
                      <option value="Community">Community</option>
                      <option value="Government">Government</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Flood Risk at PV Area</Label>
                    <select value={dataCollection.solarResource.floodRisk} onChange={(e) => setDataCollection({...dataCollection, solarResource: {...dataCollection.solarResource, floodRisk: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Proposed Solar Pump Equipment Specifications */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <h3 className="font-bold text-sm text-primary">Proposed Equipment & System Specifications</h3>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-medium">Auto-populated from Sizing</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Selected Pump Model</Label>
                    <Input placeholder="e.g. SP 5A-12" value={dataCollection.solarRequirement.proposedPumpCapacity} onChange={(e) => setDataCollection({...dataCollection, solarRequirement: {...dataCollection.solarRequirement, proposedPumpCapacity: e.target.value}})} className="bg-background border-border font-semibold text-primary" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Proposed PV Capacity</Label>
                    <Input placeholder="e.g. 3.2 kW" value={dataCollection.solarRequirement.proposedPvCapacity} onChange={(e) => setDataCollection({...dataCollection, solarRequirement: {...dataCollection.solarRequirement, proposedPvCapacity: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Total Pumping Head / Lift (m)</Label>
                    <Input placeholder="e.g. 45 m" value={dataCollection.solarRequirement.totalPumpingHead} onChange={(e) => setDataCollection({...dataCollection, solarRequirement: {...dataCollection.solarRequirement, totalPumpingHead: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Daily Water Demand (m³/day)</Label>
                    <Input placeholder="e.g. 20" value={dataCollection.solarRequirement.dailyWaterDemand} onChange={(e) => setDataCollection({...dataCollection, solarRequirement: {...dataCollection.solarRequirement, dailyWaterDemand: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Proposed Pump Type</Label>
                    <select value={dataCollection.solarRequirement.proposedPumpType} onChange={(e) => setDataCollection({...dataCollection, solarRequirement: {...dataCollection.solarRequirement, proposedPumpType: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="submersible pump">Submersible Pump</option>
                      <option value="surface pump">Surface / Centrifugal Pump</option>
                      <option value="solar direct pump">Solar Direct DC Pump</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Irrigation layout */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">Irrigation System Layout</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Distance Source to Field (m)</Label>
                    <Input placeholder="e.g. 150" value={dataCollection.irrigationLayout.distanceSourceToField} onChange={(e) => setDataCollection({...dataCollection, irrigationLayout: {...dataCollection.irrigationLayout, distanceSourceToField: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Elevation Difference (m)</Label>
                    <Input placeholder="e.g. 5" value={dataCollection.irrigationLayout.elevationDifference} onChange={(e) => setDataCollection({...dataCollection, irrigationLayout: {...dataCollection.irrigationLayout, elevationDifference: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Proposed Irrigation Method</Label>
                    <select value={dataCollection.irrigationLayout.proposedMethod} onChange={(e) => setDataCollection({...dataCollection, irrigationLayout: {...dataCollection.irrigationLayout, proposedMethod: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Drip">Drip</option>
                      <option value="Sprinkler">Sprinkler</option>
                      <option value="Furrow">Furrow</option>
                      <option value="Basin">Basin</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Storage Tank Needed</Label>
                    <select value={dataCollection.irrigationLayout.storageTankNeeded} onChange={(e) => setDataCollection({...dataCollection, irrigationLayout: {...dataCollection.irrigationLayout, storageTankNeeded: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Proposed Tank Capacity (L)</Label>
                    <Input placeholder="e.g. 10000" value={dataCollection.irrigationLayout.proposedTankCapacity} onChange={(e) => setDataCollection({...dataCollection, irrigationLayout: {...dataCollection.irrigationLayout, proposedTankCapacity: e.target.value}})} className="bg-background border-border" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="soilsOm" className="space-y-4 pt-4 text-xs">
              {/* Land, Soil and Crop */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">Land, Soil and Crop Information</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Total Irrigable Area (ha)</Label>
                    <Input placeholder="e.g. 2.5" value={dataCollection.cropSoil.totalIrrigableArea} onChange={(e) => setDataCollection({...dataCollection, cropSoil: {...dataCollection.cropSoil, totalIrrigableArea: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Avg Landholding (ha)</Label>
                    <Input placeholder="e.g. 0.5" value={dataCollection.cropSoil.avgLandholding} onChange={(e) => setDataCollection({...dataCollection, cropSoil: {...dataCollection.cropSoil, avgLandholding: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Soil Type</Label>
                    <select value={dataCollection.cropSoil.soilType} onChange={(e) => setDataCollection({...dataCollection, cropSoil: {...dataCollection.cropSoil, soilType: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Loam">Loam</option>
                      <option value="Sandy">Sandy</option>
                      <option value="Clay">Clay</option>
                      <option value="Black soil">Black soil</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Main Existing Crops</Label>
                    <Input placeholder="e.g. Maize, Onion" value={dataCollection.cropSoil.mainExistingCrops} onChange={(e) => setDataCollection({...dataCollection, cropSoil: {...dataCollection.cropSoil, mainExistingCrops: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Willingness for Solar Pump</Label>
                    <select value={dataCollection.institutionalReadiness.willingnessSolarPump} onChange={(e) => setDataCollection({...dataCollection, institutionalReadiness: {...dataCollection.institutionalReadiness, willingnessSolarPump: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Cash Contribution</Label>
                    <select value={dataCollection.institutionalReadiness.willingnessCash} onChange={(e) => setDataCollection({...dataCollection, institutionalReadiness: {...dataCollection.institutionalReadiness, willingnessCash: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Operation & Maintenance readiness */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">O&M Readiness</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Local Tech Available</Label>
                    <select value={dataCollection.operationReadiness.localTechnician} onChange={(e) => setDataCollection({...dataCollection, operationReadiness: {...dataCollection.operationReadiness, localTechnician: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Spare Parts Access</Label>
                    <select value={dataCollection.operationReadiness.sparePartsAccess} onChange={(e) => setDataCollection({...dataCollection, operationReadiness: {...dataCollection.operationReadiness, sparePartsAccess: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Difficult">Difficult</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Security Arrangement</Label>
                    <select value={dataCollection.operationReadiness.securityArrangement} onChange={(e) => setDataCollection({...dataCollection, operationReadiness: {...dataCollection.operationReadiness, securityArrangement: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="fence">Fence</option>
                      <option value="guard">Guard</option>
                      <option value="community">Community</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="feasibility" className="space-y-4 pt-4 text-xs">
              {/* Financial cost & market */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">Financial & Market Info</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Current Diesel Cost (ETB/mo)</Label>
                    <Input placeholder="e.g. 5000" value={dataCollection.financialMarket.currentDieselCost} onChange={(e) => setDataCollection({...dataCollection, financialMarket: {...dataCollection.financialMarket, currentDieselCost: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Current Maint Cost (ETB/mo)</Label>
                    <Input placeholder="e.g. 1500" value={dataCollection.financialMarket.currentMaintenanceCost} onChange={(e) => setDataCollection({...dataCollection, financialMarket: {...dataCollection.financialMarket, currentMaintenanceCost: e.target.value}})} className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Farmer Payment Cap (ETB)</Label>
                    <Input placeholder="e.g. 10000" value={dataCollection.financialMarket.farmerPaymentCapacity} onChange={(e) => setDataCollection({...dataCollection, financialMarket: {...dataCollection.financialMarket, farmerPaymentCapacity: e.target.value}})} className="bg-background border-border" />
                  </div>
                </div>
              </div>

              {/* Feasibility summary */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm border-b pb-1 text-primary">Overall Feasibility Rating Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold">Solar Rating</Label>
                    <select value={dataCollection.overallSummary.solarRating} onChange={(e) => setDataCollection({...dataCollection, overallSummary: {...dataCollection.overallSummary, solarRating: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Water Rating</Label>
                    <select value={dataCollection.overallSummary.waterRating} onChange={(e) => setDataCollection({...dataCollection, overallSummary: {...dataCollection.overallSummary, waterRating: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">IWUA Readiness</Label>
                    <select value={dataCollection.overallSummary.readinessRating} onChange={(e) => setDataCollection({...dataCollection, overallSummary: {...dataCollection.overallSummary, readinessRating: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold">Overall Site Suitability</Label>
                    <select value={dataCollection.overallSummary.overallSuitability} onChange={(e) => setDataCollection({...dataCollection, overallSummary: {...dataCollection.overallSummary, overallSuitability: e.target.value}})} className="flex h-9 w-full rounded border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none">
                      <option value="Highly suitable">Highly suitable</option>
                      <option value="Suitable">Suitable</option>
                      <option value="Moderately suitable">Moderately suitable</option>
                      <option value="Not suitable">Not suitable</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 pt-1">
                  <Label className="text-[10px] font-semibold">Short Site Summary Statement</Label>
                  <textarea
                    value={dataCollection.overallSummary.fieldSummaryText}
                    onChange={(e) => setDataCollection({...dataCollection, overallSummary: {...dataCollection.overallSummary, fieldSummaryText: e.target.value}})}
                    placeholder="Provide a final site assessment summary block..."
                    className="flex min-h-[60px] w-full rounded border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button onClick={() => setIsDataSheetOpen(false)} className="bg-primary font-semibold text-white">
              Save Data Collection Questionnaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientFileModal
        open={fileModalOpen}
        onOpenChange={setFileModalOpen}
        proposal={fileModalProposal}
      />
    </div>
  );
}
