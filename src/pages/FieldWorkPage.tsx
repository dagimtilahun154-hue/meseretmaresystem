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
  Camera,
  Users,
  Truck,
  Send,
  Download,
  ClipboardCheck,
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
import { ExecutiveDocumentPdfTemplate } from "@/components/pdf/ExecutiveDocumentPdfTemplate";
import { NasaSolarResearchWidget } from "@/components/research/NasaSolarResearchWidget";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SecurityCodeDialog } from "@/components/SecurityCodeDialog";
import { toast } from "sonner";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api/client";
import { ClientFileModal } from "@/components/ClientFileModal";
import { FieldWork, FieldWorkEquipment, FieldWorker, ReturnForm, PlannedMaterialItem, MaterialSource } from "@/lib/fieldwork-data";
import { FieldWorkMaterialPlanning } from "@/components/fieldwork/FieldWorkMaterialPlanning";
import { hierarchyRequestsDB, pumpProductsDB } from "@/lib/db-service";
import { useParams } from "react-router-dom";
import { WaterSource } from "@/lib/pump-sizing";
import ApprovalsInbox from "@/components/ApprovalsInbox";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CardHeader, CardTitle } from "@/components/ui/card";
import PumpSizingPage from "./PumpSizingPage";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1").replace("/api/v1", "");
const getFullImgUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith("/uploads/") ? `${API_BASE}${url}` : url;
};

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
  const name = String(item.productName || item.name || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  return (
    name.includes("pump") ||
    category.includes("pump") ||
    name.includes("solar") ||
    name.includes("difful") ||
    name.includes("water") ||
    name.includes("3spsp") ||
    name.includes("4spsp") ||
    name.includes("deep") ||
    name.includes("well") ||
    name.includes("surface") ||
    name.includes("ac") ||
    name.includes("dc")
  );
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
  crew_dispatched: "Crew Dispatched & Active",
  completed_ttl: "Awaiting TM Return Sign-off",
  completed: "Installation Completed",
  done: "Completed & Done",
};

