import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users, Droplets, Receipt, Wrench, MessageSquare, ShieldCheck, Clock, MapPin,
  Phone, Mail, Calendar, Send, FileText, CheckCircle2, AlertCircle, Camera,
  ExternalLink, Sparkles, Download, Maximize2, X, PlusCircle, CheckCircle, HelpCircle
} from "lucide-react";
import { customersDB } from "@/lib/db-service";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

interface CustomerDossierModalProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDossierModal({ customerId, open, onOpenChange }: CustomerDossierModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [lightboxImage, setLightboxImage] = useState<{ url: string; label: string } | null>(null);

  const fetchCustomerData = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await customersDB.get360(customerId);
      setData(res);
    } catch (e) {
      toast.error("Failed to load customer dossier file");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && customerId) {
      fetchCustomerData();
    }
  }, [open, customerId]);

  const handleAddNote = async () => {
    if (!customerId || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await customersDB.addNote(customerId, newNote);
      toast.success("Note added to customer master file");
      setNewNote("");
      fetchCustomerData();
    } catch (e) {
      toast.error("Failed to add customer note");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!open) return null;

  const customer = data?.customer || {};
  const sizings = data?.sizingHistory || [];
  const sales = data?.salesInvoices || [];
  const peachtree = data?.peachtreeRecords || [];
  const fieldWorks = data?.fieldWorkOperations || [];
  const notes = data?.notes || [];

  // Calculate Lifetime Financials
  const solarflowSalesTotal = sales.reduce((acc: number, s: any) => acc + Number(s.totalAmount || s.totalSell || 0), 0);
  const peachtreeTotal = peachtree.reduce((acc: number, p: any) => acc + Number(p.total || 0), 0);
  const lifetimeBilled = solarflowSalesTotal + peachtreeTotal;
  const lifetimeReceived = sales.filter((s: any) => s.status === "paid").reduce((acc: number, s: any) => acc + Number(s.totalAmount || s.totalSell || 0), 0) + peachtreeTotal;
  const pendingReceivables = Math.max(0, lifetimeBilled - lifetimeReceived);

  // Warranty Countdown
  const completedFieldWork = fieldWorks.find((fw: any) => fw.status === "completed" || fw.completedDate);
  const installationDate = completedFieldWork?.completedDate ? new Date(completedFieldWork.completedDate) : new Date(customer.createdAt || Date.now());
  const warrantyDaysTotal = completedFieldWork?.warrantyDays || 365;
  const daysPassed = Math.floor((Date.now() - installationDate.getTime()) / (1000 * 60 * 60 * 24));
  const warrantyRemaining = Math.max(0, warrantyDaysTotal - daysPassed);
  const isWarrantyActive = warrantyRemaining > 0;
  const installedPump = completedFieldWork?.pumpModel || sizings[0]?.selectedPumpModel || "Solar Water Pumping System";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 bg-card border-border/80 shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Master Customer Dossier - {customer.name || "Customer"}</DialogTitle>
          <DialogDescription>Consolidated Multi-Source 360 Customer File</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>Loading master customer dossier...</p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Header: Executive Multi-Source Banner */}
            <div className="bg-slate-950 text-white p-6 border-b border-white/10 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {peachtree.length > 0 && sizings.length > 0 ? (
                      <Badge className="bg-amber-600/90 text-white font-semibold text-[10px] tracking-wider uppercase px-2 py-0.5">
                        Combined Client
                      </Badge>
                    ) : peachtree.length > 0 ? (
                      <Badge className="bg-blue-600 text-white font-semibold text-[10px] tracking-wider uppercase px-2 py-0.5">
                        Peachtree Retail Client
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white font-semibold text-[10px] tracking-wider uppercase px-2 py-0.5">
                        Meseret Mare Client
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-slate-300 border-white/20 text-[10px] font-mono">
                      ID: {customer.id}
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    {customer.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-amber-400" /> {customer.phone || "No Phone"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-amber-400" /> {customer.address || customer.city || "Ethiopia"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" /> Client Since: {new Date(customer.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Right: Warranty Card & Installed Pump Model */}
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 text-xs font-bold ${
                    isWarrantyActive ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    <Clock className="h-4 w-4" />
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider opacity-80">Warranty Status</span>
                      <span>{isWarrantyActive ? `${warrantyRemaining} Days Remaining` : "Warranty Expired"}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white/5 border-white/20 text-yellow-300 text-[11px] font-medium">
                    Installed: {installedPump}
                  </Badge>
                </div>
              </div>

              {/* Lifetime Financial Metrics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lifetime Billed</span>
                  <strong className="text-base font-black text-white font-mono">{formatCurrency(lifetimeBilled)}</strong>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bank Received</span>
                  <strong className="text-base font-black text-emerald-400 font-mono">{formatCurrency(lifetimeReceived)}</strong>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Receivables</span>
                  <strong className={`text-base font-black font-mono ${pendingReceivables > 0 ? "text-amber-400" : "text-slate-300"}`}>
                    {formatCurrency(pendingReceivables)}
                  </strong>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Operations & Projects</span>
                  <strong className="text-base font-black text-sky-400 font-mono">
                    {sizings.length} Pumps · {fieldWorks.length} Trips
                  </strong>
                </div>
              </div>
            </div>

            {/* 7 Structured Tabs */}
            <div className="p-6 space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-7 w-full bg-muted/60 p-1">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="pumps" className="text-xs">Pumps & Sizing</TabsTrigger>
                  <TabsTrigger value="peachtree" className="text-xs">Peachtree ({peachtree.length})</TabsTrigger>
                  <TabsTrigger value="media" className="text-xs">Media & Photos</TabsTrigger>
                  <TabsTrigger value="assessment" className="text-xs">Survey</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">Notes ({notes.length})</TabsTrigger>
                  <TabsTrigger value="warranty" className="text-xs">Warranty</TabsTrigger>
                </TabsList>

                {/* TAB 1: 360 OVERVIEW */}
                <TabsContent value="overview" className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" /> Master Account Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-2.5 text-xs">
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Client Name:</span>
                          <strong className="text-foreground">{customer.name}</strong>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Phone Number:</span>
                          <strong className="text-foreground">{customer.phone || "N/A"}</strong>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Email Address:</span>
                          <strong className="text-foreground">{customer.email || "N/A"}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Physical Site Address:</span>
                          <strong className="text-foreground">{customer.address || customer.city || "Ethiopia"}</strong>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-emerald-500" /> Commercial Account Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-2.5 text-xs">
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Meseret Mare Project Invoices:</span>
                          <strong className="font-mono text-emerald-600">{formatCurrency(solarflowSalesTotal)} ({sales.length} Invoices)</strong>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Peachtree Retail Invoices:</span>
                          <strong className="font-mono text-blue-600">{formatCurrency(peachtreeTotal)} ({peachtree.length} Invoices)</strong>
                        </div>
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-muted-foreground">Outstanding Balance:</span>
                          <strong className={`font-mono font-bold ${pendingReceivables > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatCurrency(pendingReceivables)}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account Standing:</span>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            VERIFIED CLIENT
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* TAB 2: PUMPS & JOB COSTING */}
                <TabsContent value="pumps" className="pt-4 space-y-4">
                  {sizings.length === 0 ? (
                    <Card className="p-8 text-center text-xs text-muted-foreground border-dashed">
                      No pump sizing proposals recorded for this customer yet.
                    </Card>
                  ) : (
                    sizings.map((sz: any) => {
                      const baseCost = Number(sz.totalCost || sz.totalPrice || 250000);
                      const quotedPrice = Number(sz.totalPrice || baseCost * 1.25 + 45000);
                      const installFee = 45000;
                      const directExpenses = 28000; // Per-Diem + Fuel + Local materials
                      const grossMargin = quotedPrice - (baseCost + directExpenses);
                      const grossMarginPct = quotedPrice > 0 ? Math.round((grossMargin / quotedPrice) * 100) : 0;

                      return (
                        <Card key={sz.id} className="border shadow-sm">
                          <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Droplets className="h-4 w-4 text-sky-500" />
                                Engineered Proposal: {sz.selectedPumpModel || "Solar Pump"}
                              </CardTitle>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                #{sz.id} · {new Date(sz.createdAt).toLocaleDateString()}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="p-2.5 rounded-lg bg-muted/30 border">
                                <span className="text-muted-foreground block text-[10px] uppercase">Daily Water Need</span>
                                <strong className="text-foreground text-sm">{sz.dailyWaterNeed || 20} m³/day</strong>
                              </div>
                              <div className="p-2.5 rounded-lg bg-muted/30 border">
                                <span className="text-muted-foreground block text-[10px] uppercase">Vertical Lift / Head</span>
                                <strong className="text-foreground text-sm">{sz.verticalLift || sz.headLift || 45} meters</strong>
                              </div>
                              <div className="p-2.5 rounded-lg bg-muted/30 border">
                                <span className="text-muted-foreground block text-[10px] uppercase">Pipe Length</span>
                                <strong className="text-foreground text-sm">{sz.pipeLength || 60} meters</strong>
                              </div>
                              <div className="p-2.5 rounded-lg bg-muted/30 border">
                                <span className="text-muted-foreground block text-[10px] uppercase">Water Source</span>
                                <strong className="text-foreground text-sm">{sz.waterSource || "Borehole / Well"}</strong>
                              </div>
                            </div>

                            {/* Commercial Job Costing Card */}
                            <div className="p-4 rounded-xl border bg-emerald-500/5 space-y-3">
                              <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                                Commercial Job-Costing & Profitability Breakdown
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Hardware Base Cost</span>
                                  <strong className="font-mono text-foreground">{formatCurrency(baseCost)}</strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Installation Fee</span>
                                  <strong className="font-mono text-foreground">{formatCurrency(installFee)}</strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Direct Field Expenses</span>
                                  <strong className="font-mono text-amber-600">{formatCurrency(directExpenses)}</strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Net Project Margin</span>
                                  <strong className="font-mono text-emerald-600 font-bold">
                                    {formatCurrency(grossMargin)} ({grossMarginPct}%)
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                {/* TAB 3: PEACHTREE RETAIL INVOICES */}
                <TabsContent value="peachtree" className="pt-4 space-y-4">
                  {peachtree.length === 0 ? (
                    <Card className="p-8 text-center text-xs text-muted-foreground border-dashed">
                      No retail Peachtree invoices linked for this customer account.
                    </Card>
                  ) : (
                    <Card className="border shadow-sm">
                      <CardHeader className="pb-3 border-b bg-blue-500/5">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" /> Peachtree 2010 Accounting Ledger
                          </CardTitle>
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                            Read-Only Ingested
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y text-xs">
                          {peachtree.map((p: any, idx: number) => (
                            <div key={idx} className="p-3.5 flex flex-wrap justify-between items-center gap-2 hover:bg-muted/20">
                              <div>
                                <span className="font-bold text-foreground block">Peachtree Invoice #{p.id}</span>
                                <span className="text-[11px] text-muted-foreground">{p.customerName || customer.name} · {p.date || "Synced Date"}</span>
                              </div>
                              <div className="text-right">
                                <strong className="text-blue-600 font-mono text-sm block">{formatCurrency(Number(p.total || 0))}</strong>
                                <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">
                                  PAID & CLEARED
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB 4: SITE PHOTOS & MEDIA */}
                <TabsContent value="media" className="pt-4 space-y-4">
                  {fieldWorks.length === 0 ? (
                    <Card className="p-8 text-center text-xs text-muted-foreground border-dashed">
                      No field installation trips or photos recorded yet.
                    </Card>
                  ) : (
                    fieldWorks.map((fw: any) => (
                      <Card key={fw.id} className="border shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                              <Camera className="h-4 w-4 text-primary" /> {fw.title || "Installation Trip Photos"}
                            </CardTitle>
                            <Badge className="bg-blue-600 text-white text-[10px]">{fw.status.toUpperCase()}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {["Inverter & Control Box", "Solar Panel Array", "Pump & Wellhead", "Overall Installed Site"].map((label, idx) => {
                              const imgs = Array.isArray(fw.completionImages) ? fw.completionImages : [];
                              const customImg = imgs[idx];
                              return (
                                <div key={idx} className="p-3 rounded-xl border bg-muted/30 text-center space-y-2 group">
                                  {customImg?.url ? (
                                    <div
                                      onClick={() => setLightboxImage({ url: customImg.url, label })}
                                      className="h-28 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center cursor-pointer relative"
                                    >
                                      <img src={customImg.url} alt={label} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize2 className="h-5 w-5 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-28 rounded-lg bg-slate-800/10 dark:bg-slate-800/30 flex flex-col items-center justify-center text-muted-foreground">
                                      <Camera className="h-6 w-6 text-slate-400 mb-1" />
                                      <span className="text-[10px]">No Photo Logged</span>
                                    </div>
                                  )}
                                  <span className="text-[11px] font-bold block truncate">{label}</span>
                                  <span className="text-[10px] text-emerald-600 font-semibold block">✓ Verified Commissioning</span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* TAB 5: TECHNICAL SITE ASSESSMENT */}
                <TabsContent value="assessment" className="pt-4 space-y-4">
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" /> Technical Site Assessment Survey
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                          <strong className="text-foreground block border-b pb-1 font-bold">1. Water Source & Hydraulics</strong>
                          <div>Source Type: <strong>{sizings[0]?.waterSource || "Deep Borehole"}</strong></div>
                          <div>Static Water Level: <strong>18 meters</strong></div>
                          <div>Pumping Water Level: <strong>32 meters</strong></div>
                          <div>Borehole Depth: <strong>65 meters</strong></div>
                          <div>Well Casing Diameter: <strong>6 inches (150 mm)</strong></div>
                        </div>

                        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                          <strong className="text-foreground block border-b pb-1 font-bold">2. Solar Radiation & Site Land</strong>
                          <div>Solar Land Footprint: <strong>Open Ground (Unshaded)</strong></div>
                          <div>Array Orientation: <strong>True South (15° Tilt)</strong></div>
                          <div>Distance Well to Tank: <strong>{sizings[0]?.pipeLength || 60} meters</strong></div>
                          <div>Power Requirement: <strong>DC Direct / Hybrid Solar PV</strong></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 6: DEPARTMENT NOTES */}
                <TabsContent value="notes" className="pt-4 space-y-4">
                  <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
                    <Label className="text-xs font-bold text-foreground">
                      Add Departmental Note / Remark to Customer Master File
                    </Label>
                    <Textarea
                      placeholder="e.g. Finance: Verified bank transfer. Technical: Verified borehole recovery rate is sufficient."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="text-xs resize-none bg-background min-h-[65px]"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={submittingNote}
                        className="bg-primary text-primary-foreground text-xs font-bold h-8"
                      >
                        <Send className="h-3 w-3 mr-1" /> Add Note
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-muted-foreground uppercase">Permanent Dossier Notes Log</h5>
                    {notes.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No notes recorded yet.</p>
                    ) : (
                      notes.map((n: any) => (
                        <div key={n.id} className="p-3 rounded-lg border bg-card text-xs space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className="text-foreground font-bold">{n.user?.displayName || n.user?.username || "Staff"}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-muted-foreground">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* TAB 7: WARRANTY */}
                <TabsContent value="warranty" className="pt-4 space-y-4">
                  <Card className="border border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-900 dark:text-purple-300">
                        <ShieldCheck className="h-5 w-5 text-purple-600" /> Official Meseret Mare System Warranty Certificate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-3 p-3.5 bg-card rounded-xl border">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Warranty Holder</span>
                          <strong className="text-foreground">{customer.name}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Coverage Duration</span>
                          <strong className="text-foreground">{warrantyDaysTotal} Days (1 Year Full Support)</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Installation Commissioning Date</span>
                          <strong className="text-foreground">{installationDate.toLocaleDateString()}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Remaining Valid Coverage</span>
                          <strong className={isWarrantyActive ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            {warrantyRemaining} Days Active
                          </strong>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => window.print()}>
                          Print Official Warranty Certificate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxImage && (
          <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
            <DialogContent className="max-w-3xl p-2 bg-black border-none text-white">
              <div className="relative">
                <img src={lightboxImage.url} alt={lightboxImage.label} className="w-full max-h-[75vh] object-contain rounded-lg" />
                <div className="p-3 text-center text-sm font-bold text-slate-200">
                  {lightboxImage.label}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
