import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, TrendingUp, Building, Landmark, FileText, Droplets,
  Package, BarChart3, Users, Receipt, Wallet, FileUp, PieChart,
  ChevronDown, Check, Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface FinanceNavProps {
  activeSection: string;
  selectedEntity: "FZ" | "MM";
  selectedEntityName: string;
  onEntityChange?: (entity: "FZ" | "MM") => void;
  pendingSizingCount?: number;
  pendingInvCount?: number;
}

export const WORKSPACE_GROUPS = [
  {
    id: "treasury",
    label: "Treasury & Cash",
    icon: Wallet,
    entities: ["MM"],
    sections: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard, path: "/finance/dashboard" },
      { id: "cashflow", label: "Cash Flow", icon: TrendingUp, path: "/finance/cashflow" },
      { id: "bank", label: "Bank Accounts", icon: Building, path: "/finance/bank" },
      { id: "bank-reconciliation", label: "Reconciliation", icon: FileText, path: "/finance/bank-reconciliation" },
      { id: "petty-cash", label: "Petty Cash", icon: Wallet, path: "/finance/petty-cash" },
    ],
  },
  {
    id: "sales",
    label: "Sales & Proposals",
    icon: Droplets,
    badgeKey: "sizing",
    entities: ["MM"],
    sections: [
      { id: "sizing-proposals", label: "Pump Sizing Proposals", icon: Droplets, path: "/finance/sizing-proposals" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Package,
    badgeKey: "inventory",
    entities: ["MM"],
    sections: [
      { id: "inventory", label: "Inventory Requests", icon: Package, path: "/finance/inventory" },
    ],
  },
  {
    id: "commitments",
    label: "Commitments & Debt",
    icon: Landmark,
    entities: ["MM"],
    sections: [
      { id: "building-rent", label: "Building Rent", icon: Building, path: "/finance/building-rent" },
      { id: "loans", label: "Loans & Credit", icon: Landmark, path: "/finance/loans" },
      { id: "budget", label: "Budget Allocations", icon: BarChart3, path: "/finance/budget" },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Ledger",
    icon: Receipt,
    entities: ["MM"],
    sections: [
      { id: "peachtree", label: "Finance Summary & Reports", icon: FileUp, path: "/finance/peachtree" },
      { id: "vat", label: "VAT & Taxes", icon: Receipt, path: "/finance/vat" },
      { id: "payroll", label: "Payroll", icon: Users, path: "/finance/payroll" },
      { id: "financials", label: "Financial Statements", icon: PieChart, path: "/finance/financials" },
      { id: "reports", label: "Executive Analytics", icon: FileText, path: "/finance/reports" },
    ],
  },
];

export function FinanceWorkspaceNav({
  activeSection,
  selectedEntity = "MM",
  selectedEntityName = "Meseret Mare Solar",
  onEntityChange,
  pendingSizingCount = 0,
  pendingInvCount = 0,
}: FinanceNavProps) {
  const navigate = useNavigate();

  const visibleGroups = WORKSPACE_GROUPS;

  const getActiveGroup = () => {
    return (
      visibleGroups.find((group) =>
        group.sections.some((s) => s.id === activeSection)
      ) || visibleGroups[0] || WORKSPACE_GROUPS[0]
    );
  };

  const activeGroup = getActiveGroup();

  return (
    <div className="space-y-3">
      {/* Top Bar with Title & Company Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/60 backdrop-blur-md border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center shadow-inner">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight font-heading">Finance Center</h1>
              
              <Badge
                variant="outline"
                className="h-6 px-2.5 text-xs font-bold gap-1.5 border-primary/40 bg-primary/10 text-primary rounded-full"
              >
                <Building2 className="h-3 w-3" />
                <span>Meseret Mare Solar (MM)</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Solarflow Commercial ERP · Solar Pump Sizing, Technical Dispatches, POS & Treasury
            </p>
          </div>
        </div>

        {/* Group Tabs (ERPNext Module Architecture) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border">
          {visibleGroups.map((group) => {
            const isCurrentGroup = group.id === activeGroup?.id;
            const Icon = group.icon;
            const hasSizingBadge = group.badgeKey === "sizing" && pendingSizingCount > 0;
            const hasInvBadge = group.badgeKey === "inventory" && pendingInvCount > 0;

            if (group.sections.length === 1) {
              const singleSection = group.sections[0];
              const isSelected = activeSection === singleSection.id;

              return (
                <Button
                  key={group.id}
                  size="sm"
                  variant={isSelected ? "default" : "ghost"}
                  className={`h-8 text-xs font-semibold rounded-lg gap-1.5 transition-all ${
                    isSelected ? "shadow-sm" : "hover:bg-muted"
                  }`}
                  onClick={() => navigate(singleSection.path)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {group.label}
                  {hasSizingBadge && (
                    <span className="ml-1 px-1.5 py-0.2 bg-blue-500 text-white rounded-full text-[10px] font-black animate-pulse">
                      {pendingSizingCount}
                    </span>
                  )}
                  {hasInvBadge && (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                      {pendingInvCount}
                    </span>
                  )}
                </Button>
              );
            }

            return (
              <DropdownMenu key={group.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant={isCurrentGroup ? "default" : "ghost"}
                    className={`h-8 text-xs font-semibold rounded-lg gap-1.5 transition-all ${
                      isCurrentGroup ? "shadow-sm" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {group.label}
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 p-1.5 shadow-lg rounded-xl">
                  {group.sections.map((sec) => {
                    const SecIcon = sec.icon;
                    const isSecActive = activeSection === sec.id;
                    return (
                      <DropdownMenuItem
                        key={sec.id}
                        className={`text-xs font-medium cursor-pointer rounded-lg gap-2 py-2 ${
                          isSecActive ? "bg-primary/10 text-primary font-bold" : ""
                        }`}
                        onClick={() => navigate(sec.path)}
                      >
                        <SecIcon className="h-4 w-4" />
                        {sec.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </div>

      {/* Sub-Tabs Row for multi-item active group */}
      {activeGroup && activeGroup.sections.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/60 text-xs">
          {activeGroup.sections.map((sub) => {
            const isSubActive = activeSection === sub.id;
            const SubIcon = sub.icon;
            return (
              <Button
                key={sub.id}
                size="sm"
                variant={isSubActive ? "secondary" : "ghost"}
                className={`h-7 px-3 text-xs font-medium rounded-lg gap-1.5 shrink-0 ${
                  isSubActive
                    ? "bg-secondary text-secondary-foreground font-bold shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => navigate(sub.path)}
              >
                <SubIcon className="h-3 w-3" />
                {sub.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
