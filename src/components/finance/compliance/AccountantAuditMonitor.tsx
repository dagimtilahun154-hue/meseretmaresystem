import React, { useMemo } from "react";
import {
  HardDrive,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCcw,
  Activity,
  Receipt,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/data";
import { toast } from "sonner";

export interface BacklogItem {
  id: string;
  source: "POS Sale" | "Pump Sizing Proposal" | "Per Diem Payment" | "TTL Cash Release" | "Manual Payment";
  refNumber: string;
  date: string;
  entityName: string;
  amount: number;
  status: "pending_peachtree_entry" | "synced_and_balanced" | "amount_mismatch";
  peachtreeRef?: string;
}

interface AccountantAuditMonitorProps {
  syncAgentStatus?: "online" | "idle" | "offline";
  lastSyncTime?: string;
  dailyVelocity?: {
    invoicesCount: number;
    billsCount: number;
    paymentsCount: number;
    journalsCount: number;
  };
  backlogItems?: BacklogItem[];
  vaultInfo?: {
    databaseSource: string;
    totalCustomers: number;
    totalInvoices: number;
    totalVendors: number;
    lastBackupDate: string;
    vaultSize?: string;
  };
  onRefreshSync?: () => void;
}

export function AccountantAuditMonitor({
  syncAgentStatus = "online",
  lastSyncTime = new Date().toISOString(),
  dailyVelocity = {
    invoicesCount: 18,
    billsCount: 4,
    paymentsCount: 12,
    journalsCount: 6,
  },
  backlogItems = [],
  vaultInfo,
  onRefreshSync,
}: AccountantAuditMonitorProps) {
  const handleDownloadCloudBackup = () => {
    toast.success("Initiating Peachtree Database Cloud Backup Archive Download...", {
      description: "Direct export of all synchronized database customers, vendors, invoices & ledger entries.",
    });
    const API_BASE =
      import.meta.env.VITE_API_URL ||
      (import.meta.env.PROD
        ? "https://meseretmaresystem.onrender.com/api/v1"
        : "http://localhost:4000/api/v1");
    const link = document.createElement("a");
    link.href = `${API_BASE}/sync/peachtree/vault/download`;
    link.setAttribute(
      "download",
      `Meseret_Mare_Peachtree_Database_Vault_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate sync lag in minutes
  const syncLagMinutes = useMemo(() => {
    if (!lastSyncTime) return 0;
    const diff = (Date.now() - new Date(lastSyncTime).getTime()) / 60000;
    return Math.max(0, Math.round(diff));
  }, [lastSyncTime]);

  const isLagging = syncLagMinutes > 240; // > 4 hours lag

  const pendingBacklog = backlogItems.filter(
    (b) => b.status === "pending_peachtree_entry" || b.status === "amount_mismatch"
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Live Sync Heartbeat */}
      <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black font-heading text-foreground">
                Accountant Activity & Reconciliation Audit
              </h2>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold gap-1 px-2.5 ${
                  syncAgentStatus === "online"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : syncAgentStatus === "idle"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${syncAgentStatus === "online" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                Agent: {syncAgentStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live audit monitor tracking on-premise Peachtree data entry velocity, backlog lag, and cloud disaster recovery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshSync}
            className="text-xs font-semibold h-8"
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh Status
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadCloudBackup}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download Full Cloud Backup
          </Button>
        </div>
      </div>

      {/* Lag Alert Banner if stale */}
      {isLagging && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <span>
              <strong>Accountant Lag Warning:</strong> Last sync from Peachtree was {syncLagMinutes} minutes ago. Please ensure the accounting computer is connected and Peachtree is running.
            </span>
          </div>
          <Badge className="bg-amber-500 text-white text-[10px] font-bold">Lag Detected</Badge>
        </div>
      )}

      {/* 2. Key Accountant Velocity Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border rounded-2xl bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Invoices Posted Today</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-mono mt-1">
            {dailyVelocity.invoicesCount}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">✓ Peachtree Customer Sales</p>
        </Card>

        <Card className="p-4 border rounded-2xl bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Bills Entered Today</span>
            <FileSpreadsheet className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono mt-1">
            {dailyVelocity.billsCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Vendor AP Purchases</p>
        </Card>

        <Card className="p-4 border rounded-2xl bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Vouchers / Payments</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 font-mono mt-1">
            {dailyVelocity.paymentsCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Disbursements & Receipts</p>
        </Card>

        <Card className="p-4 border rounded-2xl bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Pending Entry Backlog</span>
            <Clock className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono mt-1">
            {pendingBacklog.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting Peachtree Booking</p>
        </Card>
      </div>

      {/* 3. SolarFlow vs Peachtree Backlog Queue */}
      <Card className="border shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" /> SolarFlow Commercial vs Peachtree Reconciliation Backlog
              </CardTitle>
              <CardDescription className="text-xs">
                Items approved in SolarFlow (POS sales, per diems, TTL field cash) waiting for accountant recording in Peachtree.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold">
              {pendingBacklog.length} Unposted Items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[350px] overflow-auto">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="text-xs font-bold">Reference / ID</TableHead>
                  <TableHead className="text-xs font-bold">Source Action</TableHead>
                  <TableHead className="text-xs font-bold">Date</TableHead>
                  <TableHead className="text-xs font-bold">Party / Destination</TableHead>
                  <TableHead className="text-xs font-bold text-right">Amount</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backlogItems.length > 0 ? (
                  backlogItems.map((item) => (
                    <TableRow key={item.id} className="border-b border-border/40 hover:bg-muted/20">
                      <TableCell className="font-mono text-xs font-bold text-primary">{item.refNumber}</TableCell>
                      <TableCell className="text-xs font-semibold">{item.source}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.date}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{item.entityName}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            item.status === "synced_and_balanced"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : item.status === "amount_mismatch"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse"
                          }`}
                        >
                          {item.status === "synced_and_balanced"
                            ? "✓ Booked in Peachtree"
                            : item.status === "amount_mismatch"
                            ? "Discrepancy"
                            : "Awaiting Peachtree Entry"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No backlog items pending. All SolarFlow actions are balanced with Peachtree!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Disaster Recovery Cloud Vault Card */}
      <Card className="border border-purple-500/30 bg-gradient-to-br from-card via-card to-purple-950/10 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Peachtree Cloud Disaster Recovery Vault
                <Badge className="bg-purple-600 text-white text-[9px] font-mono">Automated Cloud Snapshots</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Protects company accounting records against hard drive failure, malware, or office PC crashes.
              </p>
            </div>
          </div>

          <Button
            onClick={handleDownloadCloudBackup}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 flex items-center gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" /> Download Complete Cloud Archive (.JSON)
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="p-3 rounded-xl border border-border/60 bg-background/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Database Source</span>
            <span className="text-xs font-mono font-bold text-foreground mt-0.5 block truncate">
              {vaultInfo?.databaseSource || "Meseret Mare Accounting (MySQL/TiDB Cloud Mirror)"}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Replicated ({vaultInfo?.totalCustomers || 0} Customers • {vaultInfo?.totalInvoices || 0} Invoices)
            </span>
          </div>

          <div className="p-3 rounded-xl border border-border/60 bg-background/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Suppliers & AP Ledger</span>
            <span className="text-xs font-mono font-bold text-foreground mt-0.5 block">
              {vaultInfo?.totalVendors || 0} Active Vendor Accounts
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Vendor payables & purchase history preserved
            </span>
          </div>

          <div className="p-3 rounded-xl border border-border/60 bg-background/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Last Cloud Sync Timestamp</span>
            <span className="text-xs font-mono font-bold text-foreground mt-0.5 block">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Live Sync Active"}
            </span>
            <span className="text-[10px] text-purple-600 font-semibold mt-1 block">
              Encrypted 15-min automated interval
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
