import { useEffect, useState, useMemo, useRef } from "react";
import { Server, Users, FileText, BookOpen, RefreshCcw, DollarSign, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/StoreContext";
import { peachtreeDB } from "@/lib/db-service";
import { financeStore } from "@/lib/finance-hub-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Customer = {
  id: string;
  name: string;
  balance: number;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  city?: string;
  state?: string;
  zip?: string;
  creditLimit?: number;
};

type Vendor = {
  id: string;
  name: string;
  balance: number;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  city?: string;
  state?: string;
  zip?: string;
  creditLimit?: number;
};

type Invoice = {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate?: string;
  total: number;
  status: string;
  items?: any;
};

type JournalEntry = {
  id: string;
  date: string;
  description: string;
  amount: number;
  lines: any;
};

type SyncedData = {
  customers: Customer[];
  vendors: Vendor[];
  invoices: Invoice[];
  journalEntries: JournalEntry[];
};

export default function PeachtreePage() {
  const { financeEntity, financePayments, refreshStoreData } = useStore() as any;
  const [data, setData] = useState<SyncedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Transaction ID,Date,Entity Name,Amount,Type,Description\n" +
      "PT-INV-1001,2026-08-01,Gondar Agricultural Project,125000,Invoice,Solar Water Pump Installation 5.5kW\n" +
      "PT-INV-1002,2026-08-10,Bahir Dar Commercial Farm,48000,Invoice,Solar Inverter & PV Array Expansion";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "peachtree_sample_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample Peachtree template downloaded");
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await peachtreeDB.getSyncedData();
      if (response && response.success !== false) {
        setData(response);
      } else {
        setData({ customers: [], vendors: [], invoices: [], journalEntries: [] });
      }
    } catch {
      setData({ customers: [], vendors: [], invoices: [], journalEntries: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [financeEntity]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await peachtreeDB.upload(file, financeEntity);
      if (res.success) {
        if (res.duplicate) {
          toast.warning("This Peachtree export file was already imported previously.");
        } else {
          toast.success(`Successfully imported Peachtree export file: ${file.name}`);
          loadData();
        }
      } else if (res.offline) {
        toast.info("Offline: Peachtree import has been queued for background synchronization.");
      } else {
        toast.error(res.errorMessage || "Failed to import Peachtree file.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error uploading Peachtree export file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAutoFix = async () => {
    let fixCount = 0;
    try {
      for (const item of reconciliationItems) {
        if (item.status === "Discrepancy") {
          const payment = financePayments.find((p: any) => p.id === item.id);
          if (payment && item.peachtreeMatch) {
            const updated = {
              ...payment,
              amount: item.peachtreeMatch.total,
              note: `${payment.note || ""}\n[Reconciled: Adjusted amount to match Peachtree invoice total of ${item.peachtreeMatch.total}]`.trim()
            };
            await financeStore.savePayment(updated);
            fixCount++;
          }
        } else if (item.status === "Missing in Local Records") {
          const newPayment: any = {
            id: `PAY-SYNC-${item.ref}`,
            reference: item.ref,
            entityId: "C-SYNC",
            entityName: item.entityName,
            invoiceOrBillId: item.ref,
            amount: item.amount,
            method: "Bank Transfer",
            bankName: "Commercial Bank of Ethiopia",
            note: "Peachtree Sync Auto-generated payment record",
            date: item.date,
            type: "received"
          };
          await financeStore.savePayment(newPayment);
          fixCount++;
        }
      }
      
      if (fixCount > 0) {
        toast.success(`Successfully reconciled ${fixCount} ERP discrepancies with Peachtree!`);
        if (refreshStoreData) {
          await refreshStoreData();
        }
        await loadData();
      } else {
        toast.info("No discrepancies found to reconcile.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to auto-fix ERP discrepancies.");
    }
  };

  const reconciliationItems = useMemo(() => {
    if (!data) return [];

    const localItems = (financePayments || []).map((p: any) => {
      // Find matching invoice in Peachtree
      const match = data.invoices?.find(
        (inv) => 
          String(inv.id).toLowerCase() === String(p.reference || p.invoiceOrBillId || p.id).toLowerCase() ||
          (inv.customerName?.toLowerCase().includes(p.entityName?.toLowerCase()) && Math.abs(Number(inv.total) - Number(p.amount)) < 1.0)
      );

      return {
        id: p.id,
        source: "Local Records",
        ref: p.reference || p.invoiceOrBillId || p.id,
        date: p.date,
        entityName: p.entityName || "N/A",
        amount: Number(p.amount),
        peachtreeMatch: match ? { id: match.id, total: Number(match.total) } : null,
        status: match 
          ? (Math.abs(Number(match.total) - Number(p.amount)) < 0.01 ? "Balanced" : "Discrepancy")
          : "Missing in Peachtree"
      };
    });

    // Also look for Peachtree invoices not matched locally
    const peachtreeUnmatched = (data.invoices || [])
      .filter((inv) => {
        return !(financePayments || []).some(
          (p: any) => 
            String(inv.id).toLowerCase() === String(p.reference || p.invoiceOrBillId || p.id).toLowerCase() ||
            (inv.customerName?.toLowerCase().includes(p.entityName?.toLowerCase()) && Math.abs(Number(inv.total) - Number(p.amount)) < 1.0)
        );
      })
      .map((inv) => ({
        id: inv.id,
        source: "Peachtree Sync",
        ref: inv.id,
        date: inv.date,
        entityName: inv.customerName || inv.customerId || "N/A",
        amount: Number(inv.total),
        peachtreeMatch: null,
        status: "Missing in Local Records"
      }));

    return [...localItems, ...peachtreeUnmatched].sort((a, b) => b.date.localeCompare(a.date));
  }, [data, financePayments]);

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading">Peachtree Data</h1>
              <p className="text-sm text-muted-foreground">Live automated sync from Peachtree 2010</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {financeEntity}
          </Badge>
          <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
            <FileText className="mr-2 h-4 w-4" />
            Sample Template
          </Button>
          <Button variant="outline" size="sm" onClick={triggerFileInput} disabled={uploading}>
            <Upload className={`mr-2 h-4 w-4 ${uploading ? 'animate-pulse' : ''}`} />
            {uploading ? "Importing..." : "Manual Import"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.csv"
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {!data ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading synced data...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-[800px]">
            <TabsTrigger value="customers" className="flex gap-2"><Users className="h-4 w-4"/> Customers</TabsTrigger>
            <TabsTrigger value="vendors" className="flex gap-2"><DollarSign className="h-4 w-4"/> Vendors</TabsTrigger>
            <TabsTrigger value="invoices" className="flex gap-2"><FileText className="h-4 w-4"/> Invoices</TabsTrigger>
            <TabsTrigger value="journals" className="flex gap-2"><BookOpen className="h-4 w-4"/> Journals</TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex gap-2"><RefreshCcw className="h-4 w-4"/> Reconciliation</TabsTrigger>
          </TabsList>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Customers ({data.customers?.length || 0})</CardTitle>
                <CardDescription>Perfectly organized customer records from Peachtree.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Credit Limit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.customers?.length > 0 ? data.customers.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-xs">{c.id}</TableCell>
                          <TableCell className="font-semibold">{c.name}</TableCell>
                          <TableCell>{c.contact || "—"}</TableCell>
                          <TableCell>{c.phone || "—"}</TableCell>
                          <TableCell>{c.email || "—"}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{c.address || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {[c.city, c.state, c.zip].filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(c.creditLimit || 0)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatCurrency(c.balance)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No customers synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VENDORS TAB */}
          <TabsContent value="vendors" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendors ({data.vendors?.length || 0})</CardTitle>
                <CardDescription>Perfectly organized vendor records from Peachtree.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Credit Limit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.vendors?.length > 0 ? data.vendors.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium text-xs">{v.id}</TableCell>
                          <TableCell className="font-semibold">{v.name}</TableCell>
                          <TableCell>{v.contact || "—"}</TableCell>
                          <TableCell>{v.phone || "—"}</TableCell>
                          <TableCell>{v.email || "—"}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{v.address || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {[v.city, v.state, v.zip].filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(v.creditLimit || 0)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatCurrency(v.balance)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No vendors synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoices ({data.invoices?.length || 0})</CardTitle>
                <CardDescription>Recent invoices synced from Peachtree.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices?.length > 0 ? data.invoices.map(i => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-xs">{i.id}</TableCell>
                          <TableCell>{formatDate(i.date)}</TableCell>
                          <TableCell>{i.customerName || i.customerId || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{i.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(i.total)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No invoices synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* JOURNALS TAB */}
          <TabsContent value="journals" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Journal Entries ({data.journalEntries?.length || 0})</CardTitle>
                <CardDescription>Recent financial journal entries.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Entry ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.journalEntries?.length > 0 ? data.journalEntries.map(j => (
                        <TableRow key={j.id}>
                          <TableCell className="font-medium text-xs">{j.id}</TableCell>
                          <TableCell>{formatDate(j.date)}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{j.description || "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(j.amount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No journal entries synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RECONCILIATION COMPARISON TAB */}
          <TabsContent value="reconciliation" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Comparative Reconciliation Audit</CardTitle>
                  <CardDescription>
                    Reconcile local sales and customer payments against synced Peachtree invoices, automatically highlighting matches and identifying record discrepancies.
                  </CardDescription>
                </div>
                <Button 
                  className="bg-[#0b1324] hover:bg-slate-800 text-white font-semibold flex items-center gap-2 text-xs border border-white/10"
                  onClick={handleAutoFix}
                >
                  <RefreshCcw className="h-3.5 w-3.5 text-emerald-400" /> Auto-Fix ERP Discrepancies (Local Only)
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Summary Banner */}
                {(() => {
                  const balanced = reconciliationItems.filter(i => i.status === "Balanced").length;
                  const discrepancies = reconciliationItems.filter(i => i.status === "Discrepancy").length;
                  const missingPeachtree = reconciliationItems.filter(i => i.status === "Missing in Peachtree").length;
                  const missingLocal = reconciliationItems.filter(i => i.status === "Missing in Local Records").length;

                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Balanced Records</p>
                        <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{balanced}</p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-400">Discrepancies</p>
                        <p className="text-2xl font-black text-red-800 dark:text-red-300 mt-1">{discrepancies}</p>
                      </div>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Missing in Peachtree</p>
                        <p className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{missingPeachtree}</p>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">Missing locally</p>
                        <p className="text-2xl font-black text-blue-800 dark:text-blue-300 mt-1">{missingLocal}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Audit Comparison Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Ref ID</TableHead>
                        <TableHead>Customer/Entity</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Local Amount</TableHead>
                        <TableHead className="text-right">Peachtree Match</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationItems.map((item, idx) => (
                        <TableRow key={idx} className={
                          item.status === "Discrepancy" 
                            ? "bg-red-500/5 hover:bg-red-500/10" 
                            : item.status === "Balanced" 
                              ? "hover:bg-muted/5" 
                              : "bg-amber-500/[0.02] hover:bg-muted/5"
                        }>
                          <TableCell className="font-semibold text-xs">
                            <Badge variant={item.source === "Local Records" ? "default" : "secondary"}>
                              {item.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.ref}</TableCell>
                          <TableCell className="font-semibold text-sm">{item.entityName}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDate(item.date)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.source === "Local Records" ? formatCurrency(item.amount) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">
                            {item.peachtreeMatch 
                              ? `${item.peachtreeMatch.id} (${formatCurrency(item.peachtreeMatch.total)})`
                              : item.source === "Peachtree Sync" ? formatCurrency(item.amount) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              item.status === "Balanced" 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : item.status === "Discrepancy"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : item.status === "Missing in Peachtree"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                            }>
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {reconciliationItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            No reconciliation items found. Complete a POS sale or Peachtree sync first.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      )}
    </div>
  );
}
