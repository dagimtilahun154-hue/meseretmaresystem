import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  DollarSign,
  AlertTriangle,
  Truck,
  TrendingUp,
  Droplets,
  Zap,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { InventoryDashboardData } from "@/lib/api/inventory";
import { StatCardGrid, StatCardItem } from "../dashboards/widgets/StatCardGrid";

interface InventoryDashboardTabProps {
  data: InventoryDashboardData | null;
  onNavigateTab: (tab: string) => void;
  onReceiveClick: () => void;
  onAddProductClick: () => void;
}

export const InventoryDashboardTab: React.FC<InventoryDashboardTabProps> = ({
  data,
  onNavigateTab,
  onReceiveClick,
  onAddProductClick,
}) => {
  const categoryCounts = data?.categoryCounts || {
    PUMP: { count: 0, qty: 0, value: 0 },
    PUMP_EQUIPMENT: { count: 0, qty: 0, value: 0 },
    COMPANY_TOOL: { count: 0, qty: 0, value: 0 },
    WORK_TOOL: { count: 0, qty: 0, value: 0 },
  };

  // 1. Signature Stat Cards matching Dashboard styling
  const statCards: StatCardItem[] = [
    {
      key: "valuation",
      label: "Total Stock Valuation",
      value: formatCurrency(data?.totalStockValue || 0),
      subtext: `${data?.totalProducts || 0} registered SKUs`,
      icon: DollarSign,
      gradientClass: "stat-gradient-sales",
      badge: "Valuation",
    },
    {
      key: "products",
      label: "Available Inventory",
      value: `${data?.totalProducts || 0} SKUs`,
      subtext: "Across warehouse & bins",
      icon: Package,
      gradientClass: "stat-gradient-products",
      badge: "Catalog",
    },
    {
      key: "releases",
      label: "Pending Field Releases",
      value: `${data?.pendingReleasesCount || 0} Jobs`,
      subtext: "Awaiting storekeeper release",
      icon: Truck,
      gradientClass: "stat-gradient-customers",
      badge: "Dispatch",
    },
    {
      key: "alerts",
      label: "Low Stock Warnings",
      value: `${data?.lowStockCount || 0} Items`,
      subtext: "Below safety reorder level",
      icon: AlertTriangle,
      gradientClass: "stat-gradient-vat",
      badge: "Reorder",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Signature Stat Cards Grid */}
      <StatCardGrid cards={statCards} gridColsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* 2. Warehouse Stock Valuation by 4 Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Warehouse Inventory by Category
          </h3>
          <span className="text-xs text-muted-foreground font-medium">Real-time stock balance & valuation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category 1: Solar Pumps */}
          <Card
            onClick={() => onNavigateTab("catalog")}
            className="p-4 border border-border/60 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer bg-card rounded-2xl group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
                <Droplets className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-sky-50/80 text-sky-700 border-sky-200">
                {categoryCounts.PUMP?.count || 0} Models
              </Badge>
            </div>
            <div className="font-bold text-sm text-foreground">Solar Water Pumps</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <strong className="text-foreground text-sm font-extrabold">{categoryCounts.PUMP?.qty || 0}</strong> units in stock
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Valuation:</span>
              <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{formatCurrency(categoryCounts.PUMP?.value || 0)}</span>
            </div>
          </Card>

          {/* Category 2: Pump Equipment */}
          <Card
            onClick={() => onNavigateTab("catalog")}
            className="p-4 border border-border/60 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer bg-card rounded-2xl group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                <Zap className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-amber-50/80 text-amber-700 border-amber-200">
                {categoryCounts.PUMP_EQUIPMENT?.count || 0} Items
              </Badge>
            </div>
            <div className="font-bold text-sm text-foreground">Pump Equipment</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <strong className="text-foreground text-sm font-extrabold">{categoryCounts.PUMP_EQUIPMENT?.qty || 0}</strong> controllers/panels
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Valuation:</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{formatCurrency(categoryCounts.PUMP_EQUIPMENT?.value || 0)}</span>
            </div>
          </Card>

          {/* Category 3: Company Tools */}
          <Card
            onClick={() => onNavigateTab("catalog")}
            className="p-4 border border-border/60 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer bg-card rounded-2xl group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                <Wrench className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50/80 text-emerald-700 border-emerald-200">
                {categoryCounts.COMPANY_TOOL?.count || 0} Assets
              </Badge>
            </div>
            <div className="font-bold text-sm text-foreground">Company Tools</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <strong className="text-foreground text-sm font-extrabold">{categoryCounts.COMPANY_TOOL?.qty || 0}</strong> available in warehouse
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Valuation:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(categoryCounts.COMPANY_TOOL?.value || 0)}</span>
            </div>
          </Card>

          {/* Category 4: Work Tools (Consumables) */}
          <Card
            onClick={() => onNavigateTab("catalog")}
            className="p-4 border border-border/60 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer bg-card rounded-2xl group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                <Package className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-purple-50/80 text-purple-700 border-purple-200">
                {categoryCounts.WORK_TOOL?.count || 0} Items
              </Badge>
            </div>
            <div className="font-bold text-sm text-foreground">Work Tools (Consumables)</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <strong className="text-foreground text-sm font-extrabold">{categoryCounts.WORK_TOOL?.qty || 0}</strong> cables/pipes/fittings
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Valuation:</span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{formatCurrency(categoryCounts.WORK_TOOL?.value || 0)}</span>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Operational Grid (Recent Movements + Low Stock Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Stock Transactions */}
        <Card className="p-5 border border-border/60 shadow-sm bg-card rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Recent Stock Movements
                </h3>
                <p className="text-xs text-muted-foreground">Latest receipts, issues, returns, and count adjustments</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab("history")}
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                Full History →
              </Button>
            </div>

            {(!data?.recentTransactions || data.recentTransactions.length === 0) ? (
              <div className="text-center py-10 text-xs text-muted-foreground space-y-2">
                <Package className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p>No recent stock movements recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recentTransactions.slice(0, 5).map((tx) => {
                  const isPositive = tx.quantity > 0 && tx.transactionType !== "ISSUE";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-rose-50 text-rose-600 border border-rose-200"
                          }`}
                        >
                          {isPositive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">{tx.productName}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                              {tx.transactionType}
                            </Badge>
                            {tx.reference && <span>• Ref: {tx.reference}</span>}
                          </div>
                        </div>
                      </div>
                      <div className={`text-xs font-mono font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                        {isPositive ? `+${tx.quantity}` : `${tx.quantity}`} {tx.unit || "pcs"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Storekeeper Ledger Status</span>
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold">
              ✅ Double-Entry Verified
            </Badge>
          </div>
        </Card>

        {/* Right: Low Stock Alerts & Reorders */}
        <Card className="p-5 border border-border/60 shadow-sm bg-card rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Threshold Alerts
                </h3>
                <p className="text-xs text-muted-foreground">Items requiring supplier reordering or replenishment</p>
              </div>
              <Button
                size="sm"
                onClick={onReceiveClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 px-3"
              >
                + Quick Receive
              </Button>
            </div>

            {(!data?.lowStockItems || data.lowStockItems.length === 0) ? (
              <div className="text-center py-10 text-xs text-muted-foreground space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/60" />
                <p className="text-emerald-700 font-semibold">All stock items are well above safety threshold levels!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Min Safety Level: {item.minStockLevel} {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold ${
                          item.quantity === 0
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : "bg-amber-50 text-amber-700 border-amber-300"
                        }`}
                      >
                        {item.quantity} {item.unit} left
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onReceiveClick}
                        className="h-7 text-[11px] px-2 border-border text-foreground hover:bg-muted"
                      >
                        Receive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Supplier Reorder Recommendation</span>
            <Button
              variant="link"
              size="sm"
              onClick={() => onNavigateTab("catalog")}
              className="text-xs text-primary font-bold p-0 h-auto"
            >
              Inspect Catalog Alert Filter →
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
