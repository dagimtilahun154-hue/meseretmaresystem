import { useState, useMemo, useEffect } from "react";
import { format, differenceInCalendarDays, isAfter, parseISO } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Trash2,
  Search,
  Wrench,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Package,
  AlertTriangle,
  Edit,
  RotateCcw,
  Zap,
  Droplets,
  Sun,
  TrendingUp,
  Eye,
  Compass,
  FlaskConical,
  Briefcase,
  LayoutDashboard,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SecurityCodeDialog } from "@/components/SecurityCodeDialog";
import { toast } from "sonner";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api/client";
import { ClientFileModal } from "@/components/ClientFileModal";
import { FieldWork, FieldWorkEquipment, FieldWorker, ReturnForm } from "@/lib/fieldwork-data";
import { hierarchyRequestsDB, pumpProductsDB } from "@/lib/db-service";
import { useParams } from "react-router-dom";
import { WaterSource } from "@/lib/pump-sizing";
import ApprovalsInbox from "@/components/ApprovalsInbox";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CardHeader, CardTitle } from "@/components/ui/card";
import PumpSizingPage from "./PumpSizingPage";
type WorkerWithPosition = FieldWorker & {
  position?: string;
};

type CompletedSalePumpOption = {
  id: string;
  saleId: string;
  pumpName: string;
  customerName: string;
  location: string;
  items: any[];
  label: string;
};

const isPumpProduct = (item: any) => {
  const name = String(item.productName || "").toLowerCase();
  // Check if item name contains "pump" safely
  const hasPumpName = name.includes("pump") && !name.includes("controller") && !name.includes("accessory");

  // Also check if the item is explicitly in a pump-related category if we have that info
  // For now we'll stick to name matching but make it slightly more flexible
  return hasPumpName;
};

const getInclusiveDays = (startDate: string, endDate: string) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
};

const statusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  planning: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50",
  accepted: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50",
  submitted_tm: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/50",
  checked_tm: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50",
  approved_gm: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50",
  "Approved and ready to go": "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50",
  completed_ttl: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Assignment",
  planning: "Planning Crew/Tools",
  accepted: "TTL Accepted Planning",
  submitted_tm: "Awaiting TM Check",
  checked_tm: "Awaiting GM Approval",
  approved_gm: "Awaiting Finance Approval",
  "Approved and ready to go": "Approved & Ready to Go",
  completed_ttl: "Awaiting TM Return Sign-off",
  completed: "Installation Completed",
  done: "Completed & Done",
};

