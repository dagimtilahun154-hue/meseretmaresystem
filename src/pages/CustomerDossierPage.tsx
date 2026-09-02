import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users, Droplets, Receipt, Wrench, MessageSquare, ShieldCheck, Clock, MapPin,
  Phone, Mail, Calendar, Send, FileText, CheckCircle2, ArrowLeft, Printer, Camera,
  Sparkles, Download, ClipboardCheck, Truck, Eye, Layers, DollarSign, Activity, CheckCircle, Zap
} from "lucide-react";
import { customersDB } from "@/lib/db-service";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";
import { CompanyDocumentHeader } from "@/components/common/CompanyDocumentHeader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CustomerDossierPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const API_BASE = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://meseretmaresystem.onrender.com/api/v1" : "http://localhost:4000/api/v1")).replace("/api/v1", "");
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
        <p className="text-sm text-muted-foreground font-medium">Opening customer master dossier file...</p>
      </div>
    );
  }

  if (!loading && (!data || !data.customer)) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <p className="text-sm text-muted-foreground font-medium">Customer dossier not found or could not be loaded.</p>
        <Button onClick={() => navigate("/customers")} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Customers Registry
        </Button>
      </div>
    );
  }

  const customer = data?.customer || {};
  const sizings = data?.sizingHistory || [];
  const sales = data?.salesInvoices || [];
  const peachtree = data?.peachtreeRecords || [];
  const fieldWorks = data?.fieldWorkOperations || [];
  const fieldCashRequests = data?.fieldCashRequests || [];
  const notes = data?.notes || [];

  const completedFieldWork = fieldWorks.find((fw: any) => fw.status === "completed" || fw.completedDate || fw.status === "done");
  const installationDate = completedFieldWork?.completedDate ? new Date(completedFieldWork.completedDate) : new Date(customer.createdAt || Date.now());
  const warrantyDaysTotal = completedFieldWork?.warrantyDays || 365;
  const daysPassed = Math.floor((Date.now() - installationDate.getTime()) / (1000 * 60 * 60 * 24));
  const warrantyRemaining = Math.max(0, warrantyDaysTotal - daysPassed);
  const isWarrantyActive = warrantyRemaining > 0;
  const installedPump = completedFieldWork?.pumpModel || sizings[0]?.selectedPumpModel || sales[0]?.items?.[0]?.name || "Solar Pump System";

  // Financial Computations (from Peachtree Accounting sync and commercial invoices)
  const salesBilled = sales.reduce((acc: number, r: any) => acc + (Number(r.total || r.amount) || 0), 0);
  const peachtreeBilled = peachtree.reduce((acc: number, r: any) => acc + (Number(r.amount || r.totalAmount || r.total) || 0), 0);
  const totalBilled = Number(customer.totalBilled) || (salesBilled + peachtreeBilled) || Number(customer.balance || 0);
  
  const salesPaid = sales.filter((r: any) => String(r.status).toLowerCase() === "paid").reduce((acc: number, r: any) => acc + (Number(r.total || r.amount) || 0), 0);
  const peachtreePaid = peachtree.filter((r: any) => String(r.status).toUpperCase() === "PAID" || String(r.status).toUpperCase() === "COMPLETED")
    .reduce((acc: number, r: any) => acc + (Number(r.amount || r.totalAmount || r.total) || 0), 0);
  const totalPaid = Number(customer.totalReceived) || (salesPaid + peachtreePaid) || 0;
  
  const outstandingBalance = Number(customer.pendingReceivables) || (totalBilled > totalPaid ? totalBilled - totalPaid : Number(customer.balance || 0));
  const totalFieldCashRequested = fieldCashRequests.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Bar Navigation & Print Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Button variant="ghost" onClick={() => navigate("/customers")} className="gap-2 font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to Customers Registry
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} className="gap-2 bg-primary hover:bg-primary/90 text-white font-bold shadow-sm">
            <Printer className="h-4 w-4" /> Print / Export Master Dossier PDF
          </Button>
        </div>
      </div>

      {/* Sticky Quick Jump Navigation Bar (Web Screen Only) */}
      <div className="sticky top-2 z-20 bg-card/95 backdrop-blur-md border shadow-sm rounded-xl p-2 hidden sm:flex items-center justify-between gap-1 text-xs font-semibold overflow-x-auto print:hidden">
        <div className="flex items-center gap-1.5 shrink-0 px-2 text-muted-foreground font-bold uppercase text-[10px]">
          <Layers className="h-3.5 w-3.5 text-primary" /> Jump To:
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-profile")} className="h-7 text-xs font-semibold gap-1">
            <Users className="h-3 w-3 text-primary" /> Profile
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-sizing")} className="h-7 text-xs font-semibold gap-1">
            <Droplets className="h-3 w-3 text-sky-500" /> Sizing ({sizings.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-invoices")} className="h-7 text-xs font-semibold gap-1">
            <Receipt className="h-3 w-3 text-emerald-500" /> Invoices ({peachtree.length + sales.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-fieldwork")} className="h-7 text-xs font-semibold gap-1 text-amber-700 dark:text-amber-300">
            <Zap className="h-3 w-3 text-amber-500" /> Fieldwork & Cash ({fieldWorks.length + fieldCashRequests.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-assessment")} className="h-7 text-xs font-semibold gap-1">
            <ClipboardCheck className="h-3 w-3 text-indigo-500" /> Field Survey
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-media")} className="h-7 text-xs font-semibold gap-1">
            <Camera className="h-3 w-3 text-purple-500" /> Media & Photos
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-notes")} className="h-7 text-xs font-semibold gap-1">
            <MessageSquare className="h-3 w-3 text-blue-500" /> Notes ({notes.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection("sec-warranty")} className="h-7 text-xs font-semibold gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> Warranty
          </Button>
        </div>
      </div>

      {/* Main Single-Page Scrollable Master Container */}
      <div className="max-w-5xl mx-auto space-y-8 print:m-0 print:p-0 print:max-w-none print:space-y-6">
        
        {/* 1. Official Corporate Letterhead Header */}
        <CompanyDocumentHeader
          documentTitle="MASTER CLIENT INFORMATION & TECHNICAL DOSSIER"
          subtitle="Unified 360° Solar Water Pumping & Commercial Engineering File"
          refNumber={customer.id || `CUST-${customer.name?.replace(/\s+/g, "").slice(0, 4).toUpperCase()}`}
          date={new Date(customer.createdAt || Date.now()).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          statusBadge={isWarrantyActive ? "ACTIVE ACCOUNT & WARRANTY" : "OUT OF WARRANTY"}
          statusColor={isWarrantyActive ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}
          showContactBar={true}
        />

        {/* 2. Client Identity & Financial Summary Banner */}
        <Card className="overflow-hidden border shadow-md bg-card">
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge className="bg-primary text-primary-foreground font-black text-[10px] tracking-wider uppercase px-2 py-0.5">
                    CLIENT DOSSIER
                  </Badge>
                  {peachtree.length > 0 && sizings.length > 0 && (
                    <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/40 text-[10px] font-bold">
                      🌟 COMBINED MULTI-SERVICE CLIENT
                    </Badge>
                  )}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    ID: {customer.id}
                  </Badge>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {customer.name || "Customer Account"}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1.5">
                  {customer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" /> {customer.phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" /> {customer.email}
                    </span>
                  )}
                  {(customer.address || customer.city) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> {customer.address || customer.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Client Since: {new Date(customer.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Warranty Badge */}
              <div className="border p-4 rounded-xl space-y-1 bg-muted/20 min-w-[200px] shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Warranty Status
                  </span>
                  <Badge className={isWarrantyActive ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[10px]" : "bg-red-500/20 text-red-700 text-[10px]"}>
                    {isWarrantyActive ? "ACTIVE" : "EXPIRED"}
                  </Badge>
                </div>
                <div className="text-xl font-black text-foreground pt-1">
                  {isWarrantyActive ? `${warrantyRemaining} Days Remaining` : "Coverage Expired"}
                </div>
                <p className="text-[10px] text-muted-foreground">Pump: {installedPump}</p>
              </div>
            </div>

            {/* 4 KPI Financial Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div className="p-3.5 rounded-xl border bg-muted/15 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Billed</span>
                <span className="text-base sm:text-lg font-black text-foreground block truncate">
                  {totalBilled > 0 ? formatCurrency(totalBilled) : "ETB 0"}
                </span>
                <span className="text-[9px] text-muted-foreground block truncate">
                  {(sales.length + peachtree.length) > 0 ? `${sales.length + peachtree.length} Invoices` : "Peachtree Managed"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/15 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Received</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block truncate">
                  {formatCurrency(totalPaid)}
                </span>
                <span className="text-[9px] text-emerald-700 dark:text-emerald-400 block">Bank Payments</span>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/15 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pending Receivables</span>
                <span className={`text-base sm:text-lg font-black block truncate ${outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                  {formatCurrency(outstandingBalance)}
                </span>
                <span className="text-[9px] text-muted-foreground block">
                  {outstandingBalance > 0 ? "Pending Overdue Balance" : "Account Settled"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/15 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Engineering & Sites</span>
                <span className="text-base sm:text-lg font-black text-foreground block truncate">
                  {sizings.length} Sizing | {fieldWorks.length} Site(s)
                </span>
                <span className="text-[9px] text-muted-foreground block">
                  Site Operations
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* SECTION 1: CLIENT PROFILE & COMMERCIAL POSITION */}
        {/* ========================================================================= */}
        <div id="sec-profile" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center gap-2 border-b pb-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
              Section 1: Client KYC Profile & Commercial Summary
            </h3>
          </div>

          <Card className="p-5 border shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground uppercase font-bold text-[10px] block">Company / Full Name</span>
                <span className="font-bold text-sm text-foreground block">{customer.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">Taxpayer Identification (TIN): {customer.tin || "Not Registered"}</span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground uppercase font-bold text-[10px] block">Primary Phone & Email</span>
                <span className="font-bold text-foreground block">{customer.phone || "—"}</span>
                <span className="text-muted-foreground block">{customer.email || "—"}</span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground uppercase font-bold text-[10px] block">Installation Site Address</span>
                <span className="font-bold text-foreground block">{customer.address || customer.city || "Ethiopia"}</span>
                <span className="text-[10px] text-muted-foreground">Region: {customer.city || "Oromia / Amhara / SNNP / Tigray"}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: SOLAR PUMP HYDRAULIC SIZING & SYSTEM SPECS */}
        {/* ========================================================================= */}
        <div id="sec-sizing" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-sky-500" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                Section 2: Formulated Sizing Proposals & Hydraulic Specifications
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-bold font-mono">
              {sizings.length} Proposal(s) Logged
            </Badge>
          </div>

          {sizings.length === 0 ? (
            <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
              No solar pump sizing calculations have been formulated for this customer yet.
            </Card>
          ) : (
            <div className="space-y-4">
              {sizings.map((sz: any, idx: number) => {
                const parsedEquip = sz.calculatedEquipment ? 
                  (typeof sz.calculatedEquipment === "string" ? JSON.parse(sz.calculatedEquipment) : sz.calculatedEquipment) : [];

                return (
                  <Card key={sz.id || idx} className="p-5 border shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-foreground">Proposal #{sz.id?.substring(0, 8) || idx + 1}</span>
                          <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] font-bold">
                            {sz.status || "FORMULATED"}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Prepared by {sz.preparedByName || "Sales Engineer"} on {new Date(sz.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold">Estimated Cost</span>
                        <span className="font-mono text-base font-black text-primary">
                          {formatCurrency(sz.totalCost || sz.totalPrice || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Sizing Parameters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium bg-muted/15 p-4 rounded-xl border">
                      <div>
                        <span className="text-muted-foreground uppercase text-[10px] block">Selected Pump Model</span>
                        <strong className="text-primary font-bold text-sm block mt-0.5">{sz.selectedPumpModel || "Custom Submersible"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase text-[10px] block">Daily Water Demand</span>
                        <strong className="font-mono font-bold block mt-0.5">{sz.dailyWaterNeed || sz.headLift || 20} m³/day</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase text-[10px] block">Total Dynamic Head (TDH)</span>
                        <strong className="font-mono font-bold block mt-0.5">{sz.headLift || sz.verticalLift || 45} Meters</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground uppercase text-[10px] block">Solar Array Requirement</span>
                        <strong className="font-mono font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                          {sz.panelPower ? `${sz.panelPower}W Peak` : `${Math.ceil((sz.powerWatt || 1500) * 1.3)}W Peak`}
                        </strong>
                      </div>
                    </div>

                    {/* Itemized BOM Table */}
                    {parsedEquip.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" /> Itemized Bill of Materials (BOM)
                        </span>
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b">
                              <tr>
                                <th className="p-2.5">Item Description</th>
                                <th className="p-2.5">Category</th>
                                <th className="p-2.5 text-center">Qty</th>
                                <th className="p-2.5 text-right">Unit Price</th>
                                <th className="p-2.5 text-right">Total Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {parsedEquip.map((item: any, eIdx: number) => (
                                <tr key={eIdx} className="hover:bg-muted/15">
                                  <td className="p-2.5 font-semibold text-foreground">{item.name || item.productName || "Equipment Item"}</td>
                                  <td className="p-2.5 text-muted-foreground">{item.category || "Consumables"}</td>
                                  <td className="p-2.5 text-center font-mono font-bold">{item.qty || item.quantity || 1}</td>
                                  <td className="p-2.5 text-right font-mono text-muted-foreground">{formatCurrency(item.price || 0)}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatCurrency((item.qty || 1) * (item.price || 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: PEACHTREE & FINANCIAL INVOICES */}
        {/* ========================================================================= */}
        <div id="sec-invoices" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                Section 3: Peachtree Financial Invoices & Clear Bank Funds
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-bold font-mono">
              {peachtree.length + sales.length} Transaction(s)
            </Badge>
          </div>

          <Card className="p-5 border shadow-sm">
            {peachtree.length === 0 && sales.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No Peachtree accounting records or sales invoices found for this client account.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b">
                    <tr>
                      <th className="p-2.5">Invoice / Ref #</th>
                      <th className="p-2.5">Type & Source</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Amount Billed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {peachtree.map((rec: any, idx: number) => (
                      <tr key={`pt-${idx}`} className="hover:bg-muted/15">
                        <td className="p-2.5 font-mono font-bold text-foreground">{rec.reference || rec.invoiceNo || `PT-INV-${idx + 1}`}</td>
                        <td className="p-2.5 text-muted-foreground">Peachtree Accounting Record</td>
                        <td className="p-2.5 font-mono">{new Date(rec.date || rec.createdAt || Date.now()).toLocaleDateString()}</td>
                        <td className="p-2.5">
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold">
                            CLEARED
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(rec.amount || rec.totalAmount || 0)}
                        </td>
                      </tr>
                    ))}
                    {sales.map((s: any, idx: number) => (
                      <tr key={`sl-${idx}`} className="hover:bg-muted/15">
                        <td className="p-2.5 font-mono font-bold text-foreground">{s.invoiceNumber || `MM-SALE-${s.id?.substring(0, 6)}`}</td>
                        <td className="p-2.5 text-muted-foreground">SolarFlow Sales Order</td>
                        <td className="p-2.5 font-mono">{new Date(s.createdAt || Date.now()).toLocaleDateString()}</td>
                        <td className="p-2.5">
                          <Badge className={s.status === "PAID" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[9px] font-bold" : "bg-amber-500/10 text-amber-700 text-[9px] font-bold"}>
                            {s.status || "PENDING"}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-foreground">
                          {formatCurrency(s.totalAmount || s.amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: FIELDWORK OPERATIONS & ON-SITE EMERGENCY CASH LEDGER */}
        {/* ========================================================================= */}
        <div id="sec-fieldwork" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                Section 4: Fieldwork Operations & On-Site Cash Ledger
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold font-mono">
                {fieldCashRequests.length} Cash Request(s) • Total: {formatCurrency(totalFieldCashRequested)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fieldwork Jobs List */}
            <Card className="p-4 border shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
                <Wrench className="h-3.5 w-3.5 text-primary" /> Active & Completed Field Work Projects ({fieldWorks.length})
              </h4>
              {fieldWorks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No field work installation jobs registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {fieldWorks.map((fw: any, fIdx: number) => (
                    <div key={fw.id || fIdx} className="rounded-lg border bg-muted/10 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{fw.title || fw.pumpModel || "Fieldwork Job"}</span>
                        <Badge className="text-[9px] uppercase font-bold bg-primary/10 text-primary border-primary/20">
                          {fw.status || "IN-PROGRESS"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        <strong>Assigned TTL:</strong> {fw.assignedTo || "Technical Team Leader"} • <strong>Location:</strong> {fw.location || "Site"}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground font-mono">
                        <span>Duration: {fw.startDate || "Start"} → {fw.endDate || "End"}</span>
                        <span className="font-bold text-foreground">{fw.workers?.length || 0} Crew Members</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* On-Site Extra Cash Requisitions */}
            <Card className="p-4 border shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5 border-b pb-2">
                <Zap className="h-3.5 w-3.5 text-amber-600" /> On-Site Emergency Cash & Expense Trail ({fieldCashRequests.length})
              </h4>
              {fieldCashRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">No emergency extra cash requested during on-site execution.</p>
              ) : (
                <div className="space-y-2">
                  {fieldCashRequests.map((cr: any, cIdx: number) => {
                    const desc = typeof cr.description === "string" && cr.description.startsWith("{") ? JSON.parse(cr.description) : { text: cr.description };
                    return (
                      <div key={cr.id || cIdx} className="rounded-lg border bg-amber-500/5 border-amber-500/20 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{cr.title || desc.category || "Field Cash"}</span>
                          <span className="font-black font-mono text-amber-600">
                            {formatCurrency(Number(cr.amount || 0))}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">{desc.reason || desc.text || cr.description}</p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                          <span>Status: <strong className="uppercase text-amber-700 dark:text-amber-400">{cr.status || "PENDING"}</strong></span>
                          <span>{cr.createdAt ? new Date(cr.createdAt).toLocaleDateString() : "Recent"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5: SITE SURVEY & COMPREHENSIVE FIELD ASSESSMENT */}
        {/* ========================================================================= */}
        <div id="sec-assessment" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                Section 5: Field Survey & Comprehensive Site Assessment
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-bold">
              GPS Verified
            </Badge>
          </div>

          <Card className="p-5 border shadow-sm space-y-4">
            {(() => {
              const szWithDc = sizings.find((s: any) => s.id === selectedAssessmentId) || sizings[0];
              const dc = szWithDc?.dataCollection || {};

              return (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl border bg-muted/15 space-y-1">
                      <span className="text-muted-foreground uppercase font-bold text-[10px] block">Water Source Details</span>
                      <p><strong>Source Type:</strong> {dc.waterSource?.sourceType || "Borehole"}</p>
                      <p><strong>Total Well Depth:</strong> {dc.waterSource?.wellDepth ? `${dc.waterSource.wellDepth} m` : "—"}</p>
                      <p><strong>Static Water Level:</strong> {dc.waterSource?.staticWaterLevel ? `${dc.waterSource.staticWaterLevel} m` : "—"}</p>
                      <p><strong>Dynamic Water Level:</strong> {dc.waterSource?.dynamicWaterLevel ? `${dc.waterSource.dynamicWaterLevel} m` : "—"}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-muted/15 space-y-1">
                      <span className="text-muted-foreground uppercase font-bold text-[10px] block">Irrigation & Beneficiaries</span>
                      <p><strong>Irrigable Area:</strong> {dc.cropSoil?.totalIrrigableArea || dc.cropInformation?.totalIrrigableArea ? `${dc.cropSoil?.totalIrrigableArea || dc.cropInformation?.totalIrrigableArea} Hectares` : "—"}</p>
                      <p><strong>Main Crops:</strong> {dc.cropSoil?.mainExistingCrops || dc.cropInformation?.mainExistingCrops || "Vegetables & Cash Crops"}</p>
                      <p><strong>Total People Benefited:</strong> {dc.generalSite?.beneficiaries?.total ? `${dc.generalSite.beneficiaries.total} People` : "—"}</p>
                      <p><strong>Households:</strong> {dc.generalSite?.beneficiaries?.households || "—"}</p>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-muted/15 space-y-1">
                      <span className="text-muted-foreground uppercase font-bold text-[10px] block">Geo Coordinates & Climate</span>
                      <p><strong>GPS Latitude:</strong> {dc.generalSite?.latitude || customer.latitude || "8.9806° N"}</p>
                      <p><strong>GPS Longitude:</strong> {dc.generalSite?.longitude || customer.longitude || "38.7578° E"}</p>
                      <p><strong>Peak Sun Hours:</strong> 5.5 kWh/m²/day (Addis / Regional Solar Atlas)</p>
                      <p><strong>Site Accessibility:</strong> All-weather gravel road</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 6: SITE MEDIA & INSTALLATION PHOTOS */}
        {/* ========================================================================= */}
        <div id="sec-media" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-500" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                Section 6: Site Media & Completion Verification Photos
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-bold">
              Engineering Gallery
            </Badge>
          </div>

          <Card className="p-5 border shadow-sm">
            {(() => {
              const allPhotos: { url: string; caption: string }[] = [];
              fieldWorks.forEach((fw: any) => {
                if (Array.isArray(fw.payload?.completionPhotos)) {
                  fw.payload.completionPhotos.forEach((url: string, i: number) => {
                    allPhotos.push({ url, caption: `Field Installation Photo #${i + 1} (${fw.title || 'Work Order'})` });
                  });
                }
              });

              if (allPhotos.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground text-center py-6 border-dashed border-2 rounded-xl">
                    No field completion photos uploaded yet. When field teams submit installation evidence, photos will appear here.
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {allPhotos.map((photo, pIdx) => (
                    <div key={pIdx} className="space-y-1.5 border rounded-xl overflow-hidden bg-muted/10 p-2">
                      <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={getFullImgUrl(photo.url)}
                          alt={photo.caption}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{photo.caption}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 7: PERMANENT AUDIT LOGS & DOSSIER NOTES */}
        {/* ========================================================================= */}
        <div id="sec-notes" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                Section 7: Permanent Dossier Notes & Multi-Role Audit Logs
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-bold font-mono">
              {notes.length} Entry/Entries
            </Badge>
          </div>

          <Card className="p-5 border shadow-sm space-y-4">
            {/* Add note input (Web View Only) */}
            <div className="flex gap-2 print:hidden">
              <Input
                placeholder="Log a permanent note on this customer's master file (e.g. warranty service, client visit, payment commitment)..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={handleAddNote} disabled={submittingNote || !newNote.trim()} className="gap-1.5 font-bold shrink-0">
                <Send className="h-3.5 w-3.5" /> Save Note
              </Button>
            </div>

            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No notes logged on this dossier yet.</p>
            ) : (
              <div className="space-y-2.5">
                {notes.map((n: any, idx: number) => (
                  <div key={n.id || idx} className="p-3 rounded-xl border bg-muted/10 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="font-bold text-primary">{n.author || n.createdBy || "System Officer"}</span>
                      <span>{new Date(n.createdAt || Date.now()).toLocaleString()}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{n.content || n.text || n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 8: OFFICIAL SYSTEM WARRANTY CERTIFICATE */}
        {/* ========================================================================= */}
        <div id="sec-warranty" className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                Section 8: Official System Warranty & Service Terms
              </h3>
            </div>
            <Badge className="bg-emerald-600 text-white text-xs font-bold">
              Standard 1-Year Guarantee
            </Badge>
          </div>

          <Card className="p-6 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-emerald-500/20">
              <div>
                <h4 className="font-black text-base text-foreground">Meseret Mare Manufacturer & Installation Warranty</h4>
                <p className="text-xs text-muted-foreground">Certified under Meseret Mare Quality Assurance & Hydraulic Testing Standards</p>
              </div>
              <Badge className={isWarrantyActive ? "bg-emerald-600 text-white text-xs px-3 py-1 font-bold" : "bg-red-600 text-white text-xs px-3 py-1 font-bold"}>
                {isWarrantyActive ? `ACTIVE • ${warrantyRemaining} DAYS REMAINING` : "WARRANTY EXPIRED"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg border bg-background space-y-1">
                <span className="text-muted-foreground uppercase font-bold text-[10px] block">Covered Equipment</span>
                <p className="font-bold text-primary">{installedPump}</p>
                <p className="text-[10px] text-muted-foreground">Includes Submersible Pump, Inverter Controller & PV Array</p>
              </div>
              <div className="p-3 rounded-lg border bg-background space-y-1">
                <span className="text-muted-foreground uppercase font-bold text-[10px] block">Installation Date</span>
                <p className="font-mono font-bold text-foreground">{installationDate.toLocaleDateString()}</p>
                <p className="text-[10px] text-muted-foreground">Commissioned by Meseret Mare Field Engineers</p>
              </div>
              <div className="p-3 rounded-lg border bg-background space-y-1">
                <span className="text-muted-foreground uppercase font-bold text-[10px] block">Service Hotline</span>
                <p className="font-mono font-bold text-foreground">+251 91 151 4589</p>
                <p className="text-[10px] text-muted-foreground">24/7 Technical Response & Spare Parts Support</p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed italic border-t pt-3 border-emerald-500/20">
              * Warranty covers manufacturing defects, dry-run protection mechanism, and structural installation integrity. Regular borehole maintenance and silt cleaning recommended every 12 months.
            </p>
          </Card>
        </div>

        {/* Corporate Footer for Printed PDF Export */}
        <div className="pt-6 border-t text-center text-xs text-muted-foreground font-mono space-y-1">
          <p className="font-bold text-foreground">MESERET MARE SOLAR WATER SOLUTIONS • ADDIS ABABA, ETHIOPIA</p>
          <p className="text-[10px]">Document generated from Meseret Mare ERP System • Confidential Master Customer File</p>
        </div>

      </div>
    </div>
  );
}
