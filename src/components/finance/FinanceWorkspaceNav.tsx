import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  TrendingUp,
  Building,
  Landmark,
  FileText,
  Droplets,
  Package,
  BarChart3,
  Users,
  Receipt,
  Wallet,
  FileUp,
  PieChart,
  ChevronDown,
  Building2,
  Activity,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Briefcase,
  DollarSign,
  Crown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

export interface FinanceNavProps {
  activeSection: string;
  selectedEntity?: "FZ" | "MM";
  selectedEntityName?: string;
  onEntityChange?: (entity: "FZ" | "MM") => void;
  pendingApprovalsCount?: number;
  syncAgentStatus?: "online" | "idle" | "offline";
}

export const WORKSPACE_GROUPS = [
  {
    id: "financials",
    label: "Peachtree Complete Financials",
    icon: Landmark,
    sections: [
      { id: "dashboard", label: "Executive Overview", icon: LayoutDashboard, path: "/finance/dashboard" },
      { id: "invoices", label: "Sales & Invoices", icon: Receipt, path: "/finance/invoices" },
      { id: "purchases", label: "Purchases & Vendor AP", icon: DollarSign, path: "/finance/purchases" },
      { id: "debtors", label: "Debtors (AR) & Credit", icon: Users, path: "/finance/debtors" },
      { id: "financials", label: "Financial Statements (P&L / BS)", icon: PieChart, path: "/finance/financials" },
      { id: "bank", label: "Banking & Cash Accounts", icon: Building, path: "/finance/bank" },
      { id: "cashflow", label: "Cash Flow Ledger", icon: TrendingUp, path: "/finance/cashflow" },
    ],
  },
  {
    id: "approvals",
    label: "Approvals Inbox",
    icon: ShieldCheck,
    badgeKey: "approvals",
    sections: [
      { id: "approvals", label: "All Pending Approvals", icon: ShieldCheck, path: "/finance/approvals" },
      { id: "sizing-proposals", label: "Pump Sizing Proposals", icon: Droplets, path: "/finance/sizing-proposals" },
      { id: "perdiem", label: "Per Diem Requests", icon: Users, path: "/finance/perdiem" },
      { id: "fieldcash", label: "TTL Field Cash Outlays", icon: DollarSign, path: "/finance/fieldcash" },
      { id: "mission-budgets", label: "Mission Budgets", icon: Briefcase, path: "/finance/mission-budgets" },
    ],
  },
  {
    id: "monitor",
    label: "Accountant Management & Audit",
    icon: Activity,
    roles: ["manager", "admin"], // Dedicated to General Manager & Executive Leadership
    sections: [
      { id: "monitor", label: "Accountant Activity & Backlog", icon: Activity, path: "/finance/monitor" },
      { id: "peachtree", label: "Cloud Disaster Recovery Vault", icon: FileUp, path: "/finance/peachtree" },
    ],
  },
];

export function FinanceWorkspaceNav({
  activeSection,
  selectedEntity = "MM",
  selectedEntityName = "Meseret Mare Solar",
  pendingApprovalsCount = 0,
  syncAgentStatus = "online",
}: FinanceNavProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const userRole = String(currentUser?.role || "").toLowerCase();

  // Role Filtering: Accountant Management is strictly reserved for General Manager / Admin
  const visibleGroups = WORKSPACE_GROUPS.filter((g) => {
    if (!g.roles) return true;
    return g.roles.includes(userRole) || userRole === "admin" || userRole === "manager";
  });

  const getActiveGroup = () => {
    return (
      visibleGroups.find((group) =>
        group.sections.some((s) => s.id === activeSection)
      ) || visibleGroups[0]
    );
  };

  const activeGroup = getActiveGroup();

  return (
    <div className="space-y-3">
      {/* Top Bar with Title & Company Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/70 backdrop-blur-md border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center shadow-inner">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black tracking-tight font-heading">Finance Command Center</h1>
              
              <Badge
                variant="outline"
                className="h-6 px-2.5 text-xs font-bold gap-1.5 border-primary/40 bg-primary/10 text-primary rounded-full"
              >
                <Building2 className="h-3 w-3" />
                <span>Meseret Mare Solar (MM)</span>
              </Badge>

              <Badge
                variant="outline"
                className={`h-6 px-2 text-[10px] font-bold gap-1 rounded-full ${
                  syncAgentStatus === "online"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${syncAgentStatus === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                Peachtree Sync: {syncAgentStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Peachtree 2010 Single Source of Truth • Commercial Approvals • General Manager Financial Oversight
            </p>
          </div>
        </div>

        {/* Core Pillar Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border">
          {visibleGroups.map((group) => {
            const isCurrentGroup = group.id === activeGroup?.id;
            const Icon = group.icon;
            const hasApprovalBadge = group.badgeKey === "approvals" && pendingApprovalsCount > 0;

            return (
              <DropdownMenu key={group.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isCurrentGroup ? "default" : "ghost"}
                    size="sm"
                    className={`h-9 px-3 text-xs font-bold gap-1.5 transition-all ${
                      isCurrentGroup
                        ? "shadow-sm bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{group.label}</span>
                    {hasApprovalBadge && (
                      <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-destructive text-destructive-foreground font-black animate-pulse">
                        {pendingApprovalsCount}
                      </Badge>
                    )}
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                    {group.label} Views
                  </div>
                  {group.sections.map((section) => {
                    const isCurrentSection = section.id === activeSection;
                    const SectionIcon = section.icon;
                    return (
                      <DropdownMenuItem
                        key={section.id}
                        onClick={() => navigate(section.path)}
                        className={`text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2 flex items-center justify-between ${
                          isCurrentSection
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SectionIcon className="h-3.5 w-3.5" />
                          <span>{section.label}</span>
                        </div>
                        {isCurrentSection && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </div>

      {/* Sub-Section Fast-Switch Navigation Pill Bar */}
      {activeGroup && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {activeGroup.sections.map((section) => {
            const isCurrent = section.id === activeSection;
            const SectionIcon = section.icon;
            return (
              <Button
                key={section.id}
                variant={isCurrent ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate(section.path)}
                className={`h-7 px-2.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                  isCurrent
                    ? "bg-secondary text-secondary-foreground shadow-xs font-bold border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <SectionIcon className="h-3 w-3 mr-1.5" />
                {section.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
