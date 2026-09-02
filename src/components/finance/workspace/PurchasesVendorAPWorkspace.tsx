import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign,
  Plus,
  Search,
  Download,
  Building2,
  Phone,
  MapPin,
  Eye,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  CreditCard,
  Truck,
} from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

interface PurchasesVendorAPWorkspaceProps {
  vendors?: any[];
  onRefresh?: () => void;
}

export function PurchasesVendorAPWorkspace({ vendors = [], onRefresh }: PurchasesVendorAPWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return (vendors || []).filter((v: any) => {
      return (
        String(v.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(v.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(v.contact || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [vendors, searchQuery]);

  // Compute AP KPIs strictly from live vendor data
  const totalAP = useMemo(() => {
    return (vendors || []).reduce((acc, v) => acc + (Number(v.balance) || 0), 0);
  }, [vendors]);

  const suppliersWithBalance = useMemo(() => {
    return (vendors || []).filter((v) => Number(v.balance) > 0).length;
  }, [vendors]);

  const totalCreditLimit = useMemo(() => {
    return (vendors || []).reduce((acc, v) => acc + (Number(v.creditLimit) || 0), 0);
  }, [vendors]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-inner">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black font-heading text-foreground">Purchases & Vendor Accounts Payable (AP)</h1>
              <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600">
                Trade Suppliers (21-x)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage equipment manufacturers, pump suppliers, import shipments, and trade liability schedules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (vendors.length === 0) {
                toast.info("No supplier records to export.");
                return;
              }
              toast.success("Exporting supplier AP schedule...");
            }}
            className="text-xs font-semibold h-8"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export AP Schedule
          </Button>

          <Button
            size="sm"
            onClick={() => toast.info("Record Bill Modal: Select vendor, enter bill reference & invoice amount.")}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Supplier Bill
          </Button>
        </div>
      </div>

      {/* 2. Top AP KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Outstanding AP */}
        <Card className="p-4 border border-border/70 bg-card rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Vendor Payables</span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
            {formatCurrency(totalAP)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Across All Trade Suppliers</p>
        </Card>

        {/* Active Trade Suppliers */}
        <Card className="p-4 border border-border/70 bg-card rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Suppliers</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-foreground font-mono mt-1">
            {vendors.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {suppliersWithBalance} with outstanding balances
          </p>
        </Card>

        {/* Available Supplier Credit */}
        <Card className="p-4 border border-border/70 bg-card rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Approved Credit</span>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {formatCurrency(totalCreditLimit)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Supplier Credit Facility</p>
        </Card>

        {/* Next Settlement Run */}
        <Card className="p-4 border border-border/70 bg-card rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Settlement Status</span>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-foreground font-mono mt-1">
            {totalAP > 0 ? "Bills Pending" : "All Clear"}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalAP > 0 ? "Payment approval required" : "0 pending vendor liabilities"}
          </p>
        </Card>
      </div>

      {/* 3. Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-card rounded-2xl border border-border/60 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search vendor name, supplier code, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border/60 text-xs h-8"
          />
        </div>

        <Badge variant="outline" className="text-xs font-mono">
          Showing {filteredVendors.length} Suppliers
        </Badge>
      </div>

      {/* 4. Vendor Directory Table */}
      <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Trade Suppliers & Creditors ({filteredVendors.length})</CardTitle>
              <CardDescription className="text-xs">
                Synchronized vendor ledger accounts and purchase liabilities.
              </CardDescription>
            </div>
            {onRefresh && (
              <Button size="sm" variant="ghost" onClick={onRefresh} className="h-7 text-xs font-semibold">
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur-sm">
                <TableRow className="border-b border-border/60">
                  <TableHead className="text-xs font-bold">Vendor ID</TableHead>
                  <TableHead className="text-xs font-bold">Supplier Name</TableHead>
                  <TableHead className="text-xs font-bold">Contact / Phone</TableHead>
                  <TableHead className="text-xs font-bold">Location / Address</TableHead>
                  <TableHead className="text-xs font-bold text-right">Credit Line</TableHead>
                  <TableHead className="text-xs font-bold text-right">Outstanding AP</TableHead>
                  <TableHead className="text-xs font-bold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length > 0 ? (
                  filteredVendors.map((v: any) => (
                    <TableRow
                      key={v.id}
                      className="hover:bg-muted/40 cursor-pointer border-b border-border/40 transition-colors"
                      onClick={() => setSelectedVendor(v)}
                    >
                      <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        {v.id}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-foreground">{v.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{v.contact || "—"}</div>
                        {v.phone && <span className="font-mono text-[10px]">{v.phone}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {[v.address, v.city].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(v.creditLimit || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(v.balance || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info(`Paying supplier ${v.name}...`);
                            }}
                          >
                            Pay Bill
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-14 text-muted-foreground">
                      <Truck className="h-8 w-8 mx-auto opacity-30 mb-2" />
                      <p className="text-xs font-bold text-foreground">No suppliers recorded</p>
                      <p className="text-[11px] opacity-70 mt-0.5">
                        Add trade suppliers or sync vendor accounts from Peachtree.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Authentic Peachtree Bills to Pay Schedule */}
      <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <CardTitle className="text-sm font-bold">Peachtree Authentic Bills to Pay Schedule</CardTitle>
                <CardDescription className="text-xs">
                  Aged vendor invoices and supplier payment maturities.
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-mono text-xs">
              Total Bills: {formatCurrency(2035865.72)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[360px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur-sm">
                <TableRow className="border-b border-border/60">
                  <TableHead className="text-xs font-bold">Vendor ID</TableHead>
                  <TableHead className="text-xs font-bold">Supplier Name</TableHead>
                  <TableHead className="text-xs font-bold">Bill / Invoice Ref</TableHead>
                  <TableHead className="text-xs font-bold">Due Date</TableHead>
                  <TableHead className="text-xs font-bold">Aging Status</TableHead>
                  <TableHead className="text-xs font-bold text-right">Amount Due (ETB)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { vendorId: "21-001", name: "Cashsuppliers", inv: "beg", dueDate: "7/8/2023", aging: ">90 Days Overdue", amount: 9299.96 },
                  { vendorId: "21-002", name: "Fasilzelalem", inv: "beg", dueDate: "7/8/2023", aging: ">90 Days Overdue", amount: 1774049.48 },
                  { vendorId: "21-003", name: "Leyikun", inv: "beg", dueDate: "7/8/2023", aging: "Supplier Credit", amount: -677499.86 },
                  { vendorId: "21-001", name: "Cashsuppliers", inv: "G2", dueDate: "3/1/2024", aging: ">90 Days Overdue", amount: 454082.40 },
                  { vendorId: "21-001", name: "Cashsuppliers", inv: "G1", dueDate: "3/9/2024", aging: ">90 Days Overdue", amount: 5151.75 },
                  { vendorId: "21-001", name: "Cashsuppliers", inv: "G3", dueDate: "4/8/2024", aging: ">90 Days Overdue", amount: 121982.34 },
                  { vendorId: "21-003", name: "Leyikun", inv: "GRN-0077", dueDate: "6/19/2024", aging: ">60 Days Overdue", amount: 348799.65 },
                ].map((bill, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/40 border-b border-border/40 text-xs">
                    <TableCell className="font-mono font-bold text-amber-600 dark:text-amber-400">{bill.vendorId}</TableCell>
                    <TableCell className="font-bold text-foreground">{bill.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground font-semibold">{bill.inv}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{bill.dueDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          bill.amount < 0
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        }`}
                      >
                        {bill.aging}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold ${bill.amount < 0 ? 'text-blue-600' : 'text-foreground'}`}>
                      {formatCurrency(bill.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
