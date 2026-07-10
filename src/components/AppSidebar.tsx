import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Receipt,
  Droplets,
  Wrench,
  LogOut,
  DollarSign,
  Users,
  Wallet,
  Landmark,
  TrendingUp,
  Building,
  FileText,
  ChevronDown,
  Fingerprint,
  Settings,
  ClipboardList,
  Clock,
  FileUp,
  Compass,
  FlaskConical,
  Briefcase,
  Inbox,
  MessageSquare,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth, ROLE_LABELS, UserRole } from "@/context/AuthContext";
import { useStore, FinanceEntity } from "@/context/StoreContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWebSocket } from "@/context/WebSocketProvider";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: UserRole[];
  subItems?: {
    title: string;
    url: string;
    icon: React.ElementType;
    roles?: UserRole[];
  }[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["manager", "finance"] },
  { title: "Inbox", url: "/inbox", icon: Inbox, roles: ["manager", "finance", "storekeeper", "fieldwork", "attendance"] },
  { title: "Team Chat", url: "/chat", icon: MessageSquare, roles: ["manager", "finance", "storekeeper", "fieldwork", "attendance"] },
  { title: "Point of Sale", url: "/pos", icon: ShoppingCart, roles: ["manager"] },
  { title: "Inventory", url: "/inventory", icon: Package, roles: ["manager", "storekeeper", "finance", "fieldwork"] },
  { title: "Pump Products", url: "/pumps", icon: Droplets, roles: ["manager", "storekeeper", "fieldwork"] },
  { title: "Field Work Overview", url: "/fieldwork/overview", icon: Compass, roles: ["manager", "fieldwork"] },
  { title: "Pump Sizing", url: "/fieldwork/sizing", icon: Droplets, roles: ["manager", "fieldwork"] },
  { title: "Research", url: "/fieldwork/research", icon: FlaskConical, roles: ["manager", "fieldwork"] },
  { title: "Field Jobs", url: "/fieldwork/jobs", icon: Briefcase, roles: ["manager", "fieldwork"] },
  {
    title: "Finance Center",
    url: "/finance",
    icon: DollarSign,
    roles: ["manager", "finance"],
    subItems: [
      { title: "Dashboard", url: "/finance/dashboard", icon: LayoutDashboard },
      { title: "Cash Flow", url: "/finance/cashflow", icon: TrendingUp },
      { title: "Bank", url: "/finance/bank", icon: Building },
      { title: "Loans", url: "/finance/loans", icon: Landmark },
      { title: "Reconciliation", url: "/finance/bank-reconciliation", icon: FileText },
      { title: "Building Rent", url: "/finance/building-rent", icon: Building },
      { title: "Inventory", url: "/inventory", icon: Package },
      { title: "Budget", url: "/finance/budget", icon: BarChart3 },
      { title: "Payroll", url: "/finance/payroll", icon: Users },
      { title: "VAT", url: "/finance/vat", icon: Receipt },
      { title: "Petty Cash", url: "/finance/petty-cash", icon: Wallet },
      { title: "Peachtree Bridge", url: "/finance/peachtree", icon: FileUp, roles: ["manager", "finance"] },
      { title: "Financials", url: "/finance/financials", icon: BarChart3 },
      { title: "Legacy Reports", url: "/finance/reports", icon: FileText },
    ],
  },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["manager", "finance"] },
  { title: "VAT History", url: "/vat", icon: Receipt, roles: ["manager", "finance"] },
  { title: "User Accounts", url: "/users", icon: Users, roles: ["manager"] },
  {
    title: "HR & Attendance",
    url: "/hr",
    icon: Users,
    roles: ["manager", "attendance"],
    subItems: [
      { title: "Dashboard", url: "/hr/dashboard", icon: LayoutDashboard },
      { title: "Workers", url: "/hr/workers", icon: Users },
      { title: "Registration", url: "/hr/registration", icon: Fingerprint },
      { title: "Scan Page", url: "/hr/scan", icon: Clock },
      { title: "Reports", url: "/hr/reports", icon: ClipboardList },
      { title: "Settings", url: "/hr/settings", icon: Settings },
    ]
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { logout, currentUser, hasAccess } = useAuth();
  const { financeEntity, setFinanceEntity } = useStore();
  const allowedFinanceEntities = (currentUser?.companies || []).filter(
    (company) => company.code === "FZ" || company.code === "MM",
  ) as {
    id: string;
    code: FinanceEntity;
    name: string;
  }[];

  const [financeOpen, setFinanceOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
  const [fieldworkOpen, setFieldworkOpen] = useState(false);
  const { counts } = useWebSocket();
  const showFinanceEntitySwitch =
    !collapsed && location.pathname.startsWith("/finance") && hasAccess(["manager", "finance"]);

  useEffect(() => {
    if (location.pathname.startsWith("/finance")) {
      setFinanceOpen(true);
    }
    if (location.pathname.startsWith("/hr")) {
      setHrOpen(true);
    }
    if (location.pathname.startsWith("/fieldwork")) {
      setFieldworkOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!allowedFinanceEntities.length) return;
    const allowed = allowedFinanceEntities.some((company) => company.code === financeEntity);
    if (!allowed) {
      setFinanceEntity(allowedFinanceEntities[0].code);
    }
  }, [allowedFinanceEntities, financeEntity, setFinanceEntity]);

  const visibleItems = navItems.filter((item) => hasAccess(item.roles));

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 border-none bg-[#0b1324] text-white"
    >
      <SidebarHeader className="border-b border-white/10 px-3 py-3 overflow-hidden">
        <motion.div
          animate={{ height: collapsed ? 40 : 56 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          className="flex items-center justify-center w-full relative overflow-hidden"
        >
          <motion.img
            src="/uploads/logo3.jpg"
            alt="Meseret Mare Solar"
            animate={{
              height: collapsed ? 32 : 48,
            }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className={cn(
              "w-auto object-contain pointer-events-none select-none origin-center transition-all duration-200",
              collapsed ? "max-w-12" : ""
            )}
          />
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="bg-[#0b1324] mt-2 no-scrollbar">
        <SidebarGroup className={cn("transition-all duration-200", collapsed ? "p-2" : "pt-2 pb-2 pl-3 pr-0")}>
          <SidebarGroupLabel className="px-3 pt-3 text-[10px] uppercase tracking-[0.25em] text-white/40">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className={cn("transition-all duration-200 space-y-1", collapsed ? "px-2 py-2" : "p-0")}>
              {visibleItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isFinance = item.title === "Finance Center";
                const isHR = item.title === "HR & Attendance";
                const isFieldwork = item.title === "Field Work";
                const isOpen = isFinance ? financeOpen : isHR ? hrOpen : isFieldwork ? fieldworkOpen : false;

                return (
                  <SidebarMenuItem key={item.title}>
                    {hasSubItems ? (
                      <div className="flex flex-col gap-1 w-full">
                        <SidebarMenuButton
                          isActive={location.pathname.startsWith(item.url)}
                          tooltip={item.title}
                          className={cn(
                            "relative overflow-visible w-full text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-transparent data-[active=true]:text-primary-foreground transition-all duration-200 isolate",
                            collapsed 
                              ? "rounded-xl justify-center group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-2.5" 
                              : "rounded-l-xl rounded-r-none hover:rounded-l-xl hover:rounded-r-none"
                          )}
                          onClick={() => {
                            if (isFinance) setFinanceOpen(!financeOpen);
                            if (isHR) setHrOpen(!hrOpen);
                            if (isFieldwork) setFieldworkOpen(!fieldworkOpen);
                          }}
                        >
                          {location.pathname.startsWith(item.url) && (
                            <motion.div
                              layoutId="activeSidebarPill"
                              className={cn(
                                "absolute inset-0 bg-white -z-10",
                                collapsed
                                  ? "rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] border border-white/15"
                                  : "rounded-l-xl rounded-r-none border-l-4 border-secondary drop-shadow-[-6px_0_12px_rgba(0,0,0,0.25)] " +
                                    "before:content-[''] before:absolute before:right-0 before:bottom-full before:w-4 before:h-4 before:bg-[radial-gradient(circle_at_top_left,transparent_16px,#ffffff_16px)] before:pointer-events-none " +
                                    "after:content-[''] after:absolute after:right-0 after:top-full after:w-4 after:h-4 after:bg-[radial-gradient(circle_at_bottom_left,transparent_16px,#ffffff_16px)] after:pointer-events-none"
                              )}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          <div className={cn("relative z-10 flex items-center w-full cursor-pointer", collapsed ? "justify-center" : "")}>
                            <item.icon className={cn(
                              "shrink-0 transition-all duration-200",
                              collapsed ? "h-5 w-5" : "h-4 w-4",
                              location.pathname.startsWith(item.url) ? "text-[#0b1324]" : "text-white/80 group-hover:text-secondary"
                            )} />
                            <motion.span
                              animate={{
                                opacity: collapsed ? 0 : 1,
                                width: collapsed ? 0 : "auto",
                                marginLeft: collapsed ? 0 : 8,
                              }}
                              transition={{ duration: 0.15 }}
                              className={cn(
                                "text-sm font-bold whitespace-nowrap overflow-hidden transition-colors duration-200",
                                location.pathname.startsWith(item.url) ? "text-[#0b1324]" : "text-white/80"
                              )}
                            >
                              {item.title}
                            </motion.span>
                            {!collapsed && (
                              <ChevronDown
                                className={`ml-auto h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${location.pathname.startsWith(item.url) ? "text-[#0b1324]" : "text-white/60"}`}
                              />
                            )}
                          </div>
                        </SidebarMenuButton>

                        <AnimatePresence initial={false}>
                          {!collapsed && isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3 overflow-hidden"
                            >
                              {item.subItems?.filter((sub) => !sub.roles || hasAccess(sub.roles)).map((sub) => (
                                <SidebarMenuButton
                                  key={sub.title}
                                  isActive={location.pathname === sub.url}
                                  size="sm"
                                  className="h-auto p-0 hover:bg-transparent"
                                >
                                  <NavLink
                                    to={sub.url}
                                    className="flex w-full items-center rounded-lg px-2 py-2 text-white/65 transition-all hover:bg-white/8 hover:text-white"
                                    activeClassName="bg-white/10 text-primary font-semibold border-l-2 border-secondary/50"
                                  >
                                    <sub.icon className="mr-2 h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate text-[11px] uppercase tracking-wide">
                                      {sub.title}
                                    </span>
                                  </NavLink>
                                </SidebarMenuButton>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={
                          location.pathname === item.url ||
                          (item.url !== "/" && location.pathname.startsWith(item.url))
                        }
                        tooltip={item.title}
                        className={cn(
                          "relative overflow-visible w-full text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-transparent data-[active=true]:text-primary-foreground transition-all duration-200 isolate",
                          collapsed 
                            ? "rounded-xl justify-center group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-2.5" 
                            : "rounded-l-xl rounded-r-none hover:rounded-l-xl hover:rounded-r-none"
                        )}
                      >
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="flex items-center relative w-full h-full isolate"
                          activeClassName=""
                        >
                          {(location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url))) && (
                            <motion.div
                              layoutId="activeSidebarPill"
                              className={cn(
                                "absolute inset-0 bg-white -z-10",
                                collapsed
                                  ? "rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] border border-white/15"
                                  : "rounded-l-xl rounded-r-none border-l-4 border-secondary drop-shadow-[-6px_0_12px_rgba(0,0,0,0.25)] " +
                                    "before:content-[''] before:absolute before:right-0 before:bottom-full before:w-4 before:h-4 before:bg-[radial-gradient(circle_at_top_left,transparent_16px,#ffffff_16px)] before:pointer-events-none " +
                                    "after:content-[''] after:absolute after:right-0 after:top-full after:w-4 after:h-4 after:bg-[radial-gradient(circle_at_bottom_left,transparent_16px,#ffffff_16px)] after:pointer-events-none"
                              )}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          <div className={cn("relative z-10 flex items-center w-full", collapsed ? "justify-center" : "")}>
                            <item.icon className={cn(
                              "shrink-0 transition-all duration-200",
                              collapsed ? "h-5 w-5" : "h-4 w-4",
                              (location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url))) ? "text-[#0b1324]" : "text-white/80 group-hover:text-secondary"
                            )} />
                            <motion.span
                              animate={{
                                opacity: collapsed ? 0 : 1,
                                width: collapsed ? 0 : "auto",
                                marginLeft: collapsed ? 0 : 8,
                              }}
                              transition={{ duration: 0.15 }}
                              className={cn(
                                "text-sm font-bold whitespace-nowrap overflow-hidden transition-colors duration-200",
                                (location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url))) ? "text-[#0b1324]" : "text-white/80"
                              )}
                            >
                              {item.title}
                            </motion.span>
                            {!collapsed && item.title === "Inbox" && (counts.tasks > 0 || counts.notifications > 0) && (
                              <Badge variant="destructive" className="ml-auto rounded-full px-1.5 py-0 text-[10px] h-5 min-w-5 flex items-center justify-center">
                                {counts.tasks + counts.notifications}
                              </Badge>
                            )}
                            {!collapsed && item.title === "Team Chat" && counts.chat > 0 && (
                              <Badge variant="destructive" className="ml-auto rounded-full px-1.5 py-0 text-[10px] h-5 min-w-5 flex items-center justify-center">
                                {counts.chat}
                              </Badge>
                            )}
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {showFinanceEntitySwitch && (
              <div className="mx-2 mt-3 rounded-xl border border-white/10 bg-white/5 p-2">
                <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                  Company
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {allowedFinanceEntities.map((company) => (
                    <button
                      key={company.code}
                      type="button"
                      onClick={() => setFinanceEntity(company.code)}
                      className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
                        financeEntity === company.code
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {company.code}
                    </button>
                  ))}
                </div>
                <p className="mt-2 px-1 text-[10px] leading-4 text-white/45">
                  {allowedFinanceEntities.find((company) => company.code === financeEntity)?.name ||
                    (financeEntity === "FZ" ? "Fasil Zelalem" : "Meseret Mare")}
                </p>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 bg-[#0b1324] p-3 space-y-2 overflow-hidden">
        <AnimatePresence>
          {!collapsed && currentUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="rounded-xl bg-white/5 px-3 py-2 overflow-hidden"
            >
              <p className="text-sm font-semibold text-white truncate">
                {currentUser.displayName}
              </p>
              <Badge
                variant="outline"
                className="mt-1 border-primary/40 bg-primary/10 text-[10px] text-primary"
              >
                {ROLE_LABELS[currentUser.role]}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "w-full text-white/70 hover:bg-red-500/10 hover:text-red-300 flex items-center transition-all duration-200",
            collapsed ? "rounded-xl justify-center !size-10 !p-2.5" : "rounded-xl justify-start"
          )}
          onClick={logout}
        >
          <LogOut className={cn("shrink-0 transition-all duration-200", collapsed ? "h-5 w-5" : "h-4 w-4")} />
          <motion.span
            animate={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
              marginLeft: collapsed ? 0 : 8,
            }}
            transition={{ duration: 0.15 }}
            className="text-sm overflow-hidden whitespace-nowrap"
          >
            Logout
          </motion.span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
