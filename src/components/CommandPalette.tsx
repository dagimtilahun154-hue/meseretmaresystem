import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Search, ShoppingCart, Package, Droplets, Briefcase, DollarSign, Users,
  LayoutDashboard, FileUp, Zap, Bell, Inbox, MessageSquare,
  BarChart3, Compass, ArrowRight, CornerDownLeft, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth, UserRole } from "@/context/AuthContext";
import { AnimatedZapIcon } from "@/components/ui/animated-icons";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Quick Actions";
  url: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // Navigation
  { id: "dash", title: "Dashboard Command Center", category: "Navigation", url: "/", icon: LayoutDashboard, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { id: "alerts", title: "Alerts & Operational Activity", category: "Navigation", url: "/alerts", icon: Bell, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { id: "inbox", title: "Approvals & Tasks Requests", category: "Navigation", url: "/inbox", icon: Inbox, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { id: "chat", title: "Team Chat Channels", category: "Navigation", url: "/chat", icon: MessageSquare, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { id: "pumps", title: "Pump Products Catalog", category: "Navigation", url: "/pumps", icon: Droplets, roles: ["admin", "manager", "storekeeper", "fieldwork", "ttl", "sales", "technician"] },
  { id: "sizing", title: "Pump Sizing Calculator", category: "Navigation", url: "/fieldwork/sizing", icon: Droplets, roles: ["admin", "manager", "fieldwork", "ttl", "sales"] },
  { id: "pos", title: "Point of Sale (POS)", category: "Navigation", url: "/pos", icon: ShoppingCart, roles: ["admin", "finance", "sales"] },
  { id: "inventory", title: "Inventory Store Management", category: "Navigation", url: "/inventory", icon: Package, roles: ["admin", "storekeeper"] },
  { id: "field-over", title: "Field Work Overview", category: "Navigation", url: "/fieldwork/overview", icon: Compass, roles: ["admin", "manager", "fieldwork", "ttl"] },
  { id: "field-jobs", title: "Field Operations & Jobs", category: "Navigation", url: "/fieldwork/jobs", icon: Briefcase, roles: ["admin", "fieldwork", "ttl"] },
  { id: "finance", title: "Finance Center", category: "Navigation", url: "/finance", icon: DollarSign, roles: ["admin", "finance"] },
  { id: "peachtree", title: "Peachtree 2010 Bridge", category: "Navigation", url: "/finance/peachtree", icon: FileUp, roles: ["admin", "finance"] },
  { id: "reports", title: "Business Performance Reports", category: "Navigation", url: "/reports", icon: BarChart3, roles: ["admin", "manager", "finance"] },
  { id: "hr", title: "HR & Workforce Hub", category: "Navigation", url: "/hr/dashboard", icon: Users, roles: ["admin", "hr"] },
  { id: "users", title: "User Accounts & Role Security", category: "Navigation", url: "/users", icon: Users, roles: ["admin"] },

  // Quick Operational Actions
  { id: "act-sizing", title: "Run New Solar Pump Sizing", category: "Quick Actions", url: "/fieldwork/sizing", icon: Droplets, roles: ["admin", "manager", "fieldwork", "ttl", "sales"] },
  { id: "act-expense", title: "Submit Expense Write-off Request", category: "Quick Actions", url: "/inbox", icon: DollarSign, roles: ["admin", "manager", "finance", "storekeeper", "fieldwork", "ttl", "sales", "technician", "attendance", "hr"] },
  { id: "act-reorder", title: "Request Warehouse Stock Reorder", category: "Quick Actions", url: "/inventory", icon: Package, roles: ["admin", "storekeeper"] },
];

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { hasAccess, currentUser } = useAuth();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    navigate(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex].url);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 bg-popover text-popover-foreground border border-border max-w-xl overflow-hidden shadow-2xl rounded-xl">
        {/* Clean Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <AnimatedZapIcon className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-xs font-semibold text-foreground tracking-wide">
                Quick Actions & Navigation
              </h3>
              <p className="text-[10px] text-muted-foreground">Meseret Mare ERP Command Center</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-border bg-background text-muted-foreground">
            {currentUser?.displayName || currentUser?.username} ({currentUser?.role})
          </Badge>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border px-4 py-2.5 bg-background">
          <Search className="h-4 w-4 text-muted-foreground mr-2.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, pages, or tools... (Ctrl + K)"
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.url)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors text-xs group ${
                    isSelected
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md transition-colors ${
                      isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={`text-xs ${isSelected ? "text-foreground font-semibold" : "text-foreground/90 font-medium"}`}>
                        {item.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded border border-border">
                        Jump <CornerDownLeft className="h-2.5 w-2.5" />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No matching commands found for your current role.
            </div>
          )}
        </div>

        {/* Minimal Clean Footer */}
        <div className="border-t border-border px-4 py-2 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-semibold text-foreground/80">
            Meseret Mare ERP
          </span>
          <div className="flex items-center gap-3 text-[10px]">
            <span><kbd className="bg-background px-1 py-0.5 rounded border border-border">↑</kbd> <kbd className="bg-background px-1 py-0.5 rounded border border-border">↓</kbd> navigate</span>
            <span><kbd className="bg-background px-1 py-0.5 rounded border border-border">↵</kbd> select</span>
            <span><kbd className="bg-background px-1 py-0.5 rounded border border-border">ESC</kbd> close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
