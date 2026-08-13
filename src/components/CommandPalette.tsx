import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search, ShoppingCart, Package, Droplets, Briefcase, DollarSign, Users,
  LayoutDashboard, FileUp, Sparkles, Sun, Zap, Bell, Inbox, MessageSquare,
  BarChart3, Compass, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth, UserRole } from "@/context/AuthContext";

interface CommandItem {
  title: string;
  category: "Navigation" | "Actions" | "Communications";
  url: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // Overview & Communications
  { title: "Dashboard Command Center", category: "Navigation", url: "/", icon: LayoutDashboard, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { title: "Alerts & Operational Activity", category: "Navigation", url: "/alerts", icon: Bell, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { title: "Approvals & Tasks Requests", category: "Navigation", url: "/inbox", icon: Inbox, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { title: "Team Chat Channels", category: "Navigation", url: "/chat", icon: MessageSquare, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },

  // Operational Pages
  { title: "Pump Products Catalog", category: "Navigation", url: "/pumps", icon: Droplets, roles: ["admin", "manager", "storekeeper", "fieldwork", "ttl", "sales", "technician"] },
  { title: "Pump Sizing Calculator", category: "Navigation", url: "/fieldwork/sizing", icon: Droplets, roles: ["admin", "manager", "fieldwork", "ttl", "sales"] },
  { title: "Point of Sale (POS)", category: "Navigation", url: "/pos", icon: ShoppingCart, roles: ["admin", "finance", "storekeeper", "sales"] },
  { title: "Inventory Store Management", category: "Navigation", url: "/inventory", icon: Package, roles: ["admin", "storekeeper"] },
  { title: "Field Work Overview", category: "Navigation", url: "/fieldwork/overview", icon: Compass, roles: ["admin", "manager", "fieldwork", "ttl"] },
  { title: "Field Operations & Jobs", category: "Navigation", url: "/fieldwork/jobs", icon: Briefcase, roles: ["admin", "fieldwork", "ttl"] },
  { title: "Finance Center", category: "Navigation", url: "/finance", icon: DollarSign, roles: ["admin", "finance"] },
  { title: "Peachtree 2010 Bridge", category: "Navigation", url: "/finance/peachtree", icon: FileUp, roles: ["admin", "finance"] },
  { title: "Business Performance Reports", category: "Navigation", url: "/reports", icon: BarChart3, roles: ["admin", "manager", "finance"] },
  { title: "HR & Workforce Hub", category: "Navigation", url: "/hr/dashboard", icon: Users, roles: ["admin", "hr"] },
  { title: "User Accounts & Role Security", category: "Navigation", url: "/users", icon: Users, roles: ["admin"] },

  // Quick Operational Actions
  { title: "Submit Expense Write-off Request", category: "Actions", url: "/inbox", icon: DollarSign, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { title: "Request Stock Reorder", category: "Actions", url: "/inventory", icon: Package, roles: ["admin", "storekeeper"] },
  { title: "Run Solar Pump Sizing", category: "Actions", url: "/fieldwork/sizing", icon: Droplets, roles: ["admin", "manager", "fieldwork", "ttl", "sales"] },
];

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { hasAccess, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const permittedItems = COMMAND_ITEMS.filter((item) => hasAccess(item.roles));

  const filteredItems = permittedItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    navigate(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 bg-slate-950/95 text-white border-amber-500/30 max-w-xl overflow-hidden shadow-2xl rounded-2xl backdrop-blur-xl">
        {/* Branded Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-4 py-3 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-md">
              <Sun className="h-4 w-4 animate-spin-slow text-yellow-200" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                SolarFlow Command Palette <Sparkles className="h-3 w-3 text-yellow-300" />
              </h3>
              <p className="text-[10px] text-amber-100/80">Role-Aware Quick Navigation & Actions</p>
            </div>
          </div>
          <Badge className="bg-black/30 text-amber-200 border-amber-400/30 text-[10px]">
            {currentUser?.displayName || currentUser?.username} ({currentUser?.role})
          </Badge>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center border-b border-white/10 px-4 py-2.5 bg-slate-900/60">
          <Search className="h-4 w-4 text-amber-400 mr-2 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search page or command... (Ctrl + K)"
            className="border-none bg-transparent text-white placeholder:text-slate-400 focus-visible:ring-0 text-sm h-8"
            autoFocus
          />
          <Badge variant="outline" className="text-[10px] text-slate-400 border-white/15 font-mono">
            ESC
          </Badge>
        </div>

        {/* Results List */}
        <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(item.url)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 text-left transition-all text-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-sm">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-amber-300">{item.title}</p>
                    <p className="text-[11px] text-slate-400">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white/5 text-slate-300 border-white/10 text-[10px] group-hover:border-amber-400/40">
                    Open <ArrowRight className="h-3 w-3 ml-1 text-amber-400 inline" />
                  </Badge>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No matching commands permitted for your role.
            </div>
          )}
        </div>

        {/* Branded Footer */}
        <div className="border-t border-white/10 px-4 py-2 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-amber-400/80">
            <Zap className="h-3 w-3" /> SolarFlow Enterprise OS
          </span>
          <span>Press ↑ ↓ to navigate · ↵ to select · ESC to exit</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
