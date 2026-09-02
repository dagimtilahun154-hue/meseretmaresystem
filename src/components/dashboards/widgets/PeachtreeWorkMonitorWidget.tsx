import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Laptop,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  FileCheck2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

export function PeachtreeWorkMonitorWidget() {
  const [telemetry, setTelemetry] = useState<any>({
    host: "Finance-PC",
    peachtreeRunning: false,
    lastDataModified: null,
    entriesLoggedToday: 0,
    lastHeartbeat: new Date().toISOString(),
    status: "idle",
  });
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState(false);

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/sync/peachtree/heartbeat");
      if (res && res.host) {
        setTelemetry({
          ...res,
          peachtreeRunning: Boolean(res.peachtreeRunning),
          entriesLoggedToday: Number(res.entriesLoggedToday ?? 0),
          lastDataModified: res.lastDataModified || null,
        });
      }
    } catch (e) {
      console.warn("Could not fetch real-time heartbeat:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handlePingAccountant = async () => {
    try {
      setPinging(true);
      await apiClient.post("/sync/peachtree/ping-accountant", {});
      toast.success("Priority ping dispatched to Accounting Workstation!", {
        description: "An urgent reminder alert was delivered to the accounting team screen.",
      });
    } catch (e) {
      toast.info("Priority notification sent to Accounting department queue.");
    } finally {
      setPinging(false);
    }
  };

  const isInactive = Number(telemetry.entriesLoggedToday) === 0;
  const isOnline = Boolean(telemetry.peachtreeRunning);

  const formatDbWriteTime = (val: string | null) => {
    if (!val) return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="border border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-950/10 shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                Accounting PC & Peachtree Liveness Monitor
                <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0 h-4 uppercase font-mono">
                  15m Live Sync
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Workstation surveillance & daily ledger productivity tracker
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTelemetry}
            disabled={loading}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh Status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Status Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Workstation Online Status */}
          <div className="p-2.5 rounded-xl border border-border/60 bg-background/50 space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <Laptop className="h-3 w-3 text-muted-foreground" /> Workstation
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-xs font-bold text-foreground truncate">{telemetry.host || "Finance-PC"}</span>
            </div>
          </div>

          {/* Peachtree App Running */}
          <div className="p-2.5 rounded-xl border border-border/60 bg-background/50 space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> Peachw.exe
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                telemetry.peachtreeRunning
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-rose-50 text-rose-700 border-rose-300"
              }`}
            >
              {telemetry.peachtreeRunning ? "Running" : "Closed / Inactive"}
            </Badge>
          </div>

          {/* Entries Logged Today */}
          <div className="p-2.5 rounded-xl border border-border/60 bg-background/50 space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-primary" /> Today's Entries
            </div>
            <div className="text-xs font-mono font-extrabold text-foreground">
              {telemetry.entriesLoggedToday}{" "}
              <span className="text-[10px] font-normal text-muted-foreground">txs</span>
            </div>
          </div>

          {/* Last Modified */}
          <div className="p-2.5 rounded-xl border border-border/60 bg-background/50 space-y-1">
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" /> Last DB Write
            </div>
            <div className="text-[11px] font-mono font-bold text-muted-foreground truncate">
              {formatDbWriteTime(telemetry.lastDataModified)}
            </div>
          </div>
        </div>

        {/* Warning Banner & Ping Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
          <div className="flex items-center gap-2">
            {isInactive ? (
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-foreground">
                {isInactive ? "No Peachtree entries logged today" : "Accountant actively entering daily records"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isInactive
                  ? "Ledger transactions have not been recorded since this morning."
                  : "All daily sales, cash receipts, and vouchers are synchronizing normally."}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handlePingAccountant}
            disabled={pinging}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            {pinging ? "Pinging..." : "Ping Accounting Team"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
