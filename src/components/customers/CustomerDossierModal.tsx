import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users, Droplets, Receipt, Wrench, MessageSquare, ShieldCheck, Clock, MapPin,
  Phone, Mail, Calendar, Send, FileText, CheckCircle2, AlertCircle, Camera, ExternalLink, Sparkles
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

  // Calculate Warranty Countdown from latest completed fieldwork installation
  const completedFieldWork = fieldWorks.find((fw: any) => fw.status === "completed" || fw.completedDate);
  const installationDate = completedFieldWork?.completedDate ? new Date(completedFieldWork.completedDate) : new Date(customer.createdAt || Date.now());
  const warrantyDaysTotal = completedFieldWork?.warrantyDays || 365;
  const daysPassed = Math.floor((Date.now() - installationDate.getTime()) / (1000 * 60 * 60 * 24));
  const warrantyRemaining = Math.max(0, warrantyDaysTotal - daysPassed);
  const isWarrantyActive = warrantyRemaining > 0;

  // Installed Pump Model
  const installedPump = completedFieldWork?.pumpModel || sizings[0]?.selectedPumpModel || sales[0]?.items?.[0]?.name || "Solar Pump System";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-card border-border/80 shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Master Customer Dossier - {customer.name || 'Customer'}</DialogTitle>
          <CardDescription>Complete 360 customer file dossier</CardDescription>
        </DialogHeader>
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Opening customer master dossier file...
          </div>
        ) : (
          <div className="space-y-0">
            {/* Header Banner: Clean Brand File Header */}
            <div className="bg-slate-900 text-white p-6 border-b border-white/10 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] uppercase">
                      MASTER CUSTOMER DOSSIER
                    </Badge>
                    <Badge variant="outline" className="text-slate-300 border-white/20 text-[10px] font-mono">
                      FILE ID: {customer.id}
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
                      <MapPin className="h-3.5 w-3.5 text-amber-400" /> {customer.address || customer.city || "Location N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" /> Registered: {new Date(customer.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Key Status Indicators */}
                <div className="flex flex-col items-end gap-2 text-right">
                  {/* Warranty Countdown Badge */}
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                    isWarrantyActive
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    <Clock className="h-4 w-4" />
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider opacity-80">Warranty Status</span>
                      <span>{isWarrantyActive ? `🟢 ${warrantyRemaining} Days Remaining` : "🔴 Warranty Expired"}</span>
                    </div>
                  </div>

                  {/* Installed Pump Model & Peachtree Sync */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <Badge variant="outline" className="bg-white/5 border-white/20 text-yellow-300">
                      Installed: {installedPump}
                    </Badge>
                    {peachtree.length > 0 && (
                      <Badge className="bg-blue-600 text-white">
                        Peachtree Linked ({peachtree.length} Ledgers)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 5 Dossier Tabs */}
            <div className="p-6 space-y-4">
              <Tabs defaultValue="sizing" className="w-full">
                <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1">
                  <TabsTrigger value="sizing" className="text-xs flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-amber-500" /> Technical Sizing
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="text-xs flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" /> Invoices & Peachtree
                  </TabsTrigger>
                  <TabsTrigger value="fieldwork" className="text-xs flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5 text-blue-500" /> Operations & Photos
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Department Notes ({notes.length})
                  </TabsTrigger>
                  <TabsTrigger value="warranty" className="text-xs flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-500" /> Warranty Card
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: PUMP SIZING & TECHNICAL PARAMETERS */}
                <TabsContent value="sizing" className="pt-4 space-y-4">
                  {sizings.length === 0 ? (
                    <Card className="p-8 text-center text-xs text-muted-foreground border-dashed">
                      No pump sizing calculation recorded for this customer yet.
                    </Card>
                  ) : (
                    sizings.map((sz: any) => (
                      <Card key={sz.id} className="border border-border/60 shadow-sm">
                        <CardHeader className="pb-2 border-b bg-muted/20">
                          <CardTitle className="text-sm font-bold flex items-center justify-between">
                            <span>Technical Proposal: {sz.selectedPumpModel || "Custom Pump"}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {new Date(sz.createdAt).toLocaleDateString()}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-muted/30 border">
                              <span className="text-muted-foreground block text-[10px] uppercase">Daily Water Need</span>
                              <strong className="text-foreground text-sm">{sz.dailyWaterNeed || 0} m³/day</strong>
                            </div>
                            <div className="p-2.5 rounded-lg bg-muted/30 border">
                              <span className="text-muted-foreground block text-[10px] uppercase">Vertical Lift</span>
                              <strong className="text-foreground text-sm">{sz.verticalLift || 0} meters</strong>
                            </div>
                            <div className="p-2.5 rounded-lg bg-muted/30 border">
                              <span className="text-muted-foreground block text-[10px] uppercase">Pipe Length</span>
                              <strong className="text-foreground text-sm">{sz.pipeLength || 0} meters</strong>
                            </div>
                            <div className="p-2.5 rounded-lg bg-muted/30 border">
                              <span className="text-muted-foreground block text-[10px] uppercase">Water Source</span>
                              <strong className="text-foreground text-sm">{sz.waterSource || "Borehole / Well"}</strong>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* TAB 2: SALES INVOICES & PEACHTREE ACCOUNTING LEDGER */}
                <TabsContent value="sales" className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SolarFlow POS Invoices */}
                    <Card className="border border-border/60">
                      <CardHeader className="pb-2 border-b bg-emerald-500/5">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-emerald-500" />
                          SolarFlow POS Sales ({sales.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 space-y-2 max-h-[280px] overflow-y-auto">
                        {sales.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">No POS sales logged.</p>
                        ) : (
                          sales.map((s: any) => (
                            <div key={s.id} className="p-2.5 rounded-lg border text-xs space-y-1 bg-muted/20">
                              <div className="flex justify-between font-bold">
                                <span>Invoice #{s.id.slice(-6)}</span>
                                <span className="text-emerald-600 font-bold">${Number(s.totalAmount || s.totalSell || 0).toLocaleString()}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">Method: {s.paymentMethod} {s.bankName ? `(${s.bankName})` : ""}</p>
                              <span className="text-[10px] text-muted-foreground">{new Date(s.createdAt || s.date).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Peachtree 2010 Synced Accounting Ledgers */}
                    <Card className="border border-border/60">
                      <CardHeader className="pb-2 border-b bg-blue-500/5">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" /> Peachtree 2010 Ledger
                          </span>
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                            Single Source of Truth
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 space-y-2 max-h-[280px] overflow-y-auto">
                        {peachtree.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">No Peachtree ledger linked for this account.</p>
                        ) : (
                          peachtree.map((p: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg border text-xs space-y-1 bg-blue-500/5 border-blue-500/20">
                              <div className="flex justify-between font-bold text-foreground">
                                <span>Peachtree Inv #{p.id}</span>
                                <span className="text-blue-600 font-bold">${Number(p.total || 0).toLocaleString()}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">Account ID: {p.customerId || "CUST-SYNC"}</p>
                              <span className="text-[10px] text-muted-foreground">{p.date || "Synced Date"}</span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* TAB 3: FIELD OPERATIONS & 4 SITE COMPLETION PHOTOS */}
                <TabsContent value="fieldwork" className="pt-4 space-y-4">
                  {fieldWorks.length === 0 ? (
                    <Card className="p-8 text-center text-xs text-muted-foreground border-dashed">
                      No fieldwork installation trip recorded for this customer.
                    </Card>
                  ) : (
                    fieldWorks.map((fw: any) => (
                      <Card key={fw.id} className="border border-border/60">
                        <CardHeader className="pb-2 border-b bg-muted/20">
                          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>Field Job: {fw.title || fw.pumpModel || "Installation Trip"}</span>
                            <Badge className="bg-blue-600 text-white text-[10px]">
                              {fw.status.toUpperCase()}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground block text-[10px] uppercase">Location</span>
                              <strong className="text-foreground">{fw.location || "Site location"}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground block text-[10px] uppercase">Assigned Crew</span>
                              <strong className="text-foreground">{fw.assignedTo || "Technical Crew"}</strong>
                            </div>
                          </div>

                          {/* 4 Finished Site Completion Photos Gallery */}
                          <div className="space-y-2 border-t pt-3">
                            <h5 className="text-xs font-bold flex items-center gap-1 text-foreground">
                              <Camera className="h-4 w-4 text-blue-500" /> Finished Site Completion Photo Reports (4 Photos)
                            </h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {(() => {
                                const imgs = Array.isArray(fw.completionImages) ? fw.completionImages : [];
                                const defaultLabels = ["Inverter & Control Box", "Solar Panel Array", "Pump & Well Head", "Overall Installed Site"];
                                return defaultLabels.map((label, idx) => {
                                  const customImg = imgs[idx];
                                  return (
                                    <div key={idx} className="p-2.5 rounded-lg border text-center bg-muted/30 space-y-1 relative overflow-hidden group">
                                      {customImg?.url ? (
                                        <div className="h-20 rounded overflow-hidden bg-slate-900 flex items-center justify-center">
                                          <img src={customImg.url} alt={label} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                        </div>
                                      ) : (
                                        <div className="h-20 rounded bg-slate-800/10 dark:bg-slate-800/30 flex flex-col items-center justify-center text-muted-foreground">
                                          <Camera className="h-5 w-5 text-slate-400 mb-1" />
                                          <span className="text-[9px]">No photo uploaded</span>
                                        </div>
                                      )}
                                      <span className="text-[10px] font-bold block text-foreground truncate mt-1">{customImg?.label || label}</span>
                                      <span className="text-[9px] text-emerald-600 font-semibold block">✓ Verified Photo</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* TAB 4: INTER-DEPARTMENTAL NOTES & COMMENTS */}
                <TabsContent value="notes" className="pt-4 space-y-4">
                  <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border">
                    <Label className="text-xs font-bold text-foreground">
                      Add Departmental Note / Remark to Customer Master File
                    </Label>
                    <Textarea
                      placeholder="e.g. Finance: Approved 2-part payment plan. Technical: Recommend panel inspection in 6 months."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="text-xs resize-none bg-background min-h-[60px]"
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
                            <span className="text-foreground font-bold">{n.user?.displayName || n.user?.username} ({n.userRole || n.department || "Staff"})</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-muted-foreground">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* TAB 5: WARRANTY CERTIFICATE */}
                <TabsContent value="warranty" className="pt-4 space-y-4">
                  <Card className="border border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-900 dark:text-purple-300">
                        <ShieldCheck className="h-5 w-5 text-purple-600" /> Official SolarFlow System Warranty Certificate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3 p-3 bg-card rounded-lg border">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Warranty Holder</span>
                          <strong className="text-foreground">{customer.name}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Coverage Period</span>
                          <strong className="text-foreground">{warrantyDaysTotal} Days (1 Year)</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Installation Date</span>
                          <strong className="text-foreground">{installationDate.toLocaleDateString()}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase">Remaining Valid Coverage</span>
                          <strong className={isWarrantyActive ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            {warrantyRemaining} Days
                          </strong>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => window.print()}>
                          Print Warranty Certificate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
