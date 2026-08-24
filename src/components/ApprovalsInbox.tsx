import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { hierarchyRequestsDB, usersDB } from "@/lib/db-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Check, X, Send, Inbox, FileText, ChevronRight, ChevronDown, ChevronUp,
  Share2, PlusCircle, Package, Wrench, UserCheck, ShoppingCart, Bell,
  CheckCircle2, Clock, Eye, ExternalLink, Wallet, Users, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { NotificationsList } from "./NotificationsList";
import { formatCurrency } from "@/lib/data";
import { format } from "date-fns";


interface HierarchyRequest {
  id: string;
  title: string;
  description?: string;
  amount?: number | null;
  type: string;
  status: string;
  createdById: string;
  assignedToId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; username: string; displayName: string; department: string };
  assignedTo: { id: string; username: string; displayName: string; department: string };
  logs: {
    id: string;
    action: string;
    comment?: string;
    createdAt: string;
    user: { id: string; displayName: string };
  }[];
}

const TYPE_LABELS: Record<string, string> = {
  FINANCIAL_EXPENSE: "Financial Expense Write-off",
  PETTY_CASH: "Petty Cash Claim",
  STOCK_REORDER: "Stock / Tool Reorder",
  FIELD_TRIP: "Field Work Trip",
  MARKETING: "Marketing Budget",
  GENERAL: "Custom Memo / Decision",
  INDIVIDUAL_PAYROLL: "Staff Monthly Payroll Disbursement",
  PAYROLL_DISBURSEMENT: "Monthly Staff Payroll Batch",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  FORWARDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FORWARDED_TO_GM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FORWARDED_TO_FINANCE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  APPROVED_BY_FINANCE: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  FORWARDED: "Forwarded",
  FORWARDED_TO_GM: "Forwarded to GM",
  FORWARDED_TO_FINANCE: "Forwarded to Finance",
  APPROVED_BY_FINANCE: "Approved by Finance",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const TERMINAL_STATUSES = ["APPROVED", "REJECTED"];

function renderDetailedRequest(req: HierarchyRequest) {
  const desc = req.description || "";
  
  if (req.type === "STOCK_REORDER") {
    const qtyMatch = desc.match(/Stock request for (\d+) units of (.*?)(?:\s\(Code:|$)/);
    const codeMatch = desc.match(/\(Code:\s*(.*?)\)/);
    const requestedByMatch = desc.match(/Requested by:\s*(.*)/);
    const noteMatch = desc.match(/Note:\s*([\s\S]*)/);

    const qty = qtyMatch ? qtyMatch[1] : "—";
    const productName = qtyMatch ? qtyMatch[2] : "—";
    const code = codeMatch ? codeMatch[1] : "—";
    const note = noteMatch ? noteMatch[1].trim() : "";

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 border-b pb-2 border-primary/10">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider text-primary">Restock Item Details</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Product</span>
              <strong className="text-foreground">{productName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Code</span>
              <strong className="font-mono text-foreground">{code}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Quantity</span>
              <strong className="text-foreground">{qty} units</strong>
            </div>
            {req.amount && (
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Total Cost</span>
                <strong className="text-foreground">${Number(req.amount).toLocaleString()}</strong>
              </div>
            )}
          </div>
          {note && (
            <div className="text-xs bg-card p-2 rounded border border-muted mt-2">
              <span className="text-muted-foreground block text-[10px] uppercase mb-0.5">Requester's Note</span>
              <p className="text-muted-foreground italic">"{note}"</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (req.type === "FIELD_TRIP") {
    const v1Match = desc.match(/Fieldwork trip for (.*?) at (.*?) from (.*?) to (.*?)\./);
    const v1PumpMatch = desc.match(/Pump Model:\s*(.*)/);
    
    const v2Match = desc.match(/fieldwork job at (.*?) from (.*?) to (.*?)\./);
    const v2CrewMatch = desc.match(/Assembled Crew:\s*(.*)/);

    const v3Match = desc.match(/New pump sold to (.*?)\.\nLocation:\s*(.*?)\nItems:\s*(.*?)\nTotal:\s*(.*)/);

    if (v1Match) {
      const crew = v1Match[1];
      const location = v1Match[2];
      const start = v1Match[3];
      const end = v1Match[4];
      const pumpModel = v1PumpMatch ? v1PumpMatch[1].split("\n")[0].trim() : "—";
      const notesMatch = desc.match(/Notes:\s*([\s\S]*)/);
      const notes = notesMatch ? notesMatch[1].trim() : "";

      const fuelMatch = desc.match(/Fuel Request:\s*([\d\.]+)\s*L\s*@\s*([\d\.]+)\s*ETB\/L\s*\(Fuel cost:\s*([\d\.,]+)\s*ETB\)/i);
      const perDiemMatch = desc.match(/Total Per Diem:\s*([\d\.,]+)\s*ETB/i);

      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 border-primary/10">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider text-primary">Fieldwork Trip Details</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Location</span>
                <strong className="text-foreground">{location}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Pump Model</span>
                <strong className="text-foreground">{pumpModel}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Date Range</span>
                <strong className="text-foreground">{start} to {end}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Assigned Crew</span>
                <strong className="text-foreground">{crew}</strong>
              </div>
              {fuelMatch && (
                <>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Fuel Request</span>
                    <strong className="text-foreground">{fuelMatch[1]} Liters</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Fuel Price</span>
                    <strong className="text-foreground">{fuelMatch[2]} ETB/L</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Fuel Cost</span>
                    <strong className="text-foreground">{fuelMatch[3]} ETB</strong>
                  </div>
                  {perDiemMatch && (
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Crew Per Diem</span>
                      <strong className="text-foreground">{perDiemMatch[1]} ETB</strong>
                    </div>
                  )}
                </>
              )}
            </div>
            {notes && (
              <div className="text-xs bg-card p-2 rounded border border-muted mt-2">
                <span className="text-muted-foreground block text-[10px] uppercase mb-0.5">Deployment Notes</span>
                <p className="text-muted-foreground italic">"{notes}"</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (v2Match) {
      const location = v2Match[1];
      const start = v2Match[2];
      const end = v2Match[3];
      const crew = v2CrewMatch ? v2CrewMatch[1] : "—";

      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 border-primary/10">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider text-primary">Crew Verification</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Location</span>
                <strong className="text-foreground">{location}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Deployment Dates</span>
                <strong className="text-foreground">{start} to {end}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Assembled Crew</span>
                <strong className="text-foreground">{crew}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (v3Match) {
      const customer = v3Match[1];
      const location = v3Match[2];
      const items = v3Match[3];
      const total = v3Match[4];

      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 border-primary/10">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider text-primary">Installation Sale Request</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Customer</span>
                <strong className="text-foreground">{customer}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Location</span>
                <strong className="text-foreground">{location}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[10px] uppercase">Sold Items</span>
                <strong className="text-foreground">{items}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Total Value</span>
                <strong className="text-foreground text-primary">{total}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (req.type === "INDIVIDUAL_PAYROLL") {
    const details = (req as any).details || {};
    return (
      <div className="space-y-4">
        {/* Employee Summary Card */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5 border-emerald-500/15">
            <div className="flex items-center gap-2.5">
              {details.photoUrl ? (
                <img src={details.photoUrl} alt={details.fullName || "Staff"} className="h-11 w-11 rounded-full object-cover border-2 border-emerald-500/30" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                  {(details.fullName || "ST").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-[10px] font-mono text-emerald-600 font-bold block">STAFF ID: {details.workerCode || "EMP"}</span>
                <h4 className="font-bold text-sm text-foreground">{details.fullName || req.title}</h4>
                <span className="text-[11px] text-muted-foreground">{details.position || "Staff"} • <strong className="text-foreground">{details.department || "General"}</strong></span>
              </div>
            </div>
            {details.workerId && (
              <a
                href={`#/hr/workers/${details.workerId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20"
              >
                Inspect Dossier ↗
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Registered Salary</span>
              <strong className="font-mono text-foreground">{Number(details.salary || 0).toLocaleString()} ETB</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase text-amber-600">PAYE Tax</span>
              <strong className="font-mono text-amber-600 dark:text-amber-400">-{Number(details.payeTax || 0).toLocaleString()} ETB</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase text-blue-600">Pension (7%)</span>
              <strong className="font-mono text-blue-600 dark:text-blue-400">-{Number(details.employeePension || 0).toLocaleString()} ETB</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase text-destructive">Total Deductions</span>
              <strong className="font-mono text-destructive">-{Number(details.totalDeductions || 0).toLocaleString()} ETB</strong>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">Net Salary Payable</span>
              <span className="text-xs text-muted-foreground">To {details.bankName || "CBE"}: <strong className="font-mono text-foreground">{details.bankAccountNo || "—"}</strong></span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {Number(details.payableAmount || req.amount || 0).toLocaleString()} ETB
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (req.type === "PAYROLL_DISBURSEMENT") {
    const details = (req as any).details || {};
    const employees: any[] = Array.isArray(details.employees) ? details.employees : [];
    const paidCount = employees.filter((e) => e.paid).length;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex justify-between items-center border-b pb-2 border-emerald-500/15">
            <div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {details.payrollMonth || "Monthly Payroll"}
              </span>
              <p className="text-[11px] text-muted-foreground">{employees.length} Staff Members in Batch</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
              {paidCount} / {employees.length} Paid
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Gross Salary</span>
              <strong className="text-foreground">{formatCurrency(Number(details.totalSalary || 0))}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Net Salary Payable</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(Number(details.totalPayable || req.amount || 0))}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="text-muted-foreground text-xs font-semibold block">Description</span>
      <p className="text-sm bg-card p-3 rounded border text-muted-foreground whitespace-pre-line">
        {desc || "No description provided."}
      </p>
    </div>
  );
}

export function ApprovalsInbox() {
  const navigate = useNavigate();
  const { currentUser, users, hasAccess } = useAuth();
  const [requests, setRequests] = useState<HierarchyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HierarchyRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Create request form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    type: "FINANCIAL_EXPENSE",
    comment: "",
    assignedToId: "",
  });

  // Action state
  const [actionComment, setActionComment] = useState("");
  const [forwardUser, setForwardUser] = useState("");
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await hierarchyRequestsDB.getAll();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
      usersDB.getAll().then((data) => setSystemUsers(Array.isArray(data) ? data : [])).catch(() => undefined);
    }
  }, [currentUser]);

  const handleCreate = async () => {
    if (!form.title || !form.type) {
      toast.error("Title and Type are required");
      return;
    }
    try {
      await hierarchyRequestsDB.create({
        ...form,
        amount: form.amount ? Number(form.amount) : null,
      });
      toast.success("Request submitted successfully!");
      setCreateDialogOpen(false);
      setForm({ title: "", description: "", amount: "", type: "FINANCIAL_EXPENSE", comment: "", assignedToId: "" });
      fetchRequests();
    } catch (e) {
      toast.error("Failed to submit request");
    }
  };

  const handleAction = async (action: "APPROVE" | "REJECT" | "FORWARD") => {
    if (!selectedRequest) return;
    try {
      const comment = action === "FORWARD" ? forwardUser : actionComment;
      if (action === "FORWARD" && !forwardUser) {
        toast.error("Please select a user to forward to");
        return;
      }
      await hierarchyRequestsDB.action(selectedRequest.id, action, comment);
      toast.success(`Request ${action.toLowerCase()}d successfully`);
      setDialogOpen(false);
      setSelectedRequest(null);
      setActionComment("");
      setForwardUser("");
      fetchRequests();
    } catch (e) {
      toast.error("Failed to perform action");
    }
  };

  // Dropdown expansion state for inline accordion
  const [expandedReqIds, setExpandedReqIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedReqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkEmployeePaid = async (req: HierarchyRequest, empWorkerId: string) => {
    try {
      const details = (req as any).details || {};
      const employees = Array.isArray(details.employees) ? [...details.employees] : [];
      const targetEmp = employees.find((e: any) => e.workerId === empWorkerId || e.workerCode === empWorkerId);
      if (!targetEmp) return;

      const paidTimestamp = new Date().toISOString();
      const paymentRef = `CBE-PAY-${req.id.slice(-6).toUpperCase()}`;

      const updatedEmployees = employees.map((e: any) => {
        if (e.workerId === empWorkerId || e.workerCode === empWorkerId) {
          return {
            ...e,
            paid: true,
            paidAt: paidTimestamp,
            paymentRef,
            paidBy: currentUser?.displayName || "Finance Dept",
          };
        }
        return e;
      });

      const allNowPaid = updatedEmployees.every((e: any) => e.paid);

      await hierarchyRequestsDB.updateDetails(
        req.id,
        {
          employees: updatedEmployees,
          status: allNowPaid ? "APPROVED" : req.status,
        },
        `Disbursed salary to ${targetEmp.fullName} (${targetEmp.workerCode}) via ${paymentRef}`
      );

      toast.success(`Disbursed salary for ${targetEmp.fullName}!`);
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to mark employee as paid");
    }
  };

  const handleMarkAllEmployeesPaid = async (req: HierarchyRequest) => {
    try {
      const details = (req as any).details || {};
      const employees = Array.isArray(details.employees) ? [...details.employees] : [];
      const paidTimestamp = new Date().toISOString();
      const paymentRef = `CBE-BATCH-${req.id.slice(-6).toUpperCase()}`;

      const updatedEmployees = employees.map((e: any) => ({
        ...e,
        paid: true,
        paidAt: e.paidAt || paidTimestamp,
        paymentRef: e.paymentRef || paymentRef,
        paidBy: currentUser?.displayName || "Finance Dept",
      }));

      await hierarchyRequestsDB.updateDetails(
        req.id,
        {
          employees: updatedEmployees,
          status: "APPROVED",
        },
        `Batch marked all ${employees.length} employees as Paid via ${paymentRef}`
      );

      toast.success(`Successfully marked all ${employees.length} employees as Paid!`);
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to mark all as paid");
    }
  };

  const isFinanceOrAdmin = hasAccess(["finance", "admin"]);
  const myRequests = requests.filter((r) => r.createdById === currentUser?.id);
  const pendingApprovals = requests.filter((r) => {
    const isTerminal = TERMINAL_STATUSES.includes(r.status?.toUpperCase());
    if (isTerminal) return false;
    if (r.assignedToId === currentUser?.id) return true;
    if (isFinanceOrAdmin && (r.type === "INDIVIDUAL_PAYROLL" || r.type === "PAYROLL_DISBURSEMENT" || r.assignedTo?.department === "Finance")) {
      return true;
    }
    return false;
  });
  const historyRequests = requests.filter((r) => {
    const isTerminal = TERMINAL_STATUSES.includes(r.status?.toUpperCase());
    if (!isTerminal) return false;
    if (r.createdById === currentUser?.id || r.assignedToId === currentUser?.id) return true;
    if (isFinanceOrAdmin && (r.type === "INDIVIDUAL_PAYROLL" || r.type === "PAYROLL_DISBURSEMENT")) return true;
    return false;
  });

  const renderRequestRow = (req: HierarchyRequest, tab: "inbox" | "sent" | "history") => {
    const isExpanded = expandedReqIds.has(req.id);
    const isPayroll =
      req.type === "PAYROLL_DISBURSEMENT" ||
      req.type === "INDIVIDUAL_PAYROLL" ||
      req.type?.toLowerCase().includes("payroll") ||
      req.title?.toLowerCase().includes("payroll");

    const details = (req as any).details || {};
    const employees: any[] = Array.isArray(details.employees) ? details.employees : [];
    const paidCount = employees.length > 0 ? employees.filter((e) => e.paid).length : (req.status === "APPROVED" || req.status === "PAID" ? 1 : 0);
    const totalEmployees = employees.length || (req.type === "INDIVIDUAL_PAYROLL" ? 1 : details.staffCount || 0);
    const progressPercent = totalEmployees > 0 ? Math.round((paidCount / totalEmployees) * 100) : 0;
    const isFullyPaid = req.status === "APPROVED" || req.status === "PAID" || (employees.length > 0 && paidCount === totalEmployees);

    return (
      <div key={req.id} className="contents">
        <TableRow
          className={`hover:bg-muted/40 transition-colors ${isExpanded ? "bg-muted/20 border-b-0" : ""}`}
        >
          <TableCell>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(req.id);
                }}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                title={isExpanded ? "Collapse dropdown" : "Expand dropdown"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="flex flex-col">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  {req.title}
                  {isPayroll && totalEmployees > 0 && (
                    <Badge variant="outline" className={`text-[10px] font-bold ${isFullyPaid ? "bg-green-100 text-green-800 border-green-300" : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
                      {paidCount}/{totalEmployees} Paid
                    </Badge>
                  )}
                </span>
                {isPayroll && (
                  <span className="text-[11px] text-muted-foreground">
                    Click dropdown ▼ to review employees & execute disbursements inline
                  </span>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary" className="text-xs font-normal">
              {TYPE_LABELS[req.type] || req.type}
            </Badge>
          </TableCell>
          <TableCell className="text-xs">
            {tab === "sent" ? req.assignedTo?.displayName || "Self" : req.createdBy?.displayName || req.createdById}
          </TableCell>
          <TableCell className="font-semibold text-xs">
            {req.amount ? `${Number(req.amount).toLocaleString()} ETB` : "—"}
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">
            {new Date(req.createdAt).toLocaleDateString()}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {isFinanceOrAdmin && !isFullyPaid && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-xs h-8 shadow-sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (employees.length > 0) {
                      await handleMarkAllEmployeesPaid(req);
                    } else {
                      setSelectedRequest(req);
                      await handleAction("APPROVE");
                    }
                  }}
                  title="Authorize & mark as paid"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                </Button>
              )}
              {isFullyPaid && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold gap-1 text-xs h-7 px-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> PAID
                </Badge>
              )}
              <Button
                size="sm"
                variant={isExpanded ? "secondary" : "outline"}
                className="gap-1 text-xs h-8"
                onClick={() => toggleExpand(req.id)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Collapse
                  </>
                ) : isPayroll ? (
                  <>
                    <Users className="h-3.5 w-3.5" /> {employees.length > 0 ? `View Roster (${totalEmployees})` : "View Details"}
                  </>
                ) : (
                  <>
                    Details <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </TableCell>
        </TableRow>

        {/* Expandable Inline Dropdown Row */}
        {isExpanded && (
          <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-border/80">
            <TableCell colSpan={6} className="p-4 sm:p-5">
              {isPayroll && employees.length > 0 ? (
                <div className="space-y-4">
                  {/* Batch Overview Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 rounded-lg bg-card border shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                          {details.payrollMonth || "Monthly Payroll"}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {totalEmployees} Employees Total
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Net Payable: {formatCurrency(Number(details.totalPayable || req.amount || 0))}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                        <span>Gross: {formatCurrency(Number(details.totalSalary || 0))}</span>
                        <span>•</span>
                        <span>PAYE: -{formatCurrency(Number(details.totalPaye || 0))}</span>
                        <span>•</span>
                        <span>Pension 7%: -{formatCurrency(Number(details.totalPension || 0))}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {paidCount} of {totalEmployees} Paid ({progressPercent}%)
                        </span>
                        <div className="w-28 bg-muted rounded-full h-2 mt-1 overflow-hidden border">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {isFinanceOrAdmin && paidCount < totalEmployees && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAllEmployeesPaid(req)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs h-8 shadow-sm shrink-0"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark All as Paid
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Inline Employee Roster Table */}
                  <div className="rounded-lg border bg-card overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="text-xs">
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Employee Details</TableHead>
                          <TableHead>Department & Role</TableHead>
                          <TableHead>Bank Account</TableHead>
                          <TableHead className="text-right">Salary Payable</TableHead>
                          <TableHead className="text-center">Dossier File</TableHead>
                          <TableHead className="text-right">Payment Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp: any, idx: number) => {
                          const isPaid = Boolean(emp.paid);
                          return (
                            <TableRow key={emp.workerId || emp.workerCode || idx} className="text-xs hover:bg-muted/20">
                              <TableCell className="text-center font-mono text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  {emp.photoUrl ? (
                                    <img
                                      src={emp.photoUrl}
                                      alt={emp.fullName}
                                      className="w-8 h-8 rounded-full object-cover border shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                      {(emp.fullName || "E").charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-foreground">{emp.fullName}</p>
                                    <p className="text-[11px] font-mono text-muted-foreground">{emp.workerCode}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[11px] bg-muted/40">
                                  {emp.department}
                                </Badge>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{emp.position}</p>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium text-foreground">{emp.bankName}</p>
                                <p className="text-[11px] font-mono text-muted-foreground">{emp.bankAccountNo}</p>
                              </TableCell>
                              <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(Number(emp.payableAmount || 0))}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.open(`/#/hr/workers/${emp.workerId || emp.workerCode}`, "_blank");
                                  }}
                                  className="h-7 text-[11px] gap-1 px-2.5"
                                >
                                  <ExternalLink className="h-3 w-3 text-primary" /> View File
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">
                                {isPaid ? (
                                  <div className="inline-flex flex-col items-end">
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 font-bold gap-1 text-[11px]">
                                      <CheckCircle2 className="h-3 w-3" /> PAID
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground mt-0.5">
                                      {emp.paidAt ? format(new Date(emp.paidAt), "dd MMM, HH:mm") : "Disbursed"}
                                    </span>
                                  </div>
                                ) : isFinanceOrAdmin ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkEmployeePaid(req, emp.workerId || emp.workerCode)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-7 px-3 gap-1 shadow-xs"
                                  >
                                    <Wallet className="h-3 w-3" /> Mark Paid
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[11px]">
                                    Pending Review
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : isPayroll ? (
                /* Individual Payroll Card */
                <div className="p-4 bg-card rounded-lg border space-y-3">
                  <div className="flex justify-between items-center border-b pb-3">
                    <div className="flex items-center gap-3">
                      {details.photoUrl ? (
                        <img src={details.photoUrl} alt={details.fullName || "Staff"} className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                          {(details.fullName || "S").charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{details.fullName || req.title}</h4>
                        <p className="text-xs text-muted-foreground">{details.workerCode} • {details.department} • {details.position}</p>
                      </div>
                    </div>
                    {details.workerId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/#/hr/workers/${details.workerId}`, "_blank")}
                        className="text-xs h-7 gap-1"
                      >
                        <ExternalLink className="h-3 w-3 text-primary" /> View File
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Gross Salary</span>
                      <strong>{formatCurrency(Number(details.salary || 0))}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">PAYE Tax</span>
                      <strong className="text-amber-600">-{formatCurrency(Number(details.payeTax || 0))}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Pension (7%)</span>
                      <strong className="text-blue-600">-{formatCurrency(Number(details.employeePension || 0))}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Salary Payable</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        {formatCurrency(Number(details.payableAmount || req.amount || 0))}
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Disbursement Account: <strong>{details.bankName || "CBE"} ({details.bankAccountNo || "—"})</strong>
                    </span>
                    {isFinanceOrAdmin && !isFullyPaid && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          setSelectedRequest(req);
                          await handleAction("APPROVE");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* General Request Dropdown View with Instant Actions */
                <div className="p-4 bg-card rounded-lg border text-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{req.title}</p>
                      <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{req.description || "No description provided."}</p>
                    </div>
                    {req.amount && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                        {Number(req.amount).toLocaleString()} ETB
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedRequest(req);
                        setDialogOpen(true);
                      }}
                      className="text-xs h-7 text-muted-foreground hover:text-foreground"
                    >
                      More Details / History <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>

                    {((req.assignedToId === currentUser?.id) || isFinanceOrAdmin) && !TERMINAL_STATUSES.includes(req.status?.toUpperCase()) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            setSelectedRequest(req);
                            await handleAction("REJECT");
                          }}
                          className="h-7 text-xs px-2.5"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            setSelectedRequest(req);
                            await handleAction("APPROVE");
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs px-3 shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve & Mark Paid
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TableCell>
          </TableRow>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div>
          <CardTitle className="text-xl font-bold font-heading flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" /> Requests & Approvals Hub
          </CardTitle>
          <CardDescription>Review and track requests flowing through reporting lines</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-1.5" /> Submit Request
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inbox" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inbox" className="relative">
              Inbox / Approvals
              {pendingApprovals.length > 0 && (
                <span className="ml-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">
                  {pendingApprovals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">My Requests ({myRequests.length})</TabsTrigger>
            <TabsTrigger value="history">History ({historyRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading inbox...</div>
            ) : pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg p-6">
                No pending requests requiring your action.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.map((req) => renderRequestRow(req, "inbox"))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading requests...</div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg p-6">
                You haven't submitted any requests yet.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((req) => renderRequestRow(req, "sent"))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading history...</div>
            ) : historyRequests.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg p-6">
                No completed requests yet.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>From / To</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRequests.map((req) => renderRequestRow(req, "history"))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Submit Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Submit Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Field trip budget to Bishoftu"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="type">Request Category</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FINANCIAL_EXPENSE">Financial Expense Write-off</SelectItem>
                    <SelectItem value="PETTY_CASH">Petty Cash Reimbursement</SelectItem>
                    <SelectItem value="STOCK_REORDER">Stock / Tool Request</SelectItem>
                    <SelectItem value="FIELD_TRIP">Field Work Trip</SelectItem>
                    <SelectItem value="GENERAL">Custom Memo / Decision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Write-off / Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Optional"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignedTo">Send To Target Recipient</Label>
              <Select value={form.assignedToId} onValueChange={v => setForm({ ...form, assignedToId: v })}>
                <SelectTrigger id="assignedTo"><SelectValue placeholder="Select target recipient / manager" /></SelectTrigger>
                <SelectContent>
                  {systemUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.displayName || u.username} ({u.role?.toUpperCase() || u.department || "User"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Details of the request or task..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comment">Submission Message</Label>
              <Input
                id="comment"
                placeholder="Any note for the manager..."
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Send className="h-4 w-4 mr-1.5" /> Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Request Details & Actions Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[500px]">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedRequest.title}</span>
                  <Badge variant="outline" className={STATUS_COLORS[selectedRequest.status?.toUpperCase()] || "bg-gray-100"}>
                    {STATUS_LABELS[selectedRequest.status?.toUpperCase()] || selectedRequest.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 my-2">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted p-3 rounded-lg">
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase">From</span>
                    <strong className="font-semibold text-foreground">
                      {selectedRequest.createdBy?.displayName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase">Department</span>
                    <strong className="font-semibold text-foreground">
                      {selectedRequest.createdBy?.department || "Unassigned"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase">Type</span>
                    <strong className="font-semibold text-foreground">
                      {TYPE_LABELS[selectedRequest.type] || selectedRequest.type}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase">Amount</span>
                    <strong className="font-semibold text-foreground">
                      {selectedRequest.amount ? `${Number(selectedRequest.amount).toLocaleString()} ETB` : "—"}
                    </strong>
                  </div>
                </div>

                {renderDetailedRequest(selectedRequest)}

                {/* Audit Logs / Activity History */}
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-xs font-semibold block">Activity History</span>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                    {selectedRequest.logs?.map((log) => (
                      <div key={log.id} className="text-xs flex flex-col gap-0.5 border-b pb-1 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <strong>{log.user?.displayName}</strong>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline" className="scale-[0.8] origin-left">
                            {log.action}
                          </Badge>
                          <span className="text-foreground">{log.comment}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Inputs - visible if assignee OR if user is Finance/Admin for payroll */}
                {((selectedRequest.assignedToId === currentUser?.id) || (isFinanceOrAdmin && (selectedRequest.type === "INDIVIDUAL_PAYROLL" || selectedRequest.type === "PAYROLL_DISBURSEMENT"))) && !TERMINAL_STATUSES.includes(selectedRequest.status?.toUpperCase()) && (
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-semibold">
                      {selectedRequest.type === "INDIVIDUAL_PAYROLL" ? "Finance Payment Execution & Reference" : "Take Action"}
                    </Label>
                    <Textarea
                      placeholder={selectedRequest.type === "INDIVIDUAL_PAYROLL" ? "Enter Bank Transfer Reference (e.g. CBE-FT-849201) or notes..." : "Add a comment or routing message..."}
                      value={actionComment}
                      onChange={e => setActionComment(e.target.value)}
                    />
                    
                    {/* Multi-tier Forwarding for any recipient */}
                    {selectedRequest.type !== "INDIVIDUAL_PAYROLL" && (
                      <div className="space-y-1.5 border-t pt-3 border-border">
                        <Label htmlFor="forward-user" className="text-xs font-semibold">Forward request to another person / role:</Label>
                        <div className="flex gap-2">
                          <Select value={forwardUser} onValueChange={setForwardUser}>
                            <SelectTrigger id="forward-user" className="flex-1">
                              <SelectValue placeholder="Select target user to forward to" />
                            </SelectTrigger>
                            <SelectContent>
                              {systemUsers
                                .filter(u => u.id !== currentUser.id && u.id !== selectedRequest.createdById)
                                .map(u => (
                                  <SelectItem key={u.id} value={u.username || u.id}>
                                    {u.displayName || u.username} ({u.role?.toUpperCase() || u.department || "User"})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="secondary" onClick={() => handleAction("FORWARD")}>
                            <Share2 className="h-4 w-4 mr-1" /> Forward
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction("REJECT")}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        onClick={() => handleAction("APPROVE")}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {selectedRequest.type === "INDIVIDUAL_PAYROLL" ? "Authorize & Mark as Paid" : "Approve"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </Card>
  );
}

export default ApprovalsInbox;
