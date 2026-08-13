import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, UserPlus, Zap, FileText, Search, Package, Users, DollarSign,
  TrendingUp, ArrowRight, Eye, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/StoreContext";
import { formatCurrency } from "@/lib/data";
import { DashboardHeaderBanner } from "./widgets/DashboardHeaderBanner";
import { StatCardGrid } from "./widgets/StatCardGrid";
import { EodActivityWidget } from "./widgets/EodActivityWidget";

export function SalesHubDashboard() {
  const navigate = useNavigate();
  const { customers = [], sales = [], sizingRequests = [], products = [], eodReports = [] } = useStore() as any;
  const [searchQuery, setSearchQuery] = useState("");
  const [stockQuery, setStockQuery] = useState("");

  const filteredCustomers = customers.filter((c: any) =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || "").includes(searchQuery)
  );

  const filteredStock = products.filter((p: any) =>
    (p.name || "").toLowerCase().includes(stockQuery.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(stockQuery.toLowerCase())
  );

  const totalSalesVal = sales.reduce((s: number, sa: any) => s + (Number(sa.totalSell || sa.totalAmount) || 0), 0);

  const statCards = [
    {
      key: "sales",
      label: "Total Sales Revenue",
      value: formatCurrency(totalSalesVal),
      subtext: `${sales.length} POS sales closed`,
      icon: DollarSign,
      gradientClass: "stat-gradient-sales",
      badge: "Revenue",
    },
    {
      key: "products",
      label: "Available Inventory",
      value: `${products.length} Items`,
      subtext: `${products.filter((p: any) => p.quantity === 0).length} items out of stock`,
      icon: Package,
      gradientClass: "stat-gradient-products",
      badge: "Stock",
    },
    {
      key: "customers",
      label: "Customer Base",
      value: `${customers.length} Accounts`,
      subtext: "Digital dossiers registered",
      icon: Users,
      gradientClass: "stat-gradient-customers",
      badge: "Clients",
    },
    {
      key: "proposals",
      label: "Active Proposals",
      value: `${sizingRequests.length} Proposals`,
      subtext: "Technical pump packages",
      icon: FileText,
      gradientClass: "stat-gradient-profit",
      badge: "Pipeline",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Standardized Header Banner */}
      <DashboardHeaderBanner
        roleBadge="Sales & Commercial Desk"
        title="Sales Hub Workspace"
        description="Customer Intake, Digital Master Dossier, POS Commercial Sales & Pump Package Proposals."
        gradientClass="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800"
        actions={[
          {
            label: "Direct Retail POS",
            onClick: () => navigate("/pos?mode=general"),
            icon: ShoppingCart,
            className: "bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md text-xs h-9",
          },
          {
            label: "Pump Package POS",
            onClick: () => navigate("/pos?mode=sizing"),
            icon: Zap,
            className: "bg-indigo-900/60 hover:bg-indigo-900 text-white font-bold border border-white/20 text-xs h-9",
          },
        ]}
      />

      {/* 2. Signature Stat Cards Grid */}
      <StatCardGrid cards={statCards} gridColsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />

      {/* 3. Operational Grid (Stock Checker + Recent Sales Orders) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fast Stock Checker & Recent Orders (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Inventory Availability Search */}
          <Card className="p-4 border border-border/60 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Fast Inventory Stock Checker
                </h3>
                <p className="text-xs text-muted-foreground">Instantly verify price & stock availability while talking with customers.</p>
              </div>
              <div className="w-full sm:w-64 relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search item or category..."
                  value={stockQuery}
                  onChange={(e) => setStockQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Product Name</th>
                    <th className="pb-2 text-left font-medium">Category</th>
                    <th className="pb-2 text-center font-medium">Available</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.slice(0, 8).map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 font-semibold">{p.name}</td>
                      <td className="py-2 text-muted-foreground">{p.category}</td>
                      <td className={`py-2 text-center font-bold ${p.quantity === 0 ? "text-rose-600" : p.quantity <= 2 ? "text-amber-600" : "text-emerald-600"}`}>
                        {p.quantity} {p.unit || "pcs"}
                      </td>
                      <td className="py-2 text-right font-bold text-foreground">{formatCurrency(p.sellPrice || p.sell_price || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent Commercial Sales */}
          <Card className="p-4 border border-border/60 shadow-sm">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" /> Recent Sales Transactions
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/pos")}>
                POS Counter
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium text-center">Payment</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 6).map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{s.id}</td>
                      <td className="py-2 text-muted-foreground">{s.date}</td>
                      <td className="py-2 font-semibold">{s.customer?.name || "Retail Buyer"}</td>
                      <td className="py-2 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {s.paymentMethod || "Cash"}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-bold">{formatCurrency(s.totalSell || s.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1/3): Customer Dossiers Search & EOD Log */}
        <div className="space-y-6">
          {/* Customer Master Dossier Search */}
          <Card className="p-4 border border-border/60 shadow-sm">
            <div className="border-b pb-2 mb-3">
              <h3 className="font-bold text-xs flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Customer Dossiers
              </h3>
              <p className="text-[11px] text-muted-foreground">Search digital client records</p>
            </div>
            <div className="relative mb-3">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {filteredCustomers.slice(0, 5).map((c: any) => (
                <div key={c.id} className="p-2 rounded border bg-muted/20 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.phone} · {c.location || "N/A"}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => navigate("/pos")}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Universal End-of-Day Activity Log */}
          <EodActivityWidget eodReports={eodReports} />
        </div>
      </div>
    </div>
  );
}
