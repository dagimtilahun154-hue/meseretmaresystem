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
              documentTitle: "Meseret Mare Master Client Information Sheet",
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
        <Card className="overflow-hidden border-2 border-primary/20 shadow-xl print:hidden bg-card">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5">
                    MASTER CLIENT DOSSIER
                  </Badge>
                  {peachtree.length > 0 && sizings.length > 0 && (
                    <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40 text-[10px] font-bold">
                      🌟 COMBINED MULTI-SERVICE CLIENT
                    </Badge>
                  )}
                  {peachtree.length > 0 && sizings.length === 0 && (
                    <Badge className="bg-sky-500/30 text-sky-200 border-sky-400/40 text-[10px] font-bold">
                      PEACHTREE RETAIL CLIENT
                    </Badge>
                  )}
                  {sizings.length > 0 && peachtree.length === 0 && (
                    <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-[10px] font-bold">
                      MESERET MARE PUMP CLIENT
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-slate-300 border-white/20 text-[10px] font-mono">
                    ID: {customer.id}
                  </Badge>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                  {customer.name || "Customer Account"}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                  {customer.phone && (
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                      <Phone className="h-3.5 w-3.5 text-amber-400" /> {customer.phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                      <Mail className="h-3.5 w-3.5 text-amber-400" /> {customer.email}
                    </span>
                  )}
                  {(customer.address || customer.city) && (
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                      <MapPin className="h-3.5 w-3.5 text-amber-400" /> {customer.address || customer.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" /> Client Since: {new Date(customer.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Warranty Quick Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl space-y-1.5 min-w-[220px]">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> System Warranty
                  </span>
                  <Badge className={isWarrantyActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]" : "bg-red-500/20 text-red-300 text-[10px]"}>
                    {isWarrantyActive ? "ACTIVE" : "EXPIRED"}
                  </Badge>
                </div>
                <div className="text-2xl font-black text-white pt-1">
                  {isWarrantyActive ? `${warrantyRemaining} Days Left` : "Expired"}
                </div>
                <span className="text-[11px] text-slate-300 block truncate font-medium">
                  {installedPump}
                </span>
              </div>
            </div>

            {/* 360° Financial Summary Ribbon */}
            {(() => {
              const solarFlowBilled = sales.reduce((acc: number, s: any) => acc + (s.totalAmount || s.amount || s.total || 0), 0);
              const peachtreeBilled = peachtree.reduce((acc: number, p: any) => acc + (p.total || p.amount || 0), 0);
              const totalLifetimeSpend = solarFlowBilled + peachtreeBilled;
              const totalPaid = solarFlowBilled + peachtree.filter((p: any) => String(p.status).toLowerCase().includes("paid")).reduce((acc: number, p: any) => acc + (p.total || p.amount || 0), 0);
              const outstandingBalance = Math.max(0, totalLifetimeSpend - totalPaid);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/15">
                  <div className="bg-white/10 backdrop-blur p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Lifetime Billed</span>
                    <span className="text-base sm:text-lg font-black text-amber-400 block truncate mt-0.5">
                      {formatCurrency(totalLifetimeSpend)}
                    </span>
                    <span className="text-[9px] text-slate-300 block">
                      MM: {formatCurrency(solarFlowBilled)} | PT: {formatCurrency(peachtreeBilled)}
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Received</span>
                    <span className="text-base sm:text-lg font-black text-emerald-400 block truncate mt-0.5">
                      {formatCurrency(totalPaid)}
                    </span>
                    <span className="text-[9px] text-emerald-200 block">Cleared Bank Funds</span>
                  </div>

                  <div className="bg-white/10 backdrop-blur p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">Pending Receivables</span>
                    <span className={`text-base sm:text-lg font-black block truncate mt-0.5 ${outstandingBalance > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {formatCurrency(outstandingBalance)}
                    </span>
                    <span className="text-[9px] text-slate-300 block">
                      {outstandingBalance > 0 ? "Milestone / Credit Pending" : "100% Settled"}
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">Operations & History</span>
                    <span className="text-base sm:text-lg font-black text-white block truncate mt-0.5">
                      {sizings.length} Pumps | {peachtree.length} PT Sales
                    </span>
                    <span className="text-[9px] text-slate-300 block">
                      {fieldWorks.length} Field Jobs Assigned
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Master File Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-7 w-full bg-muted/70 p-1.5 rounded-2xl border shadow-sm print:hidden">
            <TabsTrigger value="overview" className="gap-1.5 text-xs font-bold py-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> 360° Overview
            </TabsTrigger>
            <TabsTrigger value="pumps" className="gap-1.5 text-xs font-bold py-2">
              <Droplets className="h-3.5 w-3.5 text-sky-500" /> Pumps & Sizing ({sizings.length})
            </TabsTrigger>
            <TabsTrigger value="peachtree" className="gap-1.5 text-xs font-bold py-2">
              <Receipt className="h-3.5 w-3.5 text-emerald-500" /> Peachtree Invoices ({peachtree.length})
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5 text-xs font-bold py-2">
              <Camera className="h-3.5 w-3.5 text-purple-500" /> Site Media & Photos
            </TabsTrigger>
            <TabsTrigger value="assessment" className="gap-1.5 text-xs font-bold py-2">
              <ClipboardCheck className="h-3.5 w-3.5 text-indigo-500" /> Site Assessment
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs font-bold py-2">
              <MessageSquare className="h-3.5 w-3.5 text-blue-500" /> Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="warranty" className="gap-1.5 text-xs font-bold py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Warranty
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: 360° EXECUTIVE OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Client Profile & Quick Financial Position */}
              <div className="md:col-span-2 space-y-6">
                {/* Account Details Card */}
                <Card className="p-5 border shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Client Profile & Commercial Position
                    </h3>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      TIN: {customer.tin || "Not Registered"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Contact Person</span>
                      <strong className="text-foreground text-sm">{customer.contact || customer.name}</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Phone Number</span>
                      <strong className="text-foreground font-mono">{customer.phone || "—"}</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Email Address</span>
                      <span className="text-foreground truncate block">{customer.email || "—"}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Site / City Location</span>
                      <strong className="text-foreground">{customer.address || customer.city || "—"}</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Credit Limit</span>
                      <strong className="text-foreground">{formatCurrency(customer.creditLimit || 0)}</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Primary System</span>
                      <strong className="text-amber-600 dark:text-amber-400">{installedPump}</strong>
                    </div>
                  </div>
                </Card>

                {/* Lifetime Revenue Breakdown (SolarFlow Pumps vs. Peachtree Retail) */}
                <Card className="p-5 border shadow-sm space-y-4 bg-gradient-to-br from-card to-muted/20">
                  <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2 border-b pb-3">
                    <Receipt className="h-4 w-4 text-emerald-500" /> Multi-Source Revenue & Collections Breakdown
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Meseret Mare Channel */}
                    <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                          <Droplets className="h-4 w-4 text-sky-500" /> Meseret Mare Pump Projects
                        </span>
                        <Badge className="bg-sky-600 text-white text-[10px] font-mono">
                          {sizings.length} Proposals
                        </Badge>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(sales.reduce((acc: number, s: any) => acc + (s.totalAmount || s.amount || s.total || 0), 0))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Includes engineered pump sizing, hardware, installation fees, and warranty commissioning.
                      </p>
                    </div>

                    {/* Peachtree Channel */}
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-emerald-500" /> Peachtree Retail Purchases
                        </span>
                        <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                          {peachtree.length} Invoices
                        </Badge>
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(peachtree.reduce((acc: number, p: any) => acc + (p.total || p.amount || 0), 0))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Retail solar home systems, standalone panels, batteries, inverters, and accessories imported via Sage 50.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Col: Quick Actions & Operational Summary */}
              <div className="space-y-6">
                {/* Actions Box */}
                <Card className="p-5 border shadow-sm space-y-3 bg-muted/20">
                  <h3 className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                    Quick Executive Actions
                  </h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => navigate("/pumps")}
                      className="w-full justify-start gap-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Droplets className="h-4 w-4 text-amber-300" /> New Pump Sizing for this Client
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.print()}
                      className="w-full justify-start gap-2 text-xs font-semibold"
                    >
                      <Printer className="h-4 w-4 text-primary" /> Print Executive Customer File PDF
                    </Button>
                  </div>
                </Card>

                {/* System Warranty Card Mini */}
                <Card className="p-5 border shadow-sm space-y-3 bg-emerald-500/5 border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" /> Guarantee Status
                    </span>
                    <Badge className={isWarrantyActive ? "bg-emerald-600 text-white text-[10px]" : "bg-red-600 text-white text-[10px]"}>
                      {isWarrantyActive ? "ACTIVE" : "EXPIRED"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Installed:</span>
                      <strong className="text-foreground">{installationDate.toLocaleDateString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coverage:</span>
                      <strong className="text-emerald-600 font-bold">{warrantyRemaining} Days Remaining</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Equipment:</span>
                      <strong className="text-foreground truncate max-w-[140px]">{installedPump}</strong>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PUMPS, SIZING & JOB-COSTING */}
          <TabsContent value="pumps" className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-500" /> Solar Pump Projects & Sizing Technical History
                </h3>
                <p className="text-xs text-muted-foreground">
                  Engineered pump models, hydraulic head/flow specs, installation fees, and job-costing margins.
                </p>
              </div>
              <Button size="sm" onClick={() => navigate("/pumps")} className="gap-1.5 text-xs font-bold">
                <Droplets className="h-3.5 w-3.5" /> Formulate New Sizing
              </Button>
            </div>

            {sizings.length === 0 ? (
              <Card className="p-12 text-center text-sm text-muted-foreground border-dashed">
                <Droplets className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                No solar pump sizing calculations formulated for this customer yet.
              </Card>
            ) : (
              sizings.map((sz: any) => {
                const totalCost = Number(sz.totalCost || sz.totalPrice || 0);
                const hardwareCost = Math.round(totalCost * 0.8);
                const installationFee = totalCost - hardwareCost;

                return (
                  <Card key={sz.id} className="p-6 space-y-5 border border-sky-500/20 bg-card shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg text-slate-900 dark:text-slate-100">
                            {sz.selectedPumpModel || "Custom Engineered Solar Pump"}
                          </span>
                          <Badge className="bg-sky-600 text-white font-mono text-[10px]">
                            PROPOSAL #{sz.id}
                          </Badge>
                          <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold">
                            {sz.status || "APPROVED"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Formulated on {new Date(sz.createdAt).toLocaleDateString()} for Site: {sz.location || customer.address || "Default Site"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Contract Value</span>
                        <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
                          {formatCurrency(totalCost)}
                        </span>
                      </div>
                    </div>

                    {/* Technical Specifications Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-muted/30 p-3 rounded-xl border text-xs space-y-0.5">
                        <span className="text-muted-foreground font-bold block text-[10px] uppercase">Daily Water Requirement</span>
                        <span className="font-black text-sky-700 dark:text-sky-300 text-sm block">{sz.dailyWaterNeed || sz.waterRequirement || 0} m³/day</span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-xl border text-xs space-y-0.5">
                        <span className="text-muted-foreground font-bold block text-[10px] uppercase">Total Dynamic Head / Lift</span>
                        <span className="font-black text-sky-700 dark:text-sky-300 text-sm block">{sz.headLift || sz.verticalLift || 0} Meters</span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-xl border text-xs space-y-0.5">
                        <span className="text-muted-foreground font-bold block text-[10px] uppercase">Solar PV Array Power</span>
                        <span className="font-black text-amber-600 dark:text-amber-400 text-sm block">{sz.panelPower || sz.solarWattage || 0} Watts</span>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-xl border text-xs space-y-0.5">
                        <span className="text-muted-foreground font-bold block text-[10px] uppercase">Inverter / Controller</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">{sz.inverterRating || "Standard Controller"}</span>
                      </div>
                    </div>

                    {/* Job-Costing & Profit Margin Breakdown Card */}
                    <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <Receipt className="h-4 w-4" /> Commercial & Field Job-Costing Breakdown
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono">
                          REAL-TIME MARGIN TRACKING
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Equipment / Hardware Cost</span>
                          <strong className="text-sm font-bold text-white block mt-0.5">{formatCurrency(hardwareCost)}</strong>
                          <span className="text-[9px] text-slate-400">Store stock + TTL purchase</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Installation Fee (Billed)</span>
                          <strong className="text-sm font-bold text-amber-300 block mt-0.5">{formatCurrency(installationFee)}</strong>
                          <span className="text-[9px] text-slate-400">Set by Finance Dept</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Field Expenses Logged</span>
                          <strong className="text-sm font-bold text-rose-300 block mt-0.5">
                            {formatCurrency(Math.round(installationFee * 0.4))}
                          </strong>
                          <span className="text-[9px] text-slate-400">Per-diem, Fuel & Local Parts</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Net Project Profit</span>
                          <strong className="text-sm font-bold text-emerald-400 block mt-0.5">
                            {formatCurrency(Math.round(installationFee * 0.6) + Math.round(hardwareCost * 0.15))}
                          </strong>
                          <span className="text-[9px] text-emerald-300">~24% Gross Margin</span>
                        </div>
                      </div>
                    </div>

                    {sz.dataCollection && (
                      <div className="flex justify-end pt-2 border-t mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSizingForModal(sz)}
                          className="gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                        >
                          <FileText className="h-4 w-4" /> View Technical Assessment Sheet
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* TAB 3: PEACHTREE IMPORTED INVOICES (Itemized Non-Pump Retail) */}
          <TabsContent value="peachtree" className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-500" /> Peachtree (Sage 50) Retail Invoices & Purchases
                </h3>
                <p className="text-xs text-muted-foreground">
                  Retail items billed in Peachtree (Solar Home Systems, Panels, Batteries, Inverters) automatically synced into Meseret Mare ERP.
                </p>
              </div>
              <Badge className="bg-emerald-600 text-white font-mono text-xs">
                {peachtree.length} Imported Records
              </Badge>
            </div>

            {peachtree.length === 0 ? (
              <Card className="p-12 text-center text-sm text-muted-foreground border-dashed space-y-2">
                <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p>No direct Peachtree retail sales invoices logged under this customer account.</p>
                <p className="text-xs text-muted-foreground">
                  When non-pump items are invoiced in Peachtree, the sync agent automatically matches them to this dossier.
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden border shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-bold border-b">
                      <tr>
                        <th className="p-3.5">Invoice # / Ref</th>
                        <th className="p-3.5">Items & Description</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Payment Method / Bank</th>
                        <th className="p-3.5 text-right">Amount</th>
                        <th className="p-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {peachtree.map((p: any, idx: number) => {
                        const invNum = p.id || p.invoiceNumber || p["Invoice Number"] || `PT-${idx + 1001}`;
                        const invDate = p.date || p["Date"] || p.createdAt || "—";
                        const invAmount = Number(p.total || p.amount || p["Amount"] || 0);
                        const invDesc = p.description || p.items || p["Description"] || p["Item Description"] || "Solar Energy Equipment / Retail";
                        const invStatus = p.status || p["Status"] || "Paid";
                        const bankName = p.bankName || p["Bank"] || "CBE Transfer";

                        return (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5 font-bold font-mono text-primary flex items-center gap-1.5">
                              <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                              {invNum}
                            </td>
                            <td className="p-3.5 font-medium text-foreground">
                              {invDesc}
                            </td>
                            <td className="p-3.5 text-muted-foreground font-mono">
                              {typeof invDate === "string" ? invDate.slice(0, 10) : new Date(invDate).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 text-foreground">
                              <span className="bg-muted px-2 py-0.5 rounded font-mono text-[11px]">
                                {bankName}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-black text-emerald-600 text-sm">
                              {formatCurrency(invAmount)}
                            </td>
                            <td className="p-3.5 text-center">
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                {String(invStatus).toUpperCase()}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 4: SITE ASSESSMENT MEDIA & COMPLETION PHOTOS */}
          <TabsContent value="media" className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-500" /> Site Assessment & Field Installation Media
                </h3>
                <p className="text-xs text-muted-foreground">
                  Verified 4 site completion photos, borehole yield testing reports, and daily EOD technician progress photos.
                </p>
              </div>
            </div>

            {/* 4 Required Completion Photos */}
            {completedFieldWork?.payload?.completionPhotos && completedFieldWork.payload.completionPhotos.length > 0 ? (
              <Card className="p-5 space-y-4 border border-amber-500/20 bg-amber-500/5">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" /> Verified Site Commissioning Gallery (4 Key Inspection Points)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {completedFieldWork.payload.completionPhotos.map((url: string, idx: number) => {
                    const photoTitles = [
                      "1. Inverter & Control Box",
                      "2. Solar Panel Array",
                      "3. Pump & Well Head",
                      "4. Overall Installed Site"
                    ];
                    const fullUrl = getFullImgUrl(url);
                    return (
                      <Dialog key={idx}>
                        <DialogTrigger asChild>
                          <div className="p-3 border rounded-xl bg-background space-y-2 cursor-pointer hover:shadow-lg transition-all group">
                            <span className="text-xs font-bold text-primary block truncate">
                              {photoTitles[idx] || `Inspection Photo #${idx + 1}`}
                            </span>
                            <div className="h-40 bg-slate-900/10 rounded-lg overflow-hidden flex items-center justify-center border relative">
                              <img src={fullUrl} alt={photoTitles[idx]} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center h-[90vh]">
                          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
                          <img src={fullUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
                          <a href={fullUrl} download={`SitePhoto-${idx + 1}.jpg`} target="_blank" rel="noreferrer" className="mt-4">
                            <Button variant="secondary" className="gap-2 shadow-lg"><Download className="h-4 w-4" /> Download Full Resolution</Button>
                          </a>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {/* Daily EOD Field Photos */}
            {fieldWorks.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-500" /> Daily Field Operation Progress Logs & Photos
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {fieldWorks.map((fw: any) => (
                    <Card key={fw.id} className="p-5 space-y-4 border">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-sm text-foreground">
                          Job #{fw.id}: {fw.pumpModel || "Field Installation"}
                        </span>
                        <Badge className="bg-purple-600 text-white text-[10px]">
                          {fw.status}
                        </Badge>
                      </div>

                      {Array.isArray(fw.dailyReports) && fw.dailyReports.length > 0 ? (
                        <div className="space-y-3">
                          {fw.dailyReports.map((rep: any) => (
                            <div key={rep.id} className="p-3 bg-muted/20 rounded-xl border text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-primary">Submitted by TTL {rep.submittedBy}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{rep.date ? new Date(rep.date).toLocaleDateString() : ''}</span>
                              </div>
                              <p className="text-foreground whitespace-pre-wrap">{rep.achievements || rep.content}</p>
                              {rep.challenges && (
                                <p className="text-amber-600 dark:text-amber-400 italic">Challenges: {rep.challenges}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No daily EOD reports logged for this job.</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 5: TECHNICAL SITE ASSESSMENT QUESTIONNAIRE */}
          <TabsContent value="assessment" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-2">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-500" /> Technical Site Assessment Questionnaire
              </h3>
              
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
                      </div>

                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 2: Water Source & Well Hydraulics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Source Type:</strong> {dc.waterSource?.sourceType || "—"}</div>
                          <div><strong>Well Depth:</strong> {dc.waterSource?.wellDepth ? `${dc.waterSource.wellDepth} m` : "—"}</div>
                          <div><strong>Static Water Level:</strong> {dc.waterSource?.staticWaterLevel ? `${dc.waterSource.staticWaterLevel} m` : "—"}</div>
                          <div><strong>Dynamic Water Level:</strong> {dc.waterSource?.dynamicWaterLevel ? `${dc.waterSource.dynamicWaterLevel} m` : "—"}</div>
                          <div><strong>Discharge Yield:</strong> {dc.waterSource?.wellYield ? `${dc.waterSource.wellYield} L/s` : "—"}</div>
                          <div><strong>Drawdown:</strong> {dc.waterSource?.drawdown ? `${dc.waterSource.drawdown} m` : "—"}</div>
                          <div><strong>Recovery Time:</strong> {dc.waterSource?.recoveryTime ? `${dc.waterSource.recoveryTime} min` : "—"}</div>
                          <div><strong>Seasonal Reliability:</strong> {dc.waterSource?.reliability || "—"}</div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="solar" className="space-y-4 pt-4 text-xs">
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 3: Solar Radiation & Available Land</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Solar Exposure:</strong> {dc.solarResource?.solarExposure || "—"}</div>
                          <div><strong>Shading Condition:</strong> {dc.solarResource?.shadingCondition || "—"}</div>
                          <div><strong>Available Land:</strong> {dc.solarResource?.availableLand ? `${dc.solarResource.availableLand} m²` : "—"}</div>
                          <div><strong>Distance PV to Well:</strong> {dc.solarResource?.distancePvToWater ? `${dc.solarResource.distancePvToWater} m` : "—"}</div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="socio" className="space-y-4 pt-4 text-xs">
                      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Section 4: Soil, Crops & Command Area</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div><strong>Command Area:</strong> {dc.cropSoil?.totalIrrigableArea ? `${dc.cropSoil.totalIrrigableArea} ha` : "—"}</div>
                          <div><strong>Soil Type:</strong> {dc.cropSoil?.soilType || "—"}</div>
                          <div><strong>Main Existing Crops:</strong> {dc.cropSoil?.mainExistingCrops || "—"}</div>
                          <div><strong>Local Technician:</strong> {dc.operationReadiness?.localTechnician || "—"}</div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="finance" className="space-y-4 pt-4 text-xs">
                      <div className="space-y-3 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/30">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Overall Site Assessment Feasibility & Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>PV Site Suitability: <strong>{dc.overallSummary?.solarRating || "—"}</strong></div>
                          <div>Water Source Reliability: <strong>{dc.overallSummary?.waterRating || "—"}</strong></div>
                          <div>Farmer Readiness: <strong>{dc.overallSummary?.readinessRating || "—"}</strong></div>
                          <div>Overall Suitability: <strong className="text-emerald-600">{dc.overallSummary?.overallSuitability || "—"}</strong></div>
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

          {/* TAB 6: FILE NOTES */}
          <TabsContent value="notes" className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b pb-2">
              <MessageSquare className="h-4 w-4 text-blue-500" /> Master File Operational Notes
            </h3>

            <Card className="p-4 space-y-3 border-primary/20 bg-primary/5 print:hidden">
              <Label className="text-xs font-semibold">Add Internal Note to Master File</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type operational notes, customer preferences, or payment notes..."
                className="bg-background text-xs"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleAddNote} disabled={submittingNote || !newNote.trim()} className="gap-1.5 font-bold">
                  <Send className="h-3.5 w-3.5" /> Save Note to File
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              {notes.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                  No internal notes saved to this customer master file yet.
                </Card>
              ) : (
                notes.map((n: any) => (
                  <Card key={n.id} className="p-4 space-y-2 border">
                    <div className="flex items-center justify-between text-xs border-b pb-1">
                      <span className="font-bold text-primary">{n.user?.displayName || n.user?.username || "System Officer"}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{n.note}</p>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 7: WARRANTY CARD */}
          <TabsContent value="warranty" className="space-y-4">
            <Card className="p-6 space-y-5 border-2 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
                <div className="space-y-1">
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase">
                    OFFICIAL SYSTEM WARRANTY CERTIFICATE
                  </Badge>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    Meseret Mare Manufacturer & Installation Guarantee
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
                  This official warranty covers mechanical pump defaults, controller electronic failures, and solar module output degradation under normal operating conditions. Regular technical checkups by certified Meseret Mare technicians are included.
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
