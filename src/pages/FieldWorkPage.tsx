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
import { FieldWork, FieldWorkEquipment, FieldWorker, ReturnForm } from "@/lib/fieldwork-data";
import { hierarchyRequestsDB, pumpProductsDB } from "@/lib/db-service";
import { useParams } from "react-router-dom";
import { WaterSource } from "@/lib/pump-sizing";
import ApprovalsInbox from "@/components/ApprovalsInbox";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CardHeader, CardTitle } from "@/components/ui/card";

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

export default function FieldWorkPage() {
  const { section } = useParams<{ section: string }>();
  const { currentUser } = useAuth();
  const { fieldWorks, addFieldWork, updateFieldWork, deleteFieldWork: dbDeleteFieldWork, addReturnForm, sales = [] } = useStore() as any;

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
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
      (fw: FieldWork) => fw.status === "in-progress" && isAfter(today, parseISO(fw.endDate))
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

  const activeCount = fieldWorks.filter((fw: FieldWork) => fw.status === "in-progress").length;

  const totalPerDiemAll = fieldWorks.reduce((sum: number, fw: FieldWork) => {
    const days = getInclusiveDays(fw.startDate, fw.endDate);
    const fwTotal = fw.workers.reduce((workerSum, worker) => workerSum + worker.perDiem * days, 0);
    return sum + fwTotal;
  }, 0);

  const completeFieldWork = async (id: string) => {
    const current = fieldWorks.find((fw: FieldWork) => fw.id === id);
    if (!current) return;
    await updateFieldWork(id, { ...current, status: "completed" as const });
    toast.success("Field work marked as completed");
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
    return <PumpSizingSection />;
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
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filtered.map((fw) => {
              const isOverdue = fw.status === "in-progress" && isAfter(new Date(), parseISO(fw.endDate));
              const totalDays = getInclusiveDays(fw.startDate, fw.endDate);
              const totalPerDiem = fw.workers.reduce((sum, w) => sum + w.perDiem * totalDays, 0);

              return (
                <div key={fw.id} className={cn("border rounded-lg overflow-hidden", isOverdue && "border-destructive/50")}>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === fw.id ? null : fw.id)}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">{fw.workers.map((w) => w.name).join(", ")}</p>
                        <p className="text-xs text-muted-foreground">{fw.workers.length} worker(s)</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {fw.pumpModel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fw.location}</span>
                      <span className="text-xs text-muted-foreground">
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
                        className={
                          fw.status === "in-progress"
                            ? "bg-warning/15 text-warning border-warning/20"
                            : "bg-success/15 text-success border-success/20"
                        }
                      >
                        {fw.status === "in-progress" ? "In Progress" : "Completed"}
                      </Badge>
                      {expandedId === fw.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {expandedId === fw.id && (
                    <div className="border-t p-4 bg-muted/20 space-y-4">
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

                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => requestSecurity(() => openEdit(fw))}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openReturnForm(fw)}>
                          <RotateCcw className="h-4 w-4 mr-1" /> Add Return Form
                        </Button>
                        {currentUser?.username === "tech_leader" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0" onClick={() => submitCrewForApproval(fw.id)}>
                            Request Crew Approval
                          </Button>
                        )}
                        {fw.status === "in-progress" && (
                          <Button size="sm" onClick={() => completeFieldWork(fw.id)}>
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
                setReturnFormOpen(false);
                toast.success("Return form added");
              }}
              onCancel={() => setReturnFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── OVERVIEW SECTION ───
function OverviewSection({ fieldWorks }: { fieldWorks: FieldWork[] }) {
  const activeCount = fieldWorks.filter((fw: FieldWork) => fw.status === "in-progress").length;
  const completedCount = fieldWorks.filter((fw: FieldWork) => fw.status === "completed").length;
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

  const handleSave = () => {
    if (!workerName.trim()) {
      toast.error("Select a worker");
      return;
    }

    const validMaterials = materials.filter((m) => m.name.trim());
    if (validMaterials.length === 0) {
      toast.error("Add at least one returned material");
      return;
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
        <Button onClick={handleSave}>Submit Return Form</Button>
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