export default function FieldWorkPage({ standalone = true, preSelectedCustomerId }: any) {
  const { section } = useParams<{ section: string }>();
  const { currentUser, users = [], hasAccess } = useAuth();
  const { products, fieldWorks, addFieldWork, updateFieldWork, deleteFieldWork: dbDeleteFieldWork, addReturnForm, sales = [], refreshStoreData } = useStore() as any;

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileModalProposal, setFileModalProposal] = useState<any | null>(null);
  
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [hrWorkersList, setHrWorkersList] = useState<any[]>([]);
  const [assigningTtlId, setAssigningTtlId] = useState<Record<string, string>>({});
  const [planningFwId, setPlanningFwId] = useState<string | null>(null);
  const [checklistChecked, setChecklistChecked] = useState<Record<string, Record<string, boolean>>>({});

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
  const [plannedMaterials, setPlannedMaterials] = useState<PlannedMaterialItem[]>([]);
  const [plannedPumpSerial, setPlannedPumpSerial] = useState<string>("");
  const [plannedPumpSource, setPlannedPumpSource] = useState<MaterialSource>("FROM_STOCK");
  const [planNotes, setPlanNotes] = useState("");
  const [planFuelAmount, setPlanFuelAmount] = useState<string>("");
  const [planFuelPrice, setPlanFuelPrice] = useState<string>("");
  const [planStartDate, setPlanStartDate] = useState<string>("");
  const [planEndDate, setPlanEndDate] = useState<string>("");

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
        materials: plannedMaterials,
        pumpSerial: plannedPumpSerial,
        pumpSource: plannedPumpSource,
        fuelAmount: planFuelAmount ? parseFloat(planFuelAmount) : undefined,
        fuelPrice: planFuelPrice ? parseFloat(planFuelPrice) : undefined,
        startDate: planStartDate || undefined,
        endDate: planEndDate || undefined,
      });
      toast.success("Fieldwork plan submitted & tools checked out.");
      setSelectedPlanWorkers([]);
      setSelectedPlanTools([]);
      setPlannedMaterials([]);
      setPlannedPumpSerial("");
      setPlanNotes("");
      setPlanFuelAmount("");
      setPlanFuelPrice("");
      setPlanStartDate("");
      setPlanEndDate("");
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
  const [dailyReportImage, setDailyReportImage] = useState<Record<string, string>>({});
  const [eodAchievements, setEodAchievements] = useState<Record<string, string>>({});
  const [eodChallenges, setEodChallenges] = useState<Record<string, string>>({});
  const [eodNextDayPlan, setEodNextDayPlan] = useState<Record<string, string>>({});
  const [eodPhotos, setEodPhotos] = useState<Record<string, string>>({});
  const [eodPhotoFiles, setEodPhotoFiles] = useState<{ [jobId: string]: File[] }>({});
  const [isUploadingEod, setIsUploadingEod] = useState<{ [jobId: string]: boolean }>({});

  const handleSendStructuredEodReport = async (jobId: string) => {
    const achievements = eodAchievements[jobId] || dailyReportText[jobId] || "";
    const challenges = eodChallenges[jobId] || "";
    const nextDayPlan = eodNextDayPlan[jobId] || "";
    const rawPhotos = eodPhotos[jobId] || dailyReportImage[jobId] || "";
    const existingPhotosList = rawPhotos.split(",").map(p => p.trim()).filter(Boolean);

    if (!achievements.trim()) {
      toast.error("Please describe today's work & achievements.");
      return;
    }

    setIsUploadingEod(prev => ({ ...prev, [jobId]: true }));
    let uploadedUrls: string[] = [];
    try {
      if (eodPhotoFiles[jobId] && eodPhotoFiles[jobId].length > 0) {
        const formData = new FormData();
        eodPhotoFiles[jobId].forEach(f => formData.append('photos', f));
        const uploadRes = await apiClient.post('/fieldwork/upload-photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrls = uploadRes.data.urls || [];
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to upload photos");
      setIsUploadingEod(prev => ({ ...prev, [jobId]: false }));
      return;
    }

    const finalPhotosList = [...existingPhotosList, ...uploadedUrls];

    try {
      await apiClient.post(`/fieldwork/${jobId}/daily-report`, {
        achievements,
        challenges,
        nextDayPlan,
        photos: finalPhotosList,
        content: achievements,
        submittedBy: currentUser?.displayName || currentUser?.username || "TTL",
      });
      toast.success("Structured EOD Daily Progress Report submitted & notified to GM!");
      setEodAchievements(prev => ({ ...prev, [jobId]: "" }));
      setEodChallenges(prev => ({ ...prev, [jobId]: "" }));
      setEodNextDayPlan(prev => ({ ...prev, [jobId]: "" }));
      setEodPhotos(prev => ({ ...prev, [jobId]: "" }));
      setDailyReportText(prev => ({ ...prev, [jobId]: "" }));
      setDailyReportImage(prev => ({ ...prev, [jobId]: "" }));
      setEodPhotoFiles(prev => ({ ...prev, [jobId]: [] }));
      setIsUploadingEod(prev => ({ ...prev, [jobId]: false }));
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to submit EOD report");
      setIsUploadingEod(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleSendDailyReport = async (jobId: string) => {
    await handleSendStructuredEodReport(jobId);
  };

  const handleDispatchCrew = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/dispatch`);
      toast.success("Crew departure confirmed! Status updated to Crew Dispatched & Active.");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to confirm departure");
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

  const handleCompleteJobTTL = async (jobId: string, formPayload?: any) => {
    try {
      const photos = formPayload?.completionPhotos || [];
      await apiClient.patch(`/fieldwork/${jobId}/complete`, {
        completionPhotos: photos,
        notes: formPayload?.comments || formPayload?.otherNotes,
      });
      toast.success("Fieldwork marked completed with site photos! Sent for Storekeeper verification.");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to mark job complete");
    }
  };

  const handleStorekeeperVerify = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/storekeeper-verify`);
      toast.success("Returned tools & fuel verified by Storekeeper! Sent to Technical Manager for final sign-off.");
      if (refreshStoreData) await refreshStoreData();
      await refreshPlanningData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to verify returned assets");
    }
  };

  const handleApproveReturns = async (jobId: string) => {
    try {
      await apiClient.patch(`/fieldwork/${jobId}/approve-returns`);
      toast.success("Completion photos & site report approved by TM! Fieldwork job is officially completed.");
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
      if (saleItems.length === 0) return;

      const pumpItem = saleItems.find((item: any) => isPumpProduct(item)) || saleItems[0];
      const pumpName = pumpItem.productName || pumpItem.name || `Sale ${sale.id} Package`;

      const customerName = sale.customerName || sale.customer?.name || "Customer";
      const location = [
        sale.customer?.location,
        sale.customer?.woreda,
        sale.customer?.region
      ].filter(Boolean).join(", ") || sale.location || "Site";

      const methodLabel = sale.paymentMethod === "Bank" ? ` (${sale.bankName || "Bank"})` :
        sale.paymentMethod === "Telebirr" ? " (Telebirr)" : sale.paymentMethod ? ` (${sale.paymentMethod})` : "";

      result.push({
        id: sale.id,
        saleId: sale.id,
        pumpName,
        customerName,
        location,
        items: saleItems,
        label: `${pumpName} — ${customerName} — ${location} — Sale ${sale.id}${methodLabel}`,
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
    const userRoles = currentUser?.roles || [currentUser?.role];
    const isTtlOnly = userRoles.includes("ttl") && !userRoles.includes("fieldwork") && !userRoles.includes("admin") && !userRoles.includes("manager");
    if (isTtlOnly && fw.assignedTo !== currentUser?.username) {
      return false;
    }

    const workerNames = (fw.workers || []).map((w) => (w.name || "").toLowerCase()).join(" ");
    const workerPositions = (fw.workers || []).map((w: any) => (w.position || "").toLowerCase()).join(" ");
    const pumpModel = (fw.pumpModel || "").toLowerCase();
    const location = (fw.location || "").toLowerCase();
    const customerName = (fw.customerName || "").toLowerCase();
    const assignedTo = (fw.assignedTo || "").toLowerCase();

    const query = search.toLowerCase().trim();
    const matchSearch =
      !query ||
      workerNames.includes(query) ||
      workerPositions.includes(query) ||
      pumpModel.includes(query) ||
      location.includes(query) ||
      customerName.includes(query) ||
      assignedTo.includes(query);

    const matchStatus = filterStatus === "all" || fw.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeCount = fieldWorks.filter((fw: FieldWork) => 
    ["in-progress", "planning", "accepted", "submitted_tm", "checked_tm", "approved_gm", "Approved and ready to go", "completed_ttl"].includes(fw.status)
  ).length;

  const totalPerDiemAll = fieldWorks.reduce((sum: number, fw: FieldWork) => {
    const days = getInclusiveDays(fw.startDate, fw.endDate);
    const fwTotal = fw.workers.reduce((workerSum, worker) => workerSum + Number(worker.perDiem) * days, 0);
    return sum + fwTotal;
  }, 0);



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
  if (section === "sizing") {
    return <PumpSizingPage />;
  }
  if (section === "research") {
    return <ResearchSection />;
  }

  // Default: "jobs" section — existing field work content
  return (
    <div className="space-y-6 animate-fade-in print:hidden">
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
                                  <td className="py-2 text-right">{Number(w.perDiem).toLocaleString()} ETB</td>
                                  <td className="py-2 text-right">{totalDays}</td>
                                  <td className="py-2 text-right font-medium">
                                    {(Number(w.perDiem) * totalDays).toLocaleString()} ETB
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

                      {/* ═══════════════ DAILY EOD PROGRESS REPORTS — FULL-PAGE SECTION ═══════════════ */}
                      <div className="mt-6 space-y-5">
                        {/* Section Header */}
                        <div className="flex items-center justify-between border-b-2 border-purple-500/30 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg">
                              <CalendarIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground tracking-tight">Daily EOD Field Reports</h3>
                              <p className="text-xs text-muted-foreground">Detailed end-of-day progress reports from the field crew</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-600/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-bold px-3 py-1">
                              {(fw.dailyReports || []).length} {(fw.dailyReports || []).length === 1 ? 'Report' : 'Reports'} Filed
                            </Badge>
                            {fw.status === "crew_dispatched" && (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 animate-pulse font-semibold px-3 py-1">
                                <Truck className="h-3 w-3 mr-1" /> Active On-Site
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* ── Reports List (Full Width, No Scroll Constraint) ── */}
                        {fw.dailyReports && fw.dailyReports.length > 0 ? (
                          <div className="space-y-5">
                            {fw.dailyReports.map((report: any, reportIdx: number) => (
                              <div key={report.id} className="rounded-2xl border-2 border-purple-500/20 bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-900/60 dark:to-purple-950/20 shadow-md overflow-hidden">
                                {/* Report Header Bar */}
                                <div className="bg-purple-600/10 dark:bg-purple-900/30 px-6 py-3 border-b border-purple-500/20 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow">
                                      {reportIdx + 1}
                                    </div>
                                    <div>
                                      <span className="text-sm font-bold text-foreground block">Day {reportIdx + 1} — End of Day Report</span>
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {format(report.date ? new Date(report.date) : new Date(), "EEEE, MMMM d, yyyy 'at' HH:mm")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-purple-600 text-white font-mono text-[10px] px-2 py-0.5">EOD REPORT</Badge>
                                    <span className="text-xs text-muted-foreground">by <strong className="text-foreground">{report.submittedBy}</strong></span>
                                  </div>
                                </div>

                                {/* Report Body — Full Width Detailed Sections */}
                                <div className="px-6 py-5 space-y-5">
                                  {/* Section 1: Today's Achievements */}
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Today's Work & Achievements</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-emerald-500/20 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-sm">
                                      {report.achievements || report.content}
                                    </div>
                                  </div>

                                  {/* Section 2: Site Challenges */}
                                  {report.challenges && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        <span className="font-bold text-sm text-amber-700 dark:text-amber-400 uppercase tracking-wide">Site Challenges & Impediments</span>
                                      </div>
                                      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-500/25 p-4 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                        {report.challenges}
                                      </div>
                                    </div>
                                  )}

                                  {/* Section 3: Tomorrow's Plan */}
                                  {report.nextDayPlan && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Compass className="h-4 w-4 text-sky-600" />
                                        <span className="font-bold text-sm text-sky-700 dark:text-sky-400 uppercase tracking-wide">Tomorrow's Planned Tasks</span>
                                      </div>
                                      <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl border border-sky-500/25 p-4 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                        {report.nextDayPlan}
                                      </div>
                                    </div>
                                  )}

                                  {/* Section 4: Attached Photos */}
                                  {((Array.isArray(report.photos) && report.photos.length > 0) || report.imageUrl) && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-indigo-600" />
                                        <span className="font-bold text-sm text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                                          Attached Progress Photos ({(report.photos && report.photos.length > 0 ? report.photos : [report.imageUrl]).length})
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {(report.photos && report.photos.length > 0 ? report.photos : [report.imageUrl]).map((imgUrl: string, idx: number) => {
                                          const fullUrl = getFullImgUrl(imgUrl);
                                          return (
                                            <Dialog key={idx}>
                                              <DialogTrigger asChild>
                                                <button type="button" className="bg-white dark:bg-slate-800/50 rounded-xl border-2 border-indigo-500/15 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative text-left">
                                                  <div className="h-28 bg-muted overflow-hidden flex items-center justify-center">
                                                    {imgUrl && (imgUrl.startsWith("http") || imgUrl.startsWith("/")) ? (
                                                      <img src={fullUrl} alt={`Day ${reportIdx + 1} Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={(e) => {
                                                        (e.target as HTMLElement).style.display = 'none';
                                                      }} />
                                                    ) : null}
                                                  </div>
                                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Eye className="h-6 w-6 text-white" />
                                                  </div>
                                                  <div className="p-2 text-center bg-white dark:bg-slate-800">
                                                    <span className="text-[10px] font-bold text-muted-foreground">Photo #{idx + 1}</span>
                                                    <p className="text-[9px] text-muted-foreground truncate font-mono" title={imgUrl}>{imgUrl.split('/').pop() || imgUrl}</p>
                                                  </div>
                                                </button>
                                              </DialogTrigger>
                                              <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center h-[90vh]">
                                                <DialogTitle className="sr-only">Photo Preview</DialogTitle>
                                                <img src={fullUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                                                <a href={fullUrl} download={`FieldWork-Photo-${idx+1}.jpg`} target="_blank" rel="noreferrer" className="mt-4">
                                                  <Button variant="secondary" className="gap-2 shadow-lg hover:scale-105 transition-transform"><Download className="h-4 w-4" /> Download Photo</Button>
                                                </a>
                                              </DialogContent>
                                            </Dialog>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5">
                            <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">No daily progress reports submitted yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">EOD reports will appear here once the field crew starts submitting them.</p>
                          </div>
                        )}

                        {/* ── Structured EOD Submission Form (TTL Only, When Dispatched) ── */}
                        {fw.status === "crew_dispatched" && currentUser?.username === fw.assignedTo && (
                          <div className="rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-50 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/10 p-6 space-y-5 shadow-lg">
                            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg">
                                  <Send className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-purple-800 dark:text-purple-200">Submit Daily End-of-Day (EOD) Progress Report</h4>
                                  <p className="text-xs text-muted-foreground">This will be report #{(fw.dailyReports || []).length + 1} — automatically forwarded to the General Manager</p>
                                </div>
                              </div>
                              <Badge className="bg-purple-600/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold">
                                Auto-Sends to GM
                              </Badge>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-semibold block mb-2 text-foreground">1. Today's Achievements & Installed Work <span className="text-red-500">*</span></Label>
                                <Textarea
                                  placeholder="Detail today's progress (e.g. Completed trenching, mounted 12 solar panels, connected controller cabling)..."
                                  value={eodAchievements[fw.id] !== undefined ? eodAchievements[fw.id] : dailyReportText[fw.id] || ""}
                                  onChange={(e) => {
                                    setEodAchievements({ ...eodAchievements, [fw.id]: e.target.value });
                                    setDailyReportText({ ...dailyReportText, [fw.id]: e.target.value });
                                  }}
                                  className="min-h-[100px] bg-white dark:bg-slate-800/50 text-sm"
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-semibold block mb-2 text-foreground">2. Site Challenges & Impediments <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                                  <Textarea
                                    placeholder="e.g. Heavy rain delayed pipe laying by 2 hours, rocky terrain required different drill bits..."
                                    value={eodChallenges[fw.id] || ""}
                                    onChange={(e) => setEodChallenges({ ...eodChallenges, [fw.id]: e.target.value })}
                                    className="min-h-[80px] bg-white dark:bg-slate-800/50 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-semibold block mb-2 text-foreground">3. Tomorrow's Planned Tasks <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                                  <Textarea
                                    placeholder="e.g. Lower submersible pump into borehole, complete wiring from panels to controller, test water flow..."
                                    value={eodNextDayPlan[fw.id] || ""}
                                    onChange={(e) => setEodNextDayPlan({ ...eodNextDayPlan, [fw.id]: e.target.value })}
                                    className="min-h-[80px] bg-white dark:bg-slate-800/50 text-sm"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label className="text-sm font-semibold block mb-2 text-foreground">4. Attached Daily Photos <span className="text-muted-foreground text-xs">(Max 4 images)</span></Label>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) => {
                                        if (e.target.files) {
                                          const filesArray = Array.from(e.target.files).slice(0, 4);
                                          setEodPhotoFiles({ ...eodPhotoFiles, [fw.id]: filesArray });
                                        }
                                      }}
                                      className="bg-white dark:bg-slate-800/50 text-sm w-full file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:font-semibold hover:file:bg-indigo-100 cursor-pointer"
                                    />
                                    {eodPhotoFiles[fw.id]?.length > 0 && (
                                      <Button variant="ghost" size="sm" onClick={() => setEodPhotoFiles({...eodPhotoFiles, [fw.id]: []})} className="text-red-500 hover:bg-red-50 hover:text-red-600">Clear</Button>
                                    )}
                                  </div>
                                  {eodPhotoFiles[fw.id]?.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {eodPhotoFiles[fw.id].map((file, idx) => (
                                        <div key={idx} className="relative group rounded-xl border border-border overflow-hidden bg-muted/30 aspect-video">
                                          <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-medium truncate px-2">{file.name}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end pt-3 border-t border-purple-500/15">
                                <Button
                                  size="lg"
                                  onClick={() => handleSendStructuredEodReport(fw.id)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-8 py-3 flex items-center gap-2.5 shadow-lg rounded-xl transition-all"
                                  disabled={!(eodAchievements[fw.id] || dailyReportText[fw.id])?.trim() || isUploadingEod[fw.id]}
                                >
                                  {isUploadingEod[fw.id] ? <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
                                  {isUploadingEod[fw.id] ? "Uploading & Submitting..." : "Submit EOD Report & Notify GM"}
                                </Button>
                              </div>
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
                            {hasAccess(["fieldwork", "manager", "ttl"]) ? (
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

                        {/* 2. Status: PLANNING or ACCEPTED (TTL Planning Form) */}
                        {(fw.status === "planning" || fw.status === "accepted") && (
                          <div className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                              Assigned to: <strong className="text-foreground">{fw.assignedTo || "Technical Team Leader"}</strong>. Enter crew configuration, daily per diem rates, travel fuel budgets, and check out company tools.
                            </p>
                            
                            {currentUser?.username === fw.assignedTo || hasAccess(["fieldwork"]) ? (
                              <div className="space-y-4">
                                {planningFwId !== fw.id ? (
                                  <div className="flex items-center gap-3">
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
                                    {fw.status === "planning" && (
                                      <Button size="sm" variant="outline" onClick={() => handleAcceptJob(fw.id)}>
                                        Mark Job Accepted
                                      </Button>
                                    )}
                                  </div>
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

                                    {/* 4-Category Material & Tool Planning */}
                                     <FieldWorkMaterialPlanning
                                       pumpModel={fw.pumpModel || ""}
                                       products={products}
                                       availableCompanyTools={availableTools}
                                       selectedTools={selectedPlanTools}
                                       onSelectedToolsChange={setSelectedPlanTools}
                                       onMaterialsChange={setPlannedMaterials}
                                       onPumpSerialChange={setPlannedPumpSerial}
                                       onPumpSourceChange={setPlannedPumpSource}
                                     />

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

                                    {/* Trip Duration & Dates Selection */}
                                     <div className="space-y-1 bg-purple-500/5 p-3 rounded-lg border border-purple-500/20">
                                       <Label className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                         <CalendarIcon className="h-3.5 w-3.5" /> Trip Schedule & Duration Selection
                                       </Label>
                                       <div className="grid grid-cols-2 gap-3 pt-1">
                                         <div className="space-y-1">
                                           <span className="text-[10px] text-muted-foreground block">Installation Start Date</span>
                                           <Input
                                             type="date"
                                             value={planStartDate}
                                             onChange={(e) => setPlanStartDate(e.target.value)}
                                             className="h-8 text-xs bg-background"
                                           />
                                         </div>
                                         <div className="space-y-1">
                                           <span className="text-[10px] text-muted-foreground block">Expected Completion Date</span>
                                           <Input
                                             type="date"
                                             value={planEndDate}
                                             onChange={(e) => setPlanEndDate(e.target.value)}
                                             className="h-8 text-xs bg-background"
                                           />
                                         </div>
                                       </div>
                                     </div>

                                     {/* Calculated budget sum */}
                                     {(() => {
                                       const plannedDays = (planStartDate && planEndDate)
                                         ? Math.max(1, Math.ceil((new Date(planEndDate).getTime() - new Date(planStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                         : totalDays;
                                       return (
                                         <div className="bg-primary/5 p-3 rounded border border-primary/20 flex justify-between items-center text-xs">
                                           <div>
                                             <span className="font-semibold text-primary block">Estimated Planning Budget</span>
                                             <span className="text-[10px] text-muted-foreground">Includes per-diem ({plannedDays} days) + fuel requests.</span>
                                           </div>
                                           <div className="text-sm font-bold font-mono text-primary">
                                             {(
                                               selectedPlanWorkers.reduce((s, w) => s + (w.perDiem || 0) * plannedDays, 0) +
                                               (parseFloat(planFuelAmount) || 0) * (parseFloat(planFuelPrice) || 0)
                                             ).toLocaleString()}{" "}
                                             ETB
                                           </div>
                                         </div>
                                       );
                                     })()}

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

                            {hasAccess(["fieldwork", "manager", "ttl"]) ? (
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
                              <span>Approved and ready to go!</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">To begin the field trip and unlock reporting, the Technical Team Leader (TTL) must confirm departure below.</p>
                            
                            {(() => {
                              const pendingReleases = (fw.materials || []).filter(
                                (m: any) => m.source === "FROM_STOCK" && m.status !== "RELEASED"
                              );
                              const hasPendingReleases = pendingReleases.length > 0;

                              const materialsCount = (fw.materials || []).length;
                              const companyToolsCount = (fw.payload?.companyTools || []).length;
                              const totalChecklistItems = materialsCount + companyToolsCount;
                              const checkedCount = Object.values(checklistChecked[fw.id] || {}).filter(Boolean).length;
                              const isChecklistComplete = checkedCount >= totalChecklistItems;

                              return (
                                <div className="space-y-3">
                                  {hasPendingReleases ? (
                                    <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs font-semibold text-amber-700 dark:text-amber-400 mt-2">
                                      <p className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="h-4 w-4 animate-pulse" /> Storekeeper Release Pending
                                      </p>
                                      <p className="font-normal text-[11px] text-muted-foreground mt-0.5">
                                        The storekeeper must release all stock materials before you can proceed to pre-deployment checks and dispatch. Pending items:
                                      </p>
                                      <ul className="list-disc pl-4 font-normal text-[11px] text-muted-foreground mt-1 space-y-0.5">
                                        {pendingReleases.map((m: any) => (
                                          <li key={m.id}>
                                            {m.name} ({m.quantity} {m.unit || "pcs"})
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    currentUser?.username === fw.assignedTo && (
                                      <div className="space-y-3">
                                        {/* Pre-deployment checklist */}
                                        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3 my-2">
                                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                                            <ClipboardCheck className="h-4 w-4" /> Pre-Deployment Equipment Checklist ({checkedCount}/{totalChecklistItems})
                                          </div>
                                          <p className="text-[11px] text-muted-foreground">
                                            Verify you have all physical equipment and materials on hand before departure. Tick all items to authorize departure.
                                          </p>

                                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {/* Material items */}
                                            {(fw.materials || []).map((m: any) => {
                                              const isChecked = Boolean(checklistChecked[fw.id]?.[m.id]);
                                              return (
                                                <label key={m.id} className="flex items-center gap-2 text-[11px] font-medium text-foreground cursor-pointer hover:bg-muted/30 p-1.5 rounded transition-all">
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                      setChecklistChecked(prev => ({
                                                        ...prev,
                                                        [fw.id]: {
                                                          ...(prev[fw.id] || {}),
                                                          [m.id]: e.target.checked
                                                        }
                                                      }));
                                                    }}
                                                    className="rounded border-border text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                  />
                                                  <span>
                                                    {m.name} ({m.quantity} {m.unit || "pcs"}) - <span className="text-[10px] uppercase font-bold text-muted-foreground">{m.source === "FROM_STOCK" ? "From Stock" : "Direct Purchase"}</span>
                                                  </span>
                                                </label>
                                              );
                                            })}

                                            {/* Company tools */}
                                            {(fw.payload?.companyTools || []).map((tool: string, idx: number) => {
                                              const isChecked = Boolean(checklistChecked[fw.id]?.[`tool-${idx}`]);
                                              return (
                                                <label key={`tool-${idx}`} className="flex items-center gap-2 text-[11px] font-medium text-foreground cursor-pointer hover:bg-muted/30 p-1.5 rounded transition-all">
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                      setChecklistChecked(prev => ({
                                                        ...prev,
                                                        [fw.id]: {
                                                          ...(prev[fw.id] || {}),
                                                          [`tool-${idx}`]: e.target.checked
                                                        }
                                                      }));
                                                    }}
                                                    className="rounded border-border text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                  />
                                                  <span>Company Tool: {tool}</span>
                                                </label>
                                              );
                                            })}

                                            {(!fw.materials?.length && !fw.payload?.companyTools?.length) && (
                                              <div className="text-[11px] text-muted-foreground italic">No materials or tools planned for this job. Ready to depart.</div>
                                            )}
                                          </div>
                                        </div>

                                        <Button
                                          size="sm"
                                          onClick={() => handleDispatchCrew(fw.id)}
                                          disabled={!isChecklistComplete}
                                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 mt-2"
                                        >
                                          <Truck className="h-4 w-4 animate-bounce" /> Confirm Departure & Start Journey
                                        </Button>
                                      </div>
                                    )
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* 7.5. Status: crew_dispatched (Active in the field) */}
                        {fw.status === "crew_dispatched" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 bg-purple-500/10 p-3 rounded border border-purple-500/20 text-xs font-semibold animate-pulse">
                              <Truck className="h-4 w-4" />
                              <span>Crew Dispatched & Active in the Field!</span>
                            </div>
                            <p className="text-xs text-muted-foreground">The crew has departed and is currently active on-site. TTL must submit EOD progress reports below. When the job is completed, submit the Return Form.</p>
                          </div>
                        )}

                        {/* 8. Status: COMPLETED_TTL */}
                        {fw.status === "completed_ttl" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 bg-teal-500/10 p-3 rounded border border-teal-500/20 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Site installation completed by TTL! 4 completion photos & return form submitted. Awaiting Storekeeper asset check.</span>
                            </div>

                            {/* Display 4 Completion Photos if present */}
                            {Array.isArray((fw as any).payload?.completionPhotos) && (fw as any).payload.completionPhotos.length > 0 && (
                              <div className="space-y-1.5 p-3 rounded border bg-muted/20">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Submitted Site Completion Photos</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {(fw as any).payload.completionPhotos.map((url: string, idx: number) => (
                                    <div key={idx} className="p-1 border rounded bg-background text-[10px] truncate">
                                      <span className="font-semibold block text-primary">Photo #{idx + 1}</span>
                                      <span className="text-muted-foreground truncate block">{url}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {(currentUser?.role === 'storekeeper' || currentUser?.roles?.includes('storekeeper') || currentUser?.role === 'admin') ? (
                              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50">
                                Awaiting Storekeeper verification in the {"Inventory -> Returns"} workspace...
                              </Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting Storekeeper warehouse return verification...</Badge>
                            )}
                          </div>
                        )}

                        {/* 9. Status: VERIFIED_STOREKEEPER */}
                        {fw.status === "verified_storekeeper" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 p-3 rounded border border-indigo-500/20 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Storekeeper verified returned warehouse assets. Awaiting Technical Manager (TM) final review & sign-off.</span>
                            </div>

                            {/* Display 4 Completion Photos if present */}
                            {Array.isArray((fw as any).payload?.completionPhotos) && (fw as any).payload.completionPhotos.length > 0 && (
                              <div className="space-y-1.5 p-3 rounded border bg-muted/20">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Verified Site Completion Photos</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {(fw as any).payload.completionPhotos.map((url: string, idx: number) => (
                                    <div key={idx} className="p-1 border rounded bg-background text-[10px] truncate">
                                      <span className="font-semibold block text-primary">Photo #{idx + 1}</span>
                                      <span className="text-muted-foreground truncate block">{url}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {hasAccess(["fieldwork", "manager"]) ? (
                              <Button size="sm" onClick={() => handleApproveReturns(fw.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                Review Completion Photos & Sign Off Fieldwork
                              </Button>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground">Awaiting Technical Manager final sign-off...</Badge>
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
                        {(fw.status === "Approved and ready to go" || fw.status === "crew_dispatched") && currentUser?.username === fw.assignedTo && (
                          <Button size="sm" onClick={() => openReturnForm(fw)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            <UserCheck className="h-4 w-4 mr-1" /> Mark Completed
                          </Button>
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
                await handleCompleteJobTTL(returnFormFW.id, form);
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

      {/* Printable Executive PDF Template for Fieldwork Page (Only visible on Print) */}
      <div className="hidden print:block">
        {filtered.length > 0 && (
          <ExecutiveDocumentPdfTemplate
            data={{
              documentTitle: "Meseret Mare Field Work Operations & Asset Release Sheet",
              subtitle: "Field Engineering & Installation Operations Summary",
              refNumber: filtered[0].id,
              date: new Date().toLocaleDateString(),
              clientSection: {
                title: "CLIENT & SITE OPERATIONS PROFILE",
                fields: [
                  { label: "Client Full Name", value: filtered[0].customerName || "Client Site" },
                  { label: "Site Location", value: filtered[0].location },
                  { label: "Solar Pump Model", value: filtered[0].pumpModel || "Solar Pump System" },
                  { label: "Assigned Team Leader", value: filtered[0].assignedTo || "Technical Team Leader" },
                  { label: "Scheduled Duration", value: `${filtered[0].startDate} to ${filtered[0].endDate}` },
                  { label: "Operation Status", value: (filtered[0].status || "IN-PROGRESS").toUpperCase() },
                ]
              },
              secondarySection: {
                title: "CREW & PER DIEM BUDGET",
                fields: [
                  { label: "Assigned Crew Members", value: `${filtered[0].workers?.length || 1} Technicians` },
                  { label: "Fuel Allocation", value: `${filtered[0].fuelAmount || 0} Liters @ ${filtered[0].fuelPrice || 0} ETB` },
                  { label: "Warranty Days", value: `${filtered[0].warrantyDays || 365} Days` },
                  { label: "Completion Date", value: filtered[0].completedDate || "Pending Completion" },
                ]
              },
              tableData: {
                title: "ASSIGNED WORKERS & CREW MEMBER DETAILS",
                headers: ["WORKER NAME", "ID", "POSITION", "1 DAY PRICE", "TOTAL PER DIEM"],
                rows: (filtered[0].workers || []).map((w: any) => [
                  w.name,
                  w.id,
                  w.position,
                  `${w.perDiem} ETB`,
                  `${Number(w.perDiem || 0) * (differenceInCalendarDays(parseISO(filtered[0].endDate), parseISO(filtered[0].startDate)) + 1)} ETB`
                ])
              },
              completionPhotos: filtered[0].payload?.completionPhotos || [],
              financials: {
                totalFee: totalPerDiemAll,
                adjustments: 0,
                totalDue: totalPerDiemAll,
                payment1: totalPerDiemAll,
                payment2: 0,
                balanceDue: 0,
              }
            }}
          />
        )}
      </div>
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
  const [sizingData, setSizingData] = useState<{
    waterSource: WaterSource;
    purpose: string;
    dailyWaterNeed: number | "";
    boreholeDepth: number | "";
    staticWaterLevel: number | "";
    tankHeight: number | "";
    pipeDistance: number | "";
    pipeSize: string;
    sunHours: number | "";
  }>({
    waterSource: "Borehole",
    purpose: "Irrigation",
    dailyWaterNeed: 15000,
    boreholeDepth: 60,
    staticWaterLevel: 25,
    tankHeight: 6,
    pipeDistance: 50,
    pipeSize: '1.5"',
    sunHours: 5,
  });
  const [results, setResults] = useState<{ pump: any; flowAtHead: number; suitability: SizingSuitability; tdh: number; reqFlow: number; score: number }[]>([]);
  const [summary, setSummary] = useState<{ tdh: number; reqFlowM3h: number; reqFlowLmin: number } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");

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
    const tdh = sizingCalcTDH(sizingData.waterSource, Number(sizingData.staticWaterLevel) || 0, Number(sizingData.tankHeight) || 0, Number(sizingData.pipeDistance) || 0, sizingData.pipeSize);
    const reqFlowM3h = sizingCalcFlow(Number(sizingData.dailyWaterNeed) || 0, Number(sizingData.sunHours) || 0);
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

        const flowRatio = reqFlowM3h > 0 ? flowAtHead / reqFlowM3h : 0;
        const watts = parsePowerToWatts(pump.power);
        
        let score = 0;
        if (suitability === "Suitable") {
          score = 100 - Math.abs(1.0 - flowRatio) * 40 - (watts > 0 ? (watts / 3000) * 10 : 0);
        } else if (suitability === "Oversized") {
          score = 70 - Math.abs(1.5 - flowRatio) * 20;
        } else if (suitability === "Low Capacity") {
          score = 40 * flowRatio;
        } else {
          score = 0;
        }
        score = Math.max(0, Math.min(99, Math.round(score)));

        return { pump, flowAtHead, suitability, tdh, reqFlow: reqFlowM3h, score };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { Suitable: 0, Oversized: 1, "Low Capacity": 2, "Exceeds Limit": 3 };
        const rankDiff = (order[a.suitability] ?? 4) - (order[b.suitability] ?? 4);
        if (rankDiff !== 0) return rankDiff;
        return b.score - a.score;
      });

    setResults(matched);
    if (matched.length === 0) toast.info("No pump models with performance data found.");
  };

  const bestMatch = useMemo(() => {
    if (!results || results.length === 0) return null;
    const suitablePumps = results.filter(r => r.suitability === "Suitable");
    return suitablePumps.length > 0 ? suitablePumps[0] : results[0];
  }, [results]);

  const brandSummary = useMemo(() => {
    if (!results || results.length === 0) return {};
    const map: Record<string, { suitable: number; total: number }> = {};
    results.forEach(r => {
      const b = r.pump.brand || "OTHER";
      if (!map[b]) map[b] = { suitable: 0, total: 0 };
      map[b].total += 1;
      if (r.suitability === "Suitable") map[b].suitable += 1;
    });
    return map;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (selectedBrand === "ALL") return results;
    return results.filter(r => (r.pump.brand || "").toUpperCase() === selectedBrand.toUpperCase());
  }, [results, selectedBrand]);

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
          <Zap className="h-6 w-6 text-primary" /> Multi-Brand Pump Sizing & AI Match
        </h1>
        <p className="text-sm text-muted-foreground">Calculate TDH, evaluate DIFFUL, REDBUD & other brands, and identify the #1 optimal pump recommendation.</p>
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
              <Zap className="h-4 w-4 mr-2" /> Match & Compare All Brands (DIFFUL / REDBUD)
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary">Recommendations & Multi-Brand Analysis</h3>
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

          {/* AI BEST MATCH HIGHLIGHT CARD */}
          {bestMatch && (
            <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-emerald-50/10 dark:from-emerald-950/40 dark:to-teal-950/20 shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-600 text-white font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ★ #1 AI BEST MATCH RECOMMENDATION
                  </Badge>
                  <Badge variant="outline" className="text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-500">
                    {bestMatch.score}% Match Score
                  </Badge>
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-foreground">{bestMatch.pump.model}</h4>
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    Brand: <strong>{bestMatch.pump.brand}</strong> · Power: <strong>{bestMatch.pump.power}</strong> · Voltage: <strong>{bestMatch.pump.voltage || 'N/A'}</strong>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                  <strong>AI Rationale:</strong> Selected as top pump option for TDH = {bestMatch.tdh}m and Target Flow = {bestMatch.reqFlow.toFixed(2)} m³/h. Delivering <strong>{bestMatch.flowAtHead.toFixed(2)} m³/h</strong> at operating point with optimum power efficiency and high reliability.
                </p>
              </CardContent>
            </Card>
          )}

          {/* BRAND FILTER PILLS */}
          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-muted-foreground mr-1">Brand Filter:</span>
              <Badge
                className={cn("cursor-pointer text-xs font-bold transition-all", selectedBrand === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                onClick={() => setSelectedBrand("ALL")}
              >
                All Brands ({results.length})
              </Badge>
              {Object.entries(brandSummary).map(([brandName, stats]) => (
                <Badge
                  key={brandName}
                  className={cn("cursor-pointer text-xs font-bold transition-all flex items-center gap-1", selectedBrand === brandName ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                  onClick={() => setSelectedBrand(brandName)}
                >
                  {brandName} ({stats.suitable} suitable / {stats.total})
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredResults.length > 0 ? (
              filteredResults.map((res) => (
                <div key={res.pump.id} className={cn("rounded-2xl border-2 p-4 transition-all", suitColor(res.suitability))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{res.pump.model}</p>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">{res.pump.brand}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{res.pump.firstCategory || res.pump.category || 'Pump'} · {res.pump.power}</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                Enter requirements and click "Match & Compare All Brands" to see results.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RESEARCH SECTION ───
const parsePowerToWatts = (powerStr: string): number => {
  if (!powerStr) return 0;
  const str = powerStr.toLowerCase().trim();
  
  if (str.includes("hp")) {
    const num = parseFloat(str.replace("hp", ""));
    return Number.isNaN(num) ? 0 : num * 746;
  }
  if (str.includes("kw")) {
    const num = parseFloat(str.replace("kw", ""));
    return Number.isNaN(num) ? 0 : num * 1000;
  }
  if (str.includes("w")) {
    const num = parseFloat(str.replace("w", ""));
    return Number.isNaN(num) ? 0 : num;
  }
  const num = parseFloat(str);
  return Number.isNaN(num) ? 0 : num;
};

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

  const groupedPumps = useMemo(() => {
    const brandMap: Record<string, any[]> = {};
    filtered.forEach((pump) => {
      const brand = (pump.brand || "Other Brands").trim().toUpperCase();
      if (!brandMap[brand]) {
        brandMap[brand] = [];
      }
      brandMap[brand].push(pump);
    });

    const result: Record<string, Record<string, any[]>> = {};
    Object.keys(brandMap).sort().forEach((brand) => {
      const pumpsInBrand = brandMap[brand];
      const capacityMap: Record<string, any[]> = {};
      
      pumpsInBrand.forEach((pump) => {
        const capacity = (pump.power || "Standard Capacity").trim();
        if (!capacityMap[capacity]) {
          capacityMap[capacity] = [];
        }
        capacityMap[capacity].push(pump);
      });

      const sortedCapacityMap: Record<string, any[]> = {};
      Object.keys(capacityMap)
        .sort((a, b) => {
          if (a === "Standard Capacity") return 1;
          if (b === "Standard Capacity") return -1;
          return parsePowerToWatts(a) - parsePowerToWatts(b);
        })
        .forEach((cap) => {
          sortedCapacityMap[cap] = capacityMap[cap];
        });

      result[brand] = sortedCapacityMap;
    });

    return result;
  }, [filtered]);

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
            <FlaskConical className="h-6 w-6 text-primary" /> Pump Research & NASA Solar Exploration
          </h1>
          <p className="text-sm text-muted-foreground">Browse pump models ({pumps.length} products) and query NASA satellite solar radiation</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 w-64" placeholder="Search model, brand, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Live NASA POWER Satellite Solar Radiation Explorer Widget */}
      <NasaSolarResearchWidget />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          No pump models match your search.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedPumps).map(([brandName, capacities]) => (
            <div key={brandName} className="space-y-6 border border-slate-100 rounded-2xl p-6 bg-slate-50/20 shadow-sm">
              <div className="flex items-center gap-2 border-b pb-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs px-2.5 py-1 font-bold">
                  {brandName} Brand
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  ({Object.values(capacities).reduce((acc, curr) => acc + curr.length, 0)} models)
                </span>
              </div>

              <div className="space-y-6">
                {Object.entries(capacities).map(([capacityName, pumpList]) => (
                  <div key={capacityName} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5 pl-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Capacity: {capacityName} ({pumpList.length} items)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pumpList.map((pump) => {
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
                  </div>
                ))}
              </div>
            </div>
          ))}
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
  onSave: (form: ReturnForm & { completionPhotos?: string[] }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [workerName, setWorkerName] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [materials, setMaterials] = useState<{ productId?: string; name: string; quantity: number | ""; condition: string }[]>([
    { name: "", quantity: 1, condition: "Good" },
  ]);
  const [comments, setComments] = useState("");
  const [otherNotes, setOtherNotes] = useState("");
  const [photoInverter, setPhotoInverter] = useState("");
  const [photoPanels, setPhotoPanels] = useState("");
  const [photoPump, setPhotoPump] = useState("");
  const [photoSite, setPhotoSite] = useState("");

  const [uploadingInverter, setUploadingInverter] = useState(false);
  const [uploadingPanels, setUploadingPanels] = useState(false);
  const [uploadingPump, setUploadingPump] = useState(false);
  const [uploadingSite, setUploadingSite] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('photos', file);

    if (field === 'inverter') setUploadingInverter(true);
    if (field === 'panels') setUploadingPanels(true);
    if (field === 'pump') setUploadingPump(true);
    if (field === 'site') setUploadingSite(true);

    try {
      const res = await apiClient.post('/fieldwork/upload-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data.urls?.[0];
      if (url) {
        if (field === 'inverter') setPhotoInverter(url);
        if (field === 'panels') setPhotoPanels(url);
        if (field === 'pump') setPhotoPump(url);
        if (field === 'site') setPhotoSite(url);
        toast.success("Photo uploaded successfully!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload photo");
    } finally {
      if (field === 'inverter') setUploadingInverter(false);
      if (field === 'panels') setUploadingPanels(false);
      if (field === 'pump') setUploadingPump(false);
      if (field === 'site') setUploadingSite(false);
    }
  };

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

    const activeCheckouts = checkedOutTools.filter(t => t.status === 'CHECKED_OUT');
    const toolReturnsPayload = activeCheckouts.map(item => ({
      companyAssetId: item.companyAssetId,
      name: item.asset?.name || item.companyAssetId,
      condition: toolReturns[item.companyAssetId]?.condition || 'GOOD',
      notes: toolReturns[item.companyAssetId]?.notes || '',
    }));

    const photos = [photoInverter, photoPanels, photoPump, photoSite].filter(Boolean);

    onSave({
      id: `RF${Date.now().toString().slice(-6)}`,
      fieldWorkId: fieldWork.id,
      workerName,
      date: format(date, "yyyy-MM-dd"),
      returnedMaterials: validMaterials.map(m => ({ ...m, quantity: Number(m.quantity) || 0 })),
      toolReturns: toolReturnsPayload,
      comments,
      otherNotes,
      status: "pending",
      completionPhotos: photos,
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

      {/* 4 Completion Site Photos */}
      <div className="space-y-2 border p-3 rounded-lg bg-emerald-500/5 border-emerald-500/20">
        <Label className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 uppercase tracking-wider">
          <Camera className="h-4 w-4" /> Mandatory Site Completion Photos (4 Proof Photos)
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Slot 1: Inverter */}
          <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">1. Inverter & Control Box</span>
            {photoInverter ? (
              <div className="relative h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <img src={getFullImgUrl(photoInverter)} alt="Inverter" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoInverter("")}
                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700 shadow-md transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="photo-inverter-upload"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 'inverter')}
                  disabled={uploadingInverter}
                />
                <label
                  htmlFor="photo-inverter-upload"
                  className={cn(
                    "flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
                    uploadingInverter 
                      ? "bg-slate-100 border-indigo-300 dark:bg-slate-800/40" 
                      : "border-slate-300 dark:border-slate-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 hover:border-indigo-500"
                  )}
                >
                  {uploadingInverter ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] font-semibold text-indigo-600">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="h-4 w-4 text-slate-400" />
                      <span className="text-[9px] font-semibold text-slate-500">Upload Photo</span>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Slot 2: Panels */}
          <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">2. Solar Panel Array</span>
            {photoPanels ? (
              <div className="relative h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <img src={getFullImgUrl(photoPanels)} alt="Panels" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPanels("")}
                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700 shadow-md transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="photo-panels-upload"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 'panels')}
                  disabled={uploadingPanels}
                />
                <label
                  htmlFor="photo-panels-upload"
                  className={cn(
                    "flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
                    uploadingPanels 
                      ? "bg-slate-100 border-indigo-300 dark:bg-slate-800/40" 
                      : "border-slate-300 dark:border-slate-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 hover:border-indigo-500"
                  )}
                >
                  {uploadingPanels ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] font-semibold text-indigo-600">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="h-4 w-4 text-slate-400" />
                      <span className="text-[9px] font-semibold text-slate-500">Upload Photo</span>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Slot 3: Pump */}
          <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">3. Pump & Well Head</span>
            {photoPump ? (
              <div className="relative h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <img src={getFullImgUrl(photoPump)} alt="Pump" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPump("")}
                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700 shadow-md transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="photo-pump-upload"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 'pump')}
                  disabled={uploadingPump}
                />
                <label
                  htmlFor="photo-pump-upload"
                  className={cn(
                    "flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
                    uploadingPump 
                      ? "bg-slate-100 border-indigo-300 dark:bg-slate-800/40" 
                      : "border-slate-300 dark:border-slate-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 hover:border-indigo-500"
                  )}
                >
                  {uploadingPump ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] font-semibold text-indigo-600">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="h-4 w-4 text-slate-400" />
                      <span className="text-[9px] font-semibold text-slate-500">Upload Photo</span>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Slot 4: Site */}
          <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">4. Overall Installed Site</span>
            {photoSite ? (
              <div className="relative h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <img src={getFullImgUrl(photoSite)} alt="Site" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoSite("")}
                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700 shadow-md transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="photo-site-upload"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, 'site')}
                  disabled={uploadingSite}
                />
                <label
                  htmlFor="photo-site-upload"
                  className={cn(
                    "flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
                    uploadingSite 
                      ? "bg-slate-100 border-indigo-300 dark:bg-slate-800/40" 
                      : "border-slate-300 dark:border-slate-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 hover:border-indigo-500"
                  )}
                >
                  {uploadingSite ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] font-semibold text-indigo-600">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="h-4 w-4 text-slate-400" />
                      <span className="text-[9px] font-semibold text-slate-500">Upload Photo</span>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

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
  const [customerName, setCustomerName] = useState(initialData?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState((initialData?.payload as any)?.phone || "");
  const [dailyWaterNeed, setDailyWaterNeed] = useState((initialData?.payload as any)?.dailyWaterNeed || "");
  const [verticalLift, setVerticalLift] = useState((initialData?.payload as any)?.verticalLift || "");
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
    value: string | number | ""
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

    setCustomerName(selectedSale.customerName || customerName);
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

    if (!selectedSaleId && !customerName.trim() && !initialData) {
      toast.error("Enter client name or select completed sale pump product");
      return;
    }

    const finalEquipment = equipment.length > 0 
      ? equipment 
      : [{ name: pumpModel || "Solar Pump System Kit", quantityTaken: 1, quantityReturned: 0, quantityUsed: 1, unit: "Set" }];

    onSave({
      id: initialData?.id || `FW${Date.now().toString().slice(-6)}`,
      customerName: customerName || "Client Site",
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      workers: validWorkers.map((w) => ({
        ...w,
        behaviorRating: 3,
        payment: "",
      })) as any,
      pumpModel: pumpModel || "Solar Pump System",
      location: location || "N/A",
      status: initialData?.status || "planning",
      equipment: finalEquipment,
      notes,
      saleId: selectedSaleId || initialData?.saleId || null,
      fuelAmount: fuelAmount === "" ? undefined : Number(fuelAmount),
      fuelPrice: fuelPrice === "" ? undefined : Number(fuelPrice),
      payload: {
        phone: customerPhone,
        dailyWaterNeed,
        verticalLift,
        selectedPumpModel: pumpModel,
      } as any
    });
  };

  return (
    <div className="space-y-5">
      {/* Client & Site Details Section */}
      <Card className="p-4 border bg-amber-500/5 border-amber-500/20 space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5 border-b pb-1">
          <Users className="h-4 w-4 text-amber-500" /> Client & Installation Site Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Client / Customer Full Name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Abebe Bikila"
              className="h-8 text-xs bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Client Contact Phone</Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. +251 911 234 567"
              className="h-8 text-xs bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Site Location / City / Region</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Gondar, Amhara"
              className="h-8 text-xs bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Solar Pump Model</Label>
            <Input
              value={pumpModel}
              onChange={(e) => setPumpModel(e.target.value)}
              placeholder="e.g. SP-1000 or P3000-HD"
              className="h-8 text-xs bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Daily Water Requirement (m³/day)</Label>
            <Input
              type="number"
              value={dailyWaterNeed}
              onChange={(e) => setDailyWaterNeed(e.target.value)}
              placeholder="e.g. 50"
              className="h-8 text-xs bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Total Vertical Head Lift (Meters)</Label>
            <Input
              type="number"
              value={verticalLift}
              onChange={(e) => setVerticalLift(e.target.value)}
              placeholder="e.g. 120"
              className="h-8 text-xs bg-background"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-1.5">
        <Label>Or Select Completed Sale Pump Product (Auto-Fill)</Label>
        <Select value={selectedSaleId} onValueChange={handleCompletedSaleSelect} disabled={!!initialData}>
          <SelectTrigger>
            <SelectValue placeholder="Select completed sale pump product..." />
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
                <Input value={`${(Number(w.perDiem) * totalDays).toLocaleString()} ETB`} readOnly />
              </div>

              <div className="sm:col-span-2 lg:col-span-5 flex items-end justify-between">
                <p className="text-xs text-muted-foreground">
                  {totalDays} day(s) × {Number(w.perDiem).toLocaleString()} ETB = {(Number(w.perDiem) * totalDays).toLocaleString()} ETB
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