export default function FieldWorkPage() {
  const { section } = useParams<{ section: string }>();
  const { currentUser, users = [], hasAccess } = useAuth();
  const { fieldWorks, addFieldWork, updateFieldWork, deleteFieldWork: dbDeleteFieldWork, addReturnForm, sales = [], refreshStoreData } = useStore() as any;

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileModalProposal, setFileModalProposal] = useState<any | null>(null);
  
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [hrWorkersList, setHrWorkersList] = useState<any[]>([]);
  const [assigningTtlId, setAssigningTtlId] = useState<Record<string, string>>({});
  const [planningFwId, setPlanningFwId] = useState<string | null>(null);

  const ttlCandidates = useMemo(() => {
    const list: { username: string; displayName: string }[] = [];

    // 1. Add system user accounts (role 'ttl', 'fieldwork', 'technician')
    if (users && users.length > 0) {
      users.forEach((u: any) => {
        const uRole = u.role;
        const uRoles = u.roles || [];
        if (uRole === "ttl" || uRole === "fieldwork" || uRole === "technician" || uRoles.includes("ttl") || uRoles.includes("fieldwork")) {
          list.push({
            username: u.username,
            displayName: `${u.displayName} (${uRole === 'ttl' ? 'TTL' : uRole === 'fieldwork' ? 'Tech Manager' : 'Technician'})`,
          });
        }
      });
    }

    // 2. Add HR Field Technicians & Team Leaders
    if (hrWorkersList && hrWorkersList.length > 0) {
      hrWorkersList.forEach((w: any) => {
        const name = w.name || w.displayName;
        const username = w.id || name;
        if (!list.some((existing) => existing.username === username || existing.displayName.includes(name))) {
          list.push({
            username: username,
            displayName: `${name} (${w.position || "Field Technical Leader"})`,
          });
        }
      });
    }

    // Fallbacks if empty
    if (list.length === 0) {
      if (users && users.length > 0) {
        users.forEach((u: any) => {
          list.push({ username: u.username, displayName: `${u.displayName} (@${u.username})` });
        });
      } else {
        list.push(
          { username: "tech_leader", displayName: "Technical Team Leader (tech_leader)" },
          { username: "tech_manager", displayName: "Technical Manager (tech_manager)" }
        );
      }
    }

    return list;
  }, [users, hrWorkersList]);

  // States for planning form
  const [selectedPlanWorkers, setSelectedPlanWorkers] = useState<{ id: string; name: string; position: string; perDiem: number }[]>([]);
  const [selectedPlanTools, setSelectedPlanTools] = useState<string[]>([]);
  const [planNotes, setPlanNotes] = useState("");
  const [planFuelAmount, setPlanFuelAmount] = useState<string>("");
  const [planFuelPrice, setPlanFuelPrice] = useState<string>("");

  const refreshPlanningData = async () => {
    try {
      const [toolsRes, workersRes] = await Promise.all([
        apiClient.get("/company-assets"),
        apiClient.get("/hr/workers")
      ]);
      setAvailableTools(toolsRes.data.filter((t: any) => t.status === "WAREHOUSE"));
      setHrWorkersList(workersRes.data.filter((w: any) => w.status === "Active"));
    } catch (e) {
      console.error("Failed to load planning lists:", e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshPlanningData();
    }
  }, [currentUser]);

  const handleAssignJob = async (jobId: string) => {
    const defaultTtl = ttlCandidates[0]?.username || "tech_leader";
    const assignedTo = assigningTtlId[jobId] || defaultTtl;
    try {
      await apiClient.patch(`/fieldwork/${jobId}/assign`, { assignedTo });
      toast.success(`Job assigned to TTL ${assignedTo}`);
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to assign TTL");
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/accept`);
      toast.success("Job accepted. Planning interface unlocked.");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to accept job");
    }
  };

  const handleSubmitPlan = async (jobId: string) => {
    if (selectedPlanWorkers.length === 0) {
      toast.error("Please assign at least one worker.");
      return;
    }
    try {
      await apiClient.patch(`/fieldwork/${jobId}/submit-plan`, {
        workers: selectedPlanWorkers,
        notes: planNotes,
        companyTools: selectedPlanTools,
        fuelAmount: planFuelAmount ? parseFloat(planFuelAmount) : undefined,
        fuelPrice: planFuelPrice ? parseFloat(planFuelPrice) : undefined,
      });
      toast.success("Fieldwork plan submitted & tools checked out.");
      setSelectedPlanWorkers([]);
      setSelectedPlanTools([]);
      setPlanNotes("");
      setPlanFuelAmount("");
      setPlanFuelPrice("");
      setPlanningFwId(null);
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to submit plan");
    }
  };

  const handleTmCheck = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/tm-check`);
      toast.success("Plan checked and forwarded to General Manager.");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to check plan");
    }
  };

  const handleGmApprovePlan = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/gm-approve`);
      toast.success("Plan approved and forwarded to Finance.");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve plan");
    }
  };

  const handleFinanceApprove = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/finance-approve`);
      toast.success("Budget approved & ready to go!");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve budget");
    }
  };

  const [dailyReportText, setDailyReportText] = useState<Record<string, string>>({});

  const handleSendDailyReport = async (jobId: string) => {
    const text = dailyReportText[jobId];
    if (!text?.trim()) return;
    try {
      await apiClient.post(`/fieldwork/${jobId}/daily-report`, {
        content: text,
        submittedBy: currentUser?.displayName || currentUser?.username || "TTL",
      });
      toast.success("Daily report submitted successfully!");
      setDailyReportText(prev => ({ ...prev, [jobId]: "" }));
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to submit daily report");
    }
  };

  const handleForwardReport = async (jobId: string, reportId: string) => {
    try {
      await apiClient.post(`/fieldwork/${jobId}/daily-report/${reportId}/forward`);
      toast.success("Daily report forwarded to General Manager!");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to forward daily report");
    }
  };

  const handleCompleteJobTTL = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/complete`);
      toast.success("Fieldwork marked completed by TTL. Awaiting TM review of returns.");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to mark job complete");
    }
  };

  const handleApproveReturns = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/approve-returns`);
      toast.success("Returns approved. Fieldwork job is finalized and sale is complete!");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve returns");
    }
  };

  const [returnFormFW, setReturnFormFW] = useState<FieldWork | null>(null);
  const [editingFW, setEditingFW] = useState<FieldWork | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [securityOpen, setSecurityOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const completedSalePumpOptions: CompletedSalePumpOption[] = useMemo(() => {
    const result: CompletedSalePumpOption[] = [];
    const assignedSaleIds = new Set(fieldWorks.map((fw: FieldWork) => fw.saleId).filter(Boolean));

    sales.forEach((sale: any) => {
      if (assignedSaleIds.has(sale.id)) return;
      const saleItems = Array.isArray(sale.items) ? sale.items : [];
      const pumpItem = saleItems.find((item: any) => isPumpProduct(item));

      if (!pumpItem) return;

      const customerName = sale.customer?.name || "Unknown Customer";
      const location = [
        sale.customer?.location,
        sale.customer?.woreda,
        sale.customer?.region
      ].filter(Boolean).join(", ") || "N/A";

      const methodLabel = sale.paymentMethod === "Bank" ? ` (${sale.bankName})` :
        sale.paymentMethod === "Telebirr" ? " (Telebirr)" : " (Cash)";

      result.push({
        id: sale.id,
        saleId: sale.id,
        pumpName: pumpItem.productName,
        customerName,
        location,
        items: saleItems,
        label: `${pumpItem.productName} — ${customerName} — ${location} — Sale ${sale.id}${methodLabel}`,
      });
    });

    return result.reverse();
  }, [sales, fieldWorks]);

  const requestSecurity = (action: () => void) => {
    setPendingAction(() => action);
    setSecurityOpen(true);
  };

  const overdueAlerts = useMemo(() => {
    const today = new Date();
    return fieldWorks.filter(
      (fw: FieldWork) => (fw.status === "in-progress" || fw.status === "Approved and ready to go") && isAfter(today, parseISO(fw.endDate))
    );
  }, [fieldWorks]);

  const filtered = fieldWorks.filter((fw: FieldWork) => {
    const workerNames = fw.workers.map((w) => w.name.toLowerCase()).join(" ");
    const workerPositions = fw.workers.map((w: any) => (w.position || "").toLowerCase()).join(" ");
    const matchSearch =
      workerNames.includes(search.toLowerCase()) ||
      workerPositions.includes(search.toLowerCase()) ||
      fw.pumpModel.toLowerCase().includes(search.toLowerCase()) ||
      fw.location.toLowerCase().includes(search.toLowerCase());

    const matchStatus = filterStatus === "all" || fw.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeCount = fieldWorks.filter((fw: FieldWork) => 
    ["in-progress", "planning", "accepted", "submitted_tm", "checked_tm", "approved_gm", "Approved and ready to go", "completed_ttl"].includes(fw.status)
  ).length;

  const totalPerDiemAll = fieldWorks.reduce((sum: number, fw: FieldWork) => {
    const days = getInclusiveDays(fw.startDate, fw.endDate);
    const fwTotal = fw.workers.reduce((workerSum, worker) => workerSum + worker.perDiem * days, 0);
    return sum + fwTotal;
  }, 0);

  const completeFieldWork = async (id: string) => {
    await handleCompleteJobTTL(id);
  };

  const submitCrewForApproval = async (id: string) => {
    const fw = fieldWorks.find((f: FieldWork) => f.id === id);
    if (!fw) return;
    try {
      await hierarchyRequestsDB.create({
        title: `Crew Approval: Job ${fw.id}`,
        description: `Requesting crew approval for fieldwork job at ${fw.location} from ${fw.startDate} to ${fw.endDate}.\nAssembled Crew: ${fw.workers.map(w => `${w.name} (${w.position || "Tech"})`).join(", ")}`,
        amount: null,
        type: "GENERAL",
        comment: `Crew assembled by Technical Team Leader. Ready for deployment confirmation.`
      });
      toast.success("Crew allocation submitted for Manager approval!");
    } catch (e) {
      toast.error("Failed to submit crew for approval");
    }
  };

  const deleteFieldWork = async (id: string) => {
    await dbDeleteFieldWork(id);
    toast.success("Field work record deleted");
  };

  const openEdit = (fw: FieldWork) => {
    setEditingFW({
      ...fw,
      workers: fw.workers.map((w: any) => ({ ...w })),
      equipment: fw.equipment.map((e) => ({ ...e })),
    });
    setEditOpen(true);
  };

  const openReturnForm = (fw: FieldWork) => {
    setReturnFormFW(fw);
    setReturnFormOpen(true);
  };

  // --- Section routing ---
  if (section === "overview") {
    return <OverviewSection fieldWorks={fieldWorks} />;
  }
  if (section === "sizing") {
    return <PumpSizingPage />;
  }
  if (section === "research") {
    return <ResearchSection />;
  }

  // Default: "jobs" section — existing field work content
  return (
    <div className="space-y-6 animate-fade-in">
      <SecurityCodeDialog
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        onVerified={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Field Work</h1>
          <p className="text-sm text-muted-foreground">
            {fieldWorks.length} records
            {activeCount > 0 && <span className="text-warning ml-2">• {activeCount} active</span>}
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New Field Work
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Field Work Record</DialogTitle>
            </DialogHeader>
            <FieldWorkForm
              completedSalePumpOptions={completedSalePumpOptions}
              onSave={async (fw) => {
                await addFieldWork(fw);
                try {
                  const totalDays = getInclusiveDays(fw.startDate, fw.endDate);
                  const totalPerDiem = fw.workers.reduce((sum: number, w: any) => sum + w.perDiem * totalDays, 0);
                  const fuelCost = (Number(fw.fuelAmount) || 0) * (Number(fw.fuelPrice) || 0);
                  const totalAmount = totalPerDiem + fuelCost;

                  let fuelInfoStr = "";
                  if (fw.fuelAmount && fw.fuelPrice) {
                    fuelInfoStr = `\nFuel Request: ${fw.fuelAmount} L @ ${fw.fuelPrice} ETB/L (Fuel cost: ${fuelCost} ETB)`;
                  }

                  await hierarchyRequestsDB.create({
                    title: `Field Work Trip: ${fw.location}`,
                    description: `Fieldwork trip for ${fw.workers.map((w: any) => w.name).join(", ")} at ${fw.location} from ${fw.startDate} to ${fw.endDate}.\nPump Model: ${fw.pumpModel}${fuelInfoStr}\nTotal Per Diem: ${totalPerDiem} ETB\nNotes: ${fw.notes || ""}`,
                    amount: totalAmount,
                    type: "FIELD_TRIP",
                    comment: "Automatically generated from Field Work record creation."
                  });
                  toast.success("Field work trip budget request routed to manager!");
                } catch (e) {
                  console.error("Failed to auto-create workflow request:", e);
                }
                setAddOpen(false);
                toast.success("Field work created");
              }}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {overdueAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="font-medium text-destructive">Overdue Field Work Alerts</p>
            </div>
            <div className="space-y-1">
              {overdueAlerts.map((fw) => (
                <p key={fw.id} className="text-sm">
                  <span className="font-medium">{fw.id}</span> — {fw.workers.map((w) => w.name).join(", ")} at{" "}
                  {fw.location} (end date was {fw.endDate},{" "}
                  {differenceInCalendarDays(new Date(), parseISO(fw.endDate))} days overdue)
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary opacity-60" />
            <div>
              <p className="text-xs text-muted-foreground">Total Records</p>
              <p className="text-xl font-bold font-heading">{fieldWorks.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-warning opacity-60" />
            <div>
              <p className="text-xs text-muted-foreground">Active / In Progress</p>
              <p className="text-xl font-bold font-heading">{activeCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-success opacity-60" />
            <div>
              <p className="text-xs text-muted-foreground">Total Per Diem</p>
              <p className="text-xl font-bold font-heading">{totalPerDiemAll.toLocaleString()} ETB</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search worker, position, model, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Assignment</SelectItem>
                <SelectItem value="planning">Planning Crew/Tools</SelectItem>
                <SelectItem value="accepted">TTL Accepted</SelectItem>
                <SelectItem value="submitted_tm">Awaiting TM Check</SelectItem>
                <SelectItem value="checked_tm">Awaiting GM Approval</SelectItem>
                <SelectItem value="approved_gm">Awaiting Finance Approval</SelectItem>
                <SelectItem value="Approved and ready to go">Approved & Ready to Go</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filtered.map((fw) => {
              const isOverdue = (fw.status === "in-progress" || fw.status === "Approved and ready to go") && isAfter(new Date(), parseISO(fw.endDate));
              const totalDays = getInclusiveDays(fw.startDate, fw.endDate);
              const totalPerDiem = fw.workers.reduce((sum, w) => sum + (w.perDiem || 0) * totalDays, 0);

              return (
                <div key={fw.id} className={cn("border rounded-lg overflow-hidden", isOverdue && "border-destructive/50")}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === fw.id ? null : fw.id)}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="font-bold text-sm text-foreground">
                          {fw.customerName ? `${fw.customerName} (${fw.location || "Site"})` : (fw.location || "Fieldwork Job")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fw.workers.length > 0 ? `${fw.workers.length} crew worker(s) assigned` : "Crew planning pending"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/30">
                        {fw.pumpModel || "Solar Pump"}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-bold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1.5 px-2.5 py-0.5">
                        <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        TTL: {fw.assignedTo || "Unassigned"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {fw.startDate} → {fw.endDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                      <Badge
                        className={cn(
                          "border text-[10px] font-bold px-2 py-0.5 rounded-full",
                          statusColors[fw.status] || "bg-slate-100 text-slate-800"
                        )}
                      >
                        {statusLabels[fw.status] || fw.status}
                      </Badge>
                      {expandedId === fw.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {expandedId === fw.id && (
                    <div className="border-t p-4 bg-muted/20 space-y-4">
                      {/* Client File Quick Action Bar */}
                      <div className="flex justify-between items-center bg-card p-3 rounded-lg border">
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <Wrench className="h-4 w-4 text-primary" /> {fw.pumpModel || "Solar Pump Installation"} — {fw.customerName || fw.location}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>Location: {fw.location || "Site"}</span>
                            <span>•</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <UserCheck className="h-3 w-3 text-amber-600" /> Assigned TTL: {fw.assignedTo || "Unassigned"}
                            </span>
                            <span>•</span>
                            <span>Scheduled: {fw.startDate} → {fw.endDate}</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-bold text-xs border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => {
                            const p = fw.payload || {};
                            const clientFile = {
                              clientName: p.clientName || fw.customerName || fw.location,
                              address: p.address || fw.location,
                              selectedPumpModel: p.selectedPumpModel || fw.pumpModel,
                              waterSource: p.waterSource || '',
                              dailyWaterNeed: p.dailyWaterNeed,
                              pipeLength: p.pipeLength,
                              verticalLift: p.verticalLift,
                              totalPrice: p.totalPrice,
                              preparedByName: p.preparedByName || '',
                              checkedByName: p.checkedByName || '',
                              status: fw.status,
                              dataCollection: p.dataCollection || {},
                              calculatedEquipment: p.equipment || [],
                              latitude: p.latitude,
                              longitude: p.longitude,
                            };
                            setFileModalProposal(clientFile);
                            setFileModalOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" /> 📄 View Full Client File & Site Form
                        </Button>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Workers</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-2 font-medium">Name</th>
                                <th className="pb-2 font-medium">ID</th>
                                <th className="pb-2 font-medium">Position</th>
                                <th className="pb-2 font-medium text-right">1 Day Price</th>
                                <th className="pb-2 font-medium text-right">Days</th>
                                <th className="pb-2 font-medium text-right">Total Per Diem</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fw.workers.map((w: any, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-2 font-medium">{w.name}</td>
                                  <td className="py-2 text-muted-foreground">{w.id}</td>
                                  <td className="py-2">{w.position || "-"}</td>
                                  <td className="py-2 text-right">{w.perDiem.toLocaleString()} ETB</td>
                                  <td className="py-2 text-right">{totalDays}</td>
                                  <td className="py-2 text-right font-medium">
                                    {(w.perDiem * totalDays).toLocaleString()} ETB
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Equipment Tracking</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-2 font-medium">Equipment</th>
                                <th className="pb-2 font-medium text-center">Taken</th>
                                <th className="pb-2 font-medium text-center">Returned</th>
                                <th className="pb-2 font-medium text-center">Used</th>
                                <th className="pb-2 font-medium text-center">Unit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fw.equipment.map((eq, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-2 font-medium">{eq.name}</td>
                                  <td className="py-2 text-center">{eq.quantityTaken}</td>
                                  <td className="py-2 text-center text-primary">{eq.quantityReturned}</td>
                                  <td className="py-2 text-center text-success">{eq.quantityUsed}</td>
                                  <td className="py-2 text-center text-muted-foreground">{eq.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {fw.returnForms && fw.returnForms.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Return Forms</p>
                          <div className="space-y-2">
                            {fw.returnForms.map((rf) => (
                              <div key={rf.id} className="rounded-lg border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold">{rf.id}</span>
                                  <Badge
                                    className={
                                      rf.status === "approved"
                                        ? "bg-success/15 text-success border-success/20"
                                        : rf.status === "reviewed"
                                          ? "bg-info/15 text-info border-info/20"
                                          : "bg-warning/15 text-warning border-warning/20"
                                    }
                                  >
                                    {rf.status}
                                  </Badge>
                                </div>
                                <div className="text-xs space-y-1">
                                  <p><span className="text-muted-foreground">Worker:</span> {rf.workerName}</p>
                                  <p><span className="text-muted-foreground">Date:</span> {rf.date}</p>
                                  {rf.returnedMaterials.length > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">Returned:</span>
                                      {rf.returnedMaterials.map((m, mi) => (
                                        <span key={mi} className="ml-1">
                                          {m.name} x{m.quantity} ({m.condition})
                                          {mi < rf.returnedMaterials.length - 1 ? "," : ""}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {rf.comments && <p><span className="text-muted-foreground">Comments:</span> {rf.comments}</p>}
                                  {rf.otherNotes && <p><span className="text-muted-foreground">Notes:</span> {rf.otherNotes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Daily Progress Reports Section */}
                      <div className="rounded-lg border bg-card p-4 space-y-4 mt-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <CalendarIcon className="h-4 w-4 text-primary" /> Daily Progress Reports
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {(fw.dailyReports || []).length} reports
                          </Badge>
                        </div>

                        {/* Reports List */}
                        {fw.dailyReports && fw.dailyReports.length > 0 ? (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {fw.dailyReports.map((report: any) => (
                              <div key={report.id} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/40 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground">{report.submittedBy}</span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-muted-foreground">
                                      {format(report.date ? new Date(report.date) : new Date(), "yyyy-MM-dd HH:mm")}
                                    </span>
                                  </div>
                                  <div>
                                    {report.forwardedToGm ? (
                                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                                        Forwarded to GM
                                      </Badge>
                                    ) : (
                                       hasAccess(["fieldwork", "manager"]) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleForwardReport(fw.id, report.id)}
                                          className="h-6 text-[10px] px-2 py-0 border-primary text-primary hover:bg-primary/5"
                                        >
                                          Forward to GM
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-foreground whitespace-pre-wrap">{report.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2 italic">No daily progress reports submitted yet.</p>
                        )}

                        {/* Submit progress report if the job is active and logged user is TTL */}
                        {fw.status === "Approved and ready to go" && currentUser?.username === fw.assignedTo && (
                          <div className="space-y-2 border-t pt-3">
                            <Label className="text-xs font-semibold">Submit Daily Progress Report</Label>
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Type today's work progress, site challenges, or achievements..."
                                value={dailyReportText[fw.id] || ""}
                                onChange={(e) => setDailyReportText({ ...dailyReportText, [fw.id]: e.target.value })}
                                className="text-xs min-h-[60px] bg-background"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSendDailyReport(fw.id)}
                                className="self-end bg-primary text-white h-9 px-4 font-semibold"
                                disabled={!dailyReportText[fw.id]?.trim()}
                              >
                                Submit
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm flex-wrap">
                        <div>
                          <span className="text-muted-foreground">Duration: </span>
                          <span className="font-medium">{totalDays} days</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Per Diem: </span>
                          <span className="font-medium">{totalPerDiem.toLocaleString()} ETB</span>
                        </div>
                        {fw.notes && (
                          <div>
                            <span className="text-muted-foreground">Notes: </span>
                            <span>{fw.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* ROLE-BASED FLOW CONTROLS */}
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-dashed border-border space-y-4 text-sm mt-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-primary" /> Workflow Phase: {statusLabels[fw.status] || fw.status}
                          </p>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold font-mono">Job ID: {fw.id}</span>
                        </div>

                        {/* 1. Status: PENDING (Technical Manager Assigns TTL) */}
                        {fw.status === "pending" && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Awaiting Technical Manager review. Select a Technical Team Leader to assign this fieldwork installation job.</p>
                            {hasAccess(["fieldwork", "manager"]) ? (
                              <div className="flex items-center gap-3">
                                <Select
                                  value={assigningTtlId[fw.id] || (ttlCandidates[0]?.username || "tech_leader")}
                                  onValueChange={(val) => setAssigningTtlId({ ...assigningTtlId, [fw.id]: val })}
                                >
                                  <SelectTrigger className="w-64 h-9 bg-background">
                                    <SelectValue placeholder="Select TTL..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ttlCandidates.map((ttlUser) => (
                                      <SelectItem key={ttlUser.username} value={ttlUser.username}>
                                        {ttlUser.displayName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" onClick={() => handleAssignJob(fw.id)} className="bg-primary hover:bg-primary/95 text-white">
                                  Assign & Send to TTL
                                </Button>
                              </div>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting Technical Manager assignment...</Badge>
                            )}
                          </div>
                        )}

                        {/* 2. Status: PLANNING (Assigned to TTL, Awaiting Acceptance) */}
                        {fw.status === "planning" && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Assigned to: <strong className="text-foreground">{fw.assignedTo}</strong>. TTL must accept the fieldwork request to begin budget & crew allocation.</p>
                            {currentUser?.username === fw.assignedTo ? (
                              <Button size="sm" onClick={() => handleAcceptJob(fw.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                                Accept Fieldwork Job
                              </Button>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting acceptance by assigned TTL...</Badge>
                            )}
                          </div>
                        )}

                        {/* 3. Status: ACCEPTED (TTL Planning Form) */}
                        {fw.status === "accepted" && (
                          <div className="space-y-4">
                            <p className="text-xs text-muted-foreground">Job accepted by TTL. Enter crew configuration, daily per diem pricing, travel fuel budgets, and check out company tools.</p>
                            
                            {currentUser?.username === fw.assignedTo ? (
                              <div className="space-y-4">
                                {planningFwId !== fw.id ? (
                                  <Button size="sm" onClick={() => {
                                    setPlanningFwId(fw.id);
                                    setSelectedPlanWorkers([]);
                                    setSelectedPlanTools([]);
                                    setPlanNotes("");
                                    setPlanFuelAmount("");
                                    setPlanFuelPrice("");
                                  }} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                                    Configure Crew, Budget & Tools
                                  </Button>
                                ) : (
                                  <Card className="p-4 border bg-background space-y-4">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">Trip Planning & Budget Config</h4>
                                    
                                    {/* Worker Assigning */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-semibold">Assign Workers & Per Diem (ETB/day)</Label>
                                      {hrWorkersList.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/10 max-h-48 overflow-y-auto">
                                          {hrWorkersList.map((worker) => {
                                            const isSelected = selectedPlanWorkers.some(w => w.id === worker.id);
                                            const match = selectedPlanWorkers.find(w => w.id === worker.id);
                                            const currentPerDiem = match ? match.perDiem : 500;

                                            return (
                                              <div key={worker.id} className="flex items-center justify-between p-1.5 border rounded hover:bg-muted/30">
                                                <div className="flex items-center gap-2">
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      if (e.target.checked) {
                                                        setSelectedPlanWorkers([...selectedPlanWorkers, { id: worker.id, name: worker.fullName, position: worker.position || "Tech", perDiem: 500 }]);
                                                      } else {
                                                        setSelectedPlanWorkers(selectedPlanWorkers.filter(w => w.id !== worker.id));
                                                      }
                                                    }}
                                                    className="rounded border-gray-300 mr-2"
                                                  />
                                                  <div>
                                                    <span className="text-xs font-medium text-foreground">{worker.fullName}</span>
                                                    <span className="text-[10px] text-muted-foreground block">{worker.position || "Technician"}</span>
                                                  </div>
                                                </div>
                                                
                                                {isSelected && (
                                                  <div className="flex items-center gap-1.5">
                                                    <Input
                                                      type="number"
                                                      value={currentPerDiem}
                                                      onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setSelectedPlanWorkers(selectedPlanWorkers.map(w => w.id === worker.id ? { ...w, perDiem: val } : w));
                                                      }}
                                                      className="w-20 h-7 text-xs px-2 text-right bg-background border-border"
                                                    />
                                                    <span className="text-[10px] text-muted-foreground font-mono">ETB</span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">No active workers found in HR registry.</p>
                                      )}
                                    </div>

                                    {/* Fuel Budget */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Fuel Required (Liters)</Label>
                                        <Input
                                          type="number"
                                          placeholder="e.g. 50"
                                          value={planFuelAmount}
                                          onChange={(e) => setPlanFuelAmount(e.target.value)}
                                          className="h-8 text-xs bg-background"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Fuel Price per Liter (ETB/L)</Label>
                                        <Input
                                          type="number"
                                          placeholder="e.g. 85"
                                          value={planFuelPrice}
                                          onChange={(e) => setPlanFuelPrice(e.target.value)}
                                          className="h-8 text-xs bg-background"
                                        />
                                      </div>
                                    </div>

                                    {/* Company Tools Checklist */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-semibold">Check Out Reusable Company Tools (Warehouse)</Label>
                                      {availableTools.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/10 max-h-40 overflow-y-auto">
                                          {availableTools.map((tool) => (
                                            <label key={tool.id} className="flex items-center gap-2 p-1.5 border rounded hover:bg-muted/30 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={selectedPlanTools.includes(tool.id)}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setSelectedPlanTools([...selectedPlanTools, tool.id]);
                                                  } else {
                                                    setSelectedPlanTools(selectedPlanTools.filter(id => id !== tool.id));
                                                  }
                                                }}
                                                className="rounded border-gray-300 mr-2"
                                              />
                                              <div>
                                                <span className="text-xs font-medium text-foreground">{tool.name}</span>
                                                <span className="text-[9px] text-muted-foreground block font-mono">S/N: {tool.serialNumber}</span>
                                              </div>
                                            </label>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">All tools are checked out or in maintenance.</p>
                                      )}
                                    </div>

                                    {/* Plan Notes */}
                                    <div className="space-y-1">
                                      <Label className="text-xs font-semibold">Planning Notes / Comment</Label>
                                      <Textarea
                                        value={planNotes}
                                        onChange={(e) => setPlanNotes(e.target.value)}
                                        placeholder="Add trip logistics, accommodation details, or other notes..."
                                        rows={2}
                                        className="text-xs bg-background"
                                      />
                                    </div>

                                    {/* Calculated budget sum */}
                                    <div className="bg-primary/5 p-3 rounded border border-primary/20 flex justify-between items-center text-xs">
                                      <div>
                                        <span className="font-semibold text-primary block">Estimated Planning Budget</span>
                                        <span className="text-[10px] text-muted-foreground">Includes per-diem ({totalDays} days) + fuel requests.</span>
                                      </div>
                                      <div className="text-sm font-bold font-mono text-primary">
                                        {(
                                          selectedPlanWorkers.reduce((s, w) => s + (w.perDiem || 0) * totalDays, 0) +
                                          (parseFloat(planFuelAmount) || 0) * (parseFloat(planFuelPrice) || 0)
                                        ).toLocaleString()}{" "}
                                        ETB
                                      </div>
                                    </div>

                                    {/* Submit actions */}
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => setPlanningFwId(null)}>Cancel</Button>
                                      <Button size="sm" onClick={() => handleSubmitPlan(fw.id)} className="bg-purple-600 hover:bg-purple-700 text-white">
                                        Submit Fieldwork Plan & Check Out
                                      </Button>
                                    </div>
                                  </Card>
                                )}
                              </div>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting Acceptance or Planning by Assigned TTL...</Badge>
                            )}
                          </div>
                        )}

                        {/* 4. Status: SUBMITTED_TM (Awaiting TM Check) */}
                        {fw.status === "submitted_tm" && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Fieldwork plan has been formulated by the TTL. Technical Manager must review the crew and tools checkout list.</p>
                            
                            {/* Budget breakdown */}
                            <div className="text-xs p-3 rounded border bg-background font-mono space-y-1.5">
                              <p className="font-bold text-foreground mb-1 border-b pb-1">Budget Details:</p>
                              <p>• Assigned Crew: {(fw.payload?.workers || []).map((w: any) => `${w.name} (${w.position})`).join(', ') || 'N/A'}</p>
                              {fw.payload?.fuelAmount && (
                                <p>• Fuel Request: {fw.payload.fuelAmount} L @ {fw.payload.fuelPrice} ETB/L (Cost: {Number(fw.payload.fuelAmount * fw.payload.fuelPrice).toLocaleString()} ETB)</p>
                              )}
                              <p className="font-bold text-primary">• Total Travel Budget: {Number(fw.cost).toLocaleString()} ETB</p>
                            </div>

                            {hasAccess(["fieldwork", "manager"]) ? (
                              <Button size="sm" onClick={() => handleTmCheck(fw.id)} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                                TM Check & Sign Fieldwork Plan
                              </Button>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting Technical Manager verification...</Badge>
                            )}
                          </div>
                        )}

                        {/* 5. Status: CHECKED_TM (Awaiting GM Approve) */}
                        {fw.status === "checked_tm" && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Fieldwork plan verified by Technical Manager. General Manager signature is required.</p>
                            
                            <div className="text-xs p-3 rounded border bg-background font-mono space-y-1">
                              <p className="font-bold">• Travel Budget: {Number(fw.cost).toLocaleString()} ETB</p>
                              <p>• Assigned Crew: {(fw.payload?.workers || []).map((w: any) => w.name).join(', ')}</p>
                            </div>

                            {(currentUser?.role === 'manager' || currentUser?.roles?.includes('manager')) ? (
                              <Button size="sm" onClick={() => handleGmApprovePlan(fw.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                                GM Approve Fieldwork Plan
                              </Button>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting General Manager approval...</Badge>
                            )}
                          </div>
                        )}

                        {/* 6. Status: APPROVED_GM (Awaiting Finance Release) */}
                        {fw.status === "approved_gm" && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Fieldwork plan approved by General Manager. Finance Admin must confirm per-diem payment allocation.</p>
                            
                            <div className="text-xs p-3 rounded border bg-background font-mono space-y-1.5">
                              <p className="font-bold text-foreground">Budget Request Summary:</p>
                              <p>• Per-diem Budget: {Number(fw.cost).toLocaleString()} ETB</p>
                              <p>• Payment Reference: PAY-FW-{fw.id}</p>
                            </div>

                            {(currentUser?.role === 'finance' || currentUser?.roles?.includes('finance')) ? (
                              <Button size="sm" onClick={() => handleFinanceApprove(fw.id)} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                                Finance Release & Approve Budget
                              </Button>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting Finance budget confirmation...</Badge>
                            )}
                          </div>
                        )}

                        {/* 7. Status: Approved and ready to go (Ready to Go) */}
                        {fw.status === "Approved and ready to go" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 bg-green-500/10 p-3 rounded border border-green-500/20 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Approved and ready to go! Per diem budget released. Field crew is authorized.</span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground">Once installation is completed at the client site, click "Add Return Form" below to check back all checked out tools.</p>
                          </div>
                        )}

                        {/* 8. Status: COMPLETED_TTL */}
                        {fw.status === "completed_ttl" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 bg-teal-500/10 p-3 rounded border border-teal-500/20 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Installation marked as completed by TTL. Awaiting TM review of return forms.</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Technical Manager must verify the returned tools/materials details and approve returns to complete the sale.</p>
                            
                            {hasAccess(["fieldwork", "manager"]) ? (
                              <Button size="sm" onClick={() => handleApproveReturns(fw.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                Approve Returns & Complete Sale
                              </Button>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting Technical Manager verification and sign-off...</Badge>
                            )}
                          </div>
                        )}

                        {/* 9. Status: DONE / COMPLETED */}
                        {(fw.status === "completed" || fw.status === "done") && (
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded border border-emerald-500/20 text-xs font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>This installation job is finalized, tools checked back to the warehouse inventory, and the sale is complete.</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {fw.status !== "completed" && fw.status !== "done" && (
                          <Button size="sm" variant="outline" onClick={() => requestSecurity(() => openEdit(fw))}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                        )}
                        {fw.status === "Approved and ready to go" && currentUser?.username === fw.assignedTo && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openReturnForm(fw)}>
                              <RotateCcw className="h-4 w-4 mr-1" /> Add Return Form
                            </Button>
                            <Button size="sm" onClick={() => completeFieldWork(fw.id)}>
                              <UserCheck className="h-4 w-4 mr-1" /> Mark Completed
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => requestSecurity(() => deleteFieldWork(fw.id))}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">No field work records found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Field Work</DialogTitle>
          </DialogHeader>
          {editingFW && (
            <FieldWorkForm
              completedSalePumpOptions={completedSalePumpOptions}
              initialData={editingFW}
              onSave={async (fw) => {
                await updateFieldWork(fw.id, fw);
                setEditOpen(false);
                toast.success("Field work updated");
              }}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={returnFormOpen} onOpenChange={setReturnFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Return Form</DialogTitle>
          </DialogHeader>
          {returnFormFW && (
            <ReturnFormComponent
              fieldWork={returnFormFW}
              onSave={async (form) => {
                await addReturnForm(returnFormFW.id, form);
                await handleCompleteJobTTL(returnFormFW.id);
                setReturnFormOpen(false);
              }}
              onCancel={() => setReturnFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ClientFileModal
        open={fileModalOpen}
        onOpenChange={setFileModalOpen}
        proposal={fileModalProposal}
      />
    </div>
  );
}

// ─── OVERVIEW SECTION ───
function OverviewSection({ fieldWorks }: { fieldWorks: FieldWork[] }) {
  const activeCount = fieldWorks.filter((fw: FieldWork) => 
    ["in-progress", "planning", "accepted", "submitted_tm", "checked_tm", "approved_gm", "Approved and ready to go", "completed_ttl"].includes(fw.status)
  ).length;
  const completedCount = fieldWorks.filter((fw: FieldWork) => fw.status === "completed" || fw.status === "done").length;
  const pendingCount = fieldWorks.filter((fw: FieldWork) => fw.status === "pending").length;
  const totalJobs = fieldWorks.length;

  const stats = [
    { label: "Total Jobs", value: totalJobs, icon: Briefcase, color: "text-primary" },
    { label: "Active", value: activeCount, icon: TrendingUp, color: "text-yellow-600" },
    { label: "Completed", value: completedCount, icon: Eye, color: "text-green-600" },
    { label: "Pending", value: pendingCount, icon: Compass, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-heading">Field Work Overview</h1>
        <p className="text-sm text-muted-foreground">Quick view of operations and approvals</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{s.label}</p>
                  <p className={cn("text-3xl font-black mt-1", s.color)}>{s.value}</p>
                </div>
                <s.icon className={cn("h-8 w-8 opacity-30", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ApprovalsInbox />
    </div>
  );
}

// ─── PUMP SIZING SECTION ───
const FRICTION_FACTORS: Record<string, number> = {
  '1"': 0.05, '1.25"': 0.03, '1.5"': 0.02, '2"': 0.01, '2.5"': 0.01, '3"': 0.008, '4"': 0.005,
};

function sizingCalcTDH(waterSource: WaterSource, staticWaterLevel: number, tankHeight: number, pipeDistance: number, pipeSize: string): number {
  const lift = Number(tankHeight) || 0;
  const staticLevel = waterSource === "Borehole" ? (Number(staticWaterLevel) || 0) : 0;
  const frictionFactor = FRICTION_FACTORS[pipeSize] || 0.02;
  const frictionLoss = (Number(pipeDistance) || 0) * frictionFactor;
  return Number((lift + staticLevel + frictionLoss).toFixed(1));
}

function sizingCalcFlow(dailyNeedL: number, sunHours: number): number {
  if (dailyNeedL <= 0 || sunHours <= 0) return 0;
  return dailyNeedL / (1000 * sunHours);
}

function sizingInterpolateFlow(performanceData: { head: number; flow: number }[], targetHead: number): number {
  if (performanceData.length === 0) return 0;
  const sorted = [...performanceData].sort((a, b) => a.head - b.head);
  if (targetHead > sorted[sorted.length - 1].head) return 0;
  if (targetHead <= sorted[0].head) return sorted[0].flow;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (targetHead >= sorted[i].head && targetHead <= sorted[i + 1].head) {
      const h1 = sorted[i].head, h2 = sorted[i + 1].head;
      const f1 = sorted[i].flow, f2 = sorted[i + 1].flow;
      return Number((f1 + ((targetHead - h1) * (f2 - f1)) / (h2 - h1)).toFixed(2));
    }
  }
  return 0;
}

type SizingSuitability = "Suitable" | "Oversized" | "Low Capacity" | "Exceeds Limit";

function PumpSizingSection() {
  const [pumpModels, setPumpModels] = useState<any[]>([]);
  const [sizingData, setSizingData] = useState({
    waterSource: "Borehole" as WaterSource,
    purpose: "Irrigation",
    dailyWaterNeed: 15000,
    boreholeDepth: 60,
    staticWaterLevel: 25,
    tankHeight: 6,
    pipeDistance: 50,
    pipeSize: '1.5"',
    sunHours: 5,
  });
  const [results, setResults] = useState<{ pump: any; flowAtHead: number; suitability: SizingSuitability; tdh: number; reqFlow: number }[]>([]);
  const [summary, setSummary] = useState<{ tdh: number; reqFlowM3h: number; reqFlowLmin: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const dbPumps = await pumpProductsDB.getAll();
        const parsed = (dbPumps || []).map((p: any) => ({
          ...p,
          performanceData: typeof p.performanceData === "string" ? JSON.parse(p.performanceData) : (p.performanceData || []),
          equipment: typeof p.equipment === "string" ? JSON.parse(p.equipment) : (p.equipment || []),
        }));
        setPumpModels(parsed);
      } catch {
        toast.error("Could not load pump products");
      }
    };
    load();
  }, []);

  const runSizing = () => {
    const tdh = sizingCalcTDH(sizingData.waterSource, sizingData.staticWaterLevel, sizingData.tankHeight, sizingData.pipeDistance, sizingData.pipeSize);
    const reqFlowM3h = sizingCalcFlow(sizingData.dailyWaterNeed, sizingData.sunHours);
    const reqFlowLmin = Number((reqFlowM3h * 1000 / 60).toFixed(1));
    setSummary({ tdh, reqFlowM3h: Number(reqFlowM3h.toFixed(2)), reqFlowLmin });

    const matched = pumpModels
      .filter((p: any) => p.performanceData && p.performanceData.length > 0)
      .map((pump: any) => {
        const maxHead = Math.max(...pump.performanceData.map((d: any) => d.head));
        const flowAtHead = sizingInterpolateFlow(pump.performanceData, tdh);
        let suitability: SizingSuitability;
        if (tdh > maxHead) suitability = "Exceeds Limit";
        else if (flowAtHead <= 0) suitability = "Low Capacity";
        else if (flowAtHead >= reqFlowM3h * 1.5) suitability = "Oversized";
        else if (flowAtHead >= reqFlowM3h * 0.8) suitability = "Suitable";
        else suitability = "Low Capacity";
        return { pump, flowAtHead, suitability, tdh, reqFlow: reqFlowM3h };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { Suitable: 0, Oversized: 1, "Low Capacity": 2, "Exceeds Limit": 3 };
        return (order[a.suitability] ?? 4) - (order[b.suitability] ?? 4);
      });
    setResults(matched);
    if (matched.length === 0) toast.info("No pump models with performance data found.");
  };

  const suitColor = (s: SizingSuitability) => {
    if (s === "Suitable") return "border-green-400 bg-green-50 dark:bg-green-950/20";
    if (s === "Oversized") return "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20";
    if (s === "Low Capacity") return "border-orange-400 bg-orange-50 dark:bg-orange-950/20";
    return "border-red-400 bg-red-50 dark:bg-red-950/20";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" /> Pump Sizing Tool
        </h1>
        <p className="text-sm text-muted-foreground">Calculate TDH and match suitable pump models</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Technical Requirements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Purpose</Label>
                <Select value={sizingData.purpose} onValueChange={(v) => setSizingData({ ...sizingData, purpose: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Irrigation">Irrigation</SelectItem>
                    <SelectItem value="Drinking">Drinking Water</SelectItem>
                    <SelectItem value="Livestock">Livestock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Daily Need (L)</Label>
                <Input type="number" className="h-8 text-xs" value={sizingData.dailyWaterNeed} onChange={(e) => setSizingData({ ...sizingData, dailyWaterNeed: e.target.value === "" ? "" : Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Water Source</Label>
                <Select value={sizingData.waterSource} onValueChange={(v: WaterSource) => setSizingData({ ...sizingData, waterSource: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Borehole">Borehole</SelectItem>
                    <SelectItem value="River">River</SelectItem>
                    <SelectItem value="Pond">Pond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sizingData.waterSource === "Borehole" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-primary font-bold">Borehole Depth (m)</Label>
                  <Input type="number" className="h-8 text-xs" value={sizingData.boreholeDepth} onChange={(e) => setSizingData({ ...sizingData, boreholeDepth: e.target.value === "" ? "" : Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-primary font-bold">Static Level (m)</Label>
                  <Input type="number" className="h-8 text-xs" value={sizingData.staticWaterLevel} onChange={(e) => setSizingData({ ...sizingData, staticWaterLevel: e.target.value === "" ? "" : Number(e.target.value) })} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Lift (m)</Label>
                <Input type="number" className="h-8 text-xs" value={sizingData.tankHeight} onChange={(e) => setSizingData({ ...sizingData, tankHeight: e.target.value === "" ? "" : Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Distance (m)</Label>
                <Input type="number" className="h-8 text-xs" value={sizingData.pipeDistance} onChange={(e) => setSizingData({ ...sizingData, pipeDistance: e.target.value === "" ? "" : Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Sun Hours</Label>
                <Input type="number" className="h-8 text-xs" value={sizingData.sunHours} onChange={(e) => setSizingData({ ...sizingData, sunHours: e.target.value === "" ? "" : Number(e.target.value) })} />
              </div>
            </div>

            <Button className="w-full h-11 font-bold" onClick={runSizing}>
              <Zap className="h-4 w-4 mr-2" /> Match Suitable Pumps
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary">Recommendations</h3>
          {summary && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <div className="text-center">
                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">TDH</p>
                <p className="text-lg font-black text-primary">{summary.tdh}<span className="text-[10px] font-normal text-muted-foreground"> m</span></p>
              </div>
              <div className="text-center border-x border-primary/10">
                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Need</p>
                <p className="text-lg font-black text-primary">{summary.reqFlowM3h}<span className="text-[10px] font-normal text-muted-foreground"> m³/h</span></p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Need</p>
                <p className="text-lg font-black text-primary">{summary.reqFlowLmin}<span className="text-[10px] font-normal text-muted-foreground"> L/min</span></p>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {results.length > 0 ? (
              results.map((res) => (
                <div key={res.pump.id} className={cn("rounded-2xl border-2 p-4 transition-all", suitColor(res.suitability))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{res.pump.model}</p>
                      <p className="text-xs text-muted-foreground">{res.pump.brand} · {res.pump.power}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-xs font-bold",
                      res.suitability === "Suitable" ? "bg-green-100 text-green-700" :
                      res.suitability === "Oversized" ? "bg-yellow-100 text-yellow-700" :
                      res.suitability === "Low Capacity" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {res.suitability}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Flow @ TDH:</span> <strong>{res.flowAtHead.toFixed(2)} m³/h</strong></div>
                    <div><span className="text-muted-foreground">TDH:</span> <strong>{res.tdh} m</strong></div>
                    <div><span className="text-muted-foreground">Required:</span> <strong>{res.reqFlow.toFixed(2)} m³/h</strong></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                Enter requirements and click "Match Suitable Pumps" to see results.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RESEARCH SECTION ───
function ResearchSection() {
  const [pumps, setPumps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await pumpProductsDB.getAll();
        const parsed = (data || []).map((p: any) => ({
          ...p,
          performanceData: typeof p.performanceData === "string" ? JSON.parse(p.performanceData) : (p.performanceData || []),
          equipment: typeof p.equipment === "string" ? JSON.parse(p.equipment) : (p.equipment || []),
          technicalData: typeof p.technicalData === "string" ? JSON.parse(p.technicalData) : (p.technicalData || []),
        }));
        setPumps(parsed);
      } catch {
        toast.error("Could not load pump catalog");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = pumps.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.model?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.firstCategory?.toLowerCase().includes(q) || p.power?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" /> Pump Research
          </h1>
          <p className="text-sm text-muted-foreground">Browse and compare all pump models ({pumps.length} products)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 w-64" placeholder="Search model, brand, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          No pump models match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pump) => {
            const isExpanded = expandedId === pump.id;
            const maxHead = pump.performanceData.length > 0 ? Math.max(...pump.performanceData.map((d: any) => d.head)) : 0;
            const maxFlow = pump.performanceData.length > 0 ? Math.max(...pump.performanceData.map((d: any) => d.flow)) : 0;
            return (
              <Card key={pump.id} className={cn("transition-all cursor-pointer hover:shadow-lg", isExpanded && "col-span-1 md:col-span-2 lg:col-span-3")}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between" onClick={() => setExpandedId(isExpanded ? null : pump.id)}>
                    <div>
                      <p className="font-bold text-base">{pump.model}</p>
                      <p className="text-xs text-muted-foreground">{pump.brand} · {pump.firstCategory}</p>
                      <div className="flex gap-2 mt-2">
                        {pump.power && <Badge variant="outline" className="text-[10px]"><Zap className="h-3 w-3 mr-1" />{pump.power}</Badge>}
                        {pump.voltage && <Badge variant="outline" className="text-[10px]"><Sun className="h-3 w-3 mr-1" />{pump.voltage}</Badge>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {maxHead > 0 && <p>Max Head: <strong>{maxHead}m</strong></p>}
                      {maxFlow > 0 && <p>Max Flow: <strong>{maxFlow} m³/h</strong></p>}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4 animate-in fade-in slide-in-from-top-1">
                      {pump.description && <p className="text-sm text-muted-foreground">{pump.description}</p>}

                      {pump.performanceData.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Performance Curve</p>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={[...pump.performanceData].sort((a: any, b: any) => a.flow - b.flow)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="flow" label={{ value: "Flow (m³/h)", position: "insideBottom", offset: -5, fontSize: 10 }} tick={{ fontSize: 10 }} />
                                <YAxis label={{ value: "Head (m)", angle: -90, position: "insideLeft", fontSize: 10 }} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="head" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {pump.equipment.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Kit Equipment ({pump.equipment.length} items)</p>
                          <div className="grid grid-cols-2 gap-1">
                            {pump.equipment.map((eq: any, i: number) => (
                              <div key={i} className="text-xs p-2 bg-muted rounded flex justify-between">
                                <span>{eq.name}</span>
                                <span className="font-mono text-muted-foreground">×{eq.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}



function ReturnFormComponent({
  fieldWork,
  onSave,
  onCancel,
}: {
  fieldWork: FieldWork;
  onSave: (form: ReturnForm) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [workerName, setWorkerName] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [materials, setMaterials] = useState<{ productId?: string; name: string; quantity: number; condition: string }[]>([
    { name: "", quantity: 1, condition: "Good" },
  ]);
  const [comments, setComments] = useState("");
  const [otherNotes, setOtherNotes] = useState("");
  
  const [checkedOutTools, setCheckedOutTools] = useState<any[]>([]);
  const [toolReturns, setToolReturns] = useState<Record<string, { condition: string; notes: string }>>({});

  useEffect(() => {
    const fetchCheckedOutTools = async () => {
      try {
        const response = await apiClient.get(`/fieldwork-assets/job/${fieldWork.id}`);
        setCheckedOutTools(response.data);
        const initialStates: Record<string, { condition: string; notes: string }> = {};
        response.data.forEach((item: any) => {
          if (item.status === 'CHECKED_OUT') {
            initialStates[item.companyAssetId] = { condition: 'GOOD', notes: '' };
          }
        });
        setToolReturns(initialStates);
      } catch (e) {
        console.error("Failed to load checked out tools:", e);
      }
    };
    fetchCheckedOutTools();
  }, [fieldWork.id]);

  const addMaterial = () => {
    setMaterials([...materials, { name: "", quantity: 1, condition: "Good" }]);
  };

  const updateMaterial = (index: number, field: string, value: string | number) => {
    setMaterials(materials.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const selectMaterial = (index: number, value: string) => {
    const selected = fieldWork.equipment.find((eq) => (eq.productId || eq.name) === value);
    if (!selected) return;
    setMaterials(materials.map((m, i) => (
      i === index ? { ...m, productId: selected.productId, name: selected.name } : m
    )));
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!workerName.trim()) {
      toast.error("Select a worker");
      return;
    }

    const validMaterials = materials.filter((m) => m.name.trim());
    if (validMaterials.length === 0) {
      toast.error("Add at least one returned material");
      return;
    }

    // Submit tool returns
    const activeCheckouts = checkedOutTools.filter(t => t.status === 'CHECKED_OUT');
    if (activeCheckouts.length > 0) {
      const returns = activeCheckouts.map(item => ({
        companyAssetId: item.companyAssetId,
        condition: toolReturns[item.companyAssetId]?.condition || 'GOOD',
        notes: toolReturns[item.companyAssetId]?.notes || '',
      }));
      try {
        await apiClient.post('/fieldwork-assets/return', {
          fieldWorkJobId: fieldWork.id,
          returns
        });
        toast.success("Company tools returned successfully!");
      } catch (e: any) {
        console.error(e);
        toast.error("Failed to return some company tools. Please check asset conditions.");
        return;
      }
    }

    onSave({
      id: `RF${Date.now().toString().slice(-6)}`,
      fieldWorkId: fieldWork.id,
      workerName,
      date: format(date, "yyyy-MM-dd"),
      returnedMaterials: validMaterials,
      comments,
      otherNotes,
      status: "pending",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Worker Name</Label>
        <Select value={workerName} onValueChange={setWorkerName}>
          <SelectTrigger>
            <SelectValue placeholder="Select worker..." />
          </SelectTrigger>
          <SelectContent>
            {fieldWork.workers.map((w) => (
              <SelectItem key={w.id} value={w.name}>
                {w.name} ({w.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Return Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Returned Materials</Label>
          <Button variant="outline" size="sm" onClick={addMaterial}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {materials.map((m, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Select value={m.productId || m.name} onValueChange={(v) => selectMaterial(i, v)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Material..." />
              </SelectTrigger>
              <SelectContent>
                {fieldWork.equipment.map((eq) => (
                  <SelectItem key={eq.productId || eq.name} value={eq.productId || eq.name}>
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="w-16"
              type="number"
              min={1}
              value={m.quantity === "" ? "" : m.quantity}
              onChange={(e) => updateMaterial(i, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
            />

            <Select value={m.condition} onValueChange={(v) => updateMaterial(i, "condition", v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Damaged">Damaged</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={() => removeMaterial(i)} disabled={materials.length === 1}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Reusable Company Tools Return Section */}
      {checkedOutTools.length > 0 && checkedOutTools.some(t => t.status === 'CHECKED_OUT') && (
        <div className="space-y-3 border-t pt-4">
          <Label className="text-sm font-medium text-primary">Checked Out Company Tools Return Checklist</Label>
          <p className="text-xs text-muted-foreground">Select the return condition for each company tool. Lost tools will remain flagged in the system.</p>
          <div className="space-y-3">
            {checkedOutTools.map((t) => {
              if (t.status !== 'CHECKED_OUT') return null;
              const assetName = t.asset?.name || "Company Asset";
              const assetSerial = t.asset?.serialNumber || "";
              const val = toolReturns[t.companyAssetId] || { condition: 'GOOD', notes: '' };

              return (
                <Card key={t.id} className="p-3 bg-muted/20 border border-muted">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-xs text-foreground">{assetName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">S/N: {assetSerial}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={val.condition}
                        onChange={(e) => setToolReturns({
                          ...toolReturns,
                          [t.companyAssetId]: { ...val, condition: e.target.value }
                        })}
                        className="flex h-9 w-36 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="GOOD">Good Condition</option>
                        <option value="FAIR">Fair Condition</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="LOST">Lost / Missing</option>
                      </select>
                      
                      <Input
                        placeholder="Return notes..."
                        value={val.notes}
                        onChange={(e) => setToolReturns({
                          ...toolReturns,
                          [t.companyAssetId]: { ...val, notes: e.target.value }
                        })}
                        className="h-9 text-xs w-48 bg-background border-border"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Comments</Label>
        <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Work summary, observations..." />
      </div>

      <div className="space-y-1.5">
        <Label>Other Notes</Label>
        <Textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} placeholder="Additional information..." />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}>Submit Return & Complete Job</Button>
      </div>
    </div>
  );
}

function FieldWorkForm({
  onSave,
  onCancel,
  initialData,
  completedSalePumpOptions,
}: {
  onSave: (fw: FieldWork) => void | Promise<void>;
  onCancel: () => void;
  initialData?: FieldWork;
  completedSalePumpOptions: CompletedSalePumpOption[];
}) {
  const [startDate, setStartDate] = useState<Date>(initialData ? parseISO(initialData.startDate) : new Date());
  const [endDate, setEndDate] = useState<Date>(initialData ? parseISO(initialData.endDate) : new Date());
  const [workers, setWorkers] = useState<WorkerWithPosition[]>(
    initialData?.workers?.length
      ? (initialData.workers as WorkerWithPosition[])
      : [{ name: "", id: "", position: "", behaviorRating: 3, perDiem: "", payment: "" }]
  );
  const [pumpModel, setPumpModel] = useState(initialData?.pumpModel || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [equipment, setEquipment] = useState<FieldWorkEquipment[]>(
    initialData?.equipment || []
  );
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [fuelAmount, setFuelAmount] = useState<number | "">(
    initialData?.fuelAmount !== undefined ? initialData.fuelAmount : ""
  );
  const [fuelPrice, setFuelPrice] = useState<number | "">(
    initialData?.fuelPrice !== undefined ? initialData.fuelPrice : ""
  );

  const totalDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);

  const addWorker = () => {
    setWorkers([
      ...workers,
      { name: "", id: "", position: "", behaviorRating: 3, perDiem: "", payment: "" },
    ]);
  };

  const updateWorker = (
    index: number,
    field: keyof WorkerWithPosition,
    value: string | number
  ) => {
    setWorkers(workers.map((w, i) => (i === index ? { ...w, [field]: value } : w)));
  };

  const removeWorker = (index: number) => {
    setWorkers(workers.filter((_, i) => i !== index));
  };

  const handleCompletedSaleSelect = (saleId: string) => {
    setSelectedSaleId(saleId);

    const selectedSale = completedSalePumpOptions.find((item) => item.saleId === saleId);
    if (!selectedSale) return;

    setPumpModel(selectedSale.pumpName);
    setLocation(selectedSale.location);

    const loadedEquipment: FieldWorkEquipment[] = selectedSale.items.map((item: any) => ({
      productId: item.productId,
      name: item.productName || "Unknown Item",
      quantityTaken: Number(item.quantity || 1),
      quantityReturned: 0,
      quantityUsed: 0,
      unit: "Piece",
    }));

    setEquipment(loadedEquipment);
    toast.success("Completed sale product selected and equipment loaded");
  };

  const handleSave = () => {
    const validWorkers = workers.filter((w) => w.name.trim());

    if (validWorkers.length === 0) {
      toast.error("Add at least one worker");
      return;
    }

    if (validWorkers.some((w) => !w.id.trim())) {
      toast.error("Enter ID for all workers");
      return;
    }

    if (validWorkers.some((w) => !(w.position || "").trim())) {
      toast.error("Enter position for all workers");
      return;
    }

    if (!selectedSaleId && !initialData) {
      toast.error("Select completed sale pump product");
      return;
    }

    if (equipment.length === 0) {
      toast.error("No equipment loaded from completed sale");
      return;
    }

    onSave({
      id: initialData?.id || `FW${Date.now().toString().slice(-6)}`,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      workers: validWorkers.map((w) => ({
        ...w,
        behaviorRating: 3,
        payment: "",
      })) as any,
      pumpModel: pumpModel || "N/A",
      location,
      status: initialData?.status || "in-progress",
      equipment,
      notes,
      saleId: selectedSaleId || initialData?.saleId || null,
      fuelAmount: fuelAmount === "" ? undefined : Number(fuelAmount),
      fuelPrice: fuelPrice === "" ? undefined : Number(fuelPrice),
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Completed Sale Pump Product</Label>
        <Select value={selectedSaleId} onValueChange={handleCompletedSaleSelect} disabled={!!initialData}>
          <SelectTrigger>
            <SelectValue placeholder="Select completed sale pump product" />
          </SelectTrigger>
          <SelectContent>
            {completedSalePumpOptions.length > 0 ? (
              completedSalePumpOptions.map((item) => (
                <SelectItem key={item.saleId} value={item.saleId}>
                  {item.label}
                </SelectItem>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No completed sale pump product found
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Workers</Label>
          <Button variant="outline" size="sm" onClick={addWorker}>
            <Plus className="h-3 w-3 mr-1" /> Add Worker
          </Button>
        </div>

        {workers.map((w, i) => (
          <Card key={i} className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={w.name}
                  onChange={(e) => updateWorker(i, "name", e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Worker ID</Label>
                <Input
                  value={w.id}
                  onChange={(e) => updateWorker(i, "id", e.target.value)}
                  placeholder="WK-xxx"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Position</Label>
                <Select
                  value={w.position || ""}
                  onValueChange={(value) => updateWorker(i, "position", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="team leader">Team Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">1 Day Price (ETB)</Label>
                <Input
                  type="number"
                  min={0}
                  value={w.perDiem === "" ? "" : w.perDiem}
                  onChange={(e) => updateWorker(i, "perDiem", e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Total Per Diem</Label>
                <Input value={`${(w.perDiem * totalDays).toLocaleString()} ETB`} readOnly />
              </div>

              <div className="sm:col-span-2 lg:col-span-5 flex items-end justify-between">
                <p className="text-xs text-muted-foreground">
                  {totalDays} day(s) × {w.perDiem.toLocaleString()} ETB = {(w.perDiem * totalDays).toLocaleString()} ETB
                </p>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeWorker(i)}
                  disabled={workers.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(endDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => d && setEndDate(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / Site" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-xl bg-muted/20">
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <Label className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Fuel Requirements</Label>
        </div>
        <div className="space-y-1.5">
          <Label>Fuel Amount (Liters)</Label>
          <Input
            type="number"
            placeholder="e.g. 50"
            value={fuelAmount}
            onChange={(e) => setFuelAmount(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fuel Price (ETB per Liter)</Label>
          <Input
            type="number"
            placeholder="e.g. 85"
            value={fuelPrice}
            onChange={(e) => setFuelPrice(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        {fuelAmount && fuelPrice && (
          <div className="col-span-1 md:col-span-2 text-xs text-muted-foreground">
            Estimated Fuel Cost: <strong className="text-foreground">{((Number(fuelAmount) || 0) * (Number(fuelPrice) || 0)).toLocaleString()} ETB</strong>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total duration: </span>
        <span className="font-medium">{totalDays} day(s)</span>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">Equipment Loaded From Completed Sale</Label>

        {equipment.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-medium">Equipment</th>
                  <th className="p-3 font-medium text-center">Taken</th>
                  <th className="p-3 font-medium text-center">Returned</th>
                  <th className="p-3 font-medium text-center">Used</th>
                  <th className="p-3 font-medium text-center">Unit</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3 font-medium">{eq.name}</td>
                    <td className="p-3 text-center">{eq.quantityTaken}</td>
                    <td className="p-3 text-center">{eq.quantityReturned}</td>
                    <td className="p-3 text-center">{eq.quantityUsed}</td>
                    <td className="p-3 text-center">{eq.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Select completed sale pump product to load equipment automatically.
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>{initialData ? "Update" : "Create"} Field Work</Button>
      </div>
    </div>
  );
}
