import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { hierarchyRequestsDB } from "@/lib/db-service";
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
import { Check, X, Send, Inbox, FileText, ChevronRight, Share2, PlusCircle, Package, Wrench, UserCheck, ShoppingCart, Bell, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { TaskBoard } from "./TaskBoard";
import { NotificationsList } from "./NotificationsList";


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
  FIELD_TRIP: "Field Work Trip",
  MARKETING: "Marketing Budget",
  STOCK_REORDER: "Stock Reorder",
  GENERAL: "General Task",
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

  // Fallback to standard rendering
  return (
    <div className="space-y-1.5">
      <span className="text-muted-foreground text-xs font-semibold block">Description</span>
      <p className="text-sm bg-card p-3 rounded border text-muted-foreground whitespace-pre-line">
        {desc || "No description provided."}
      </p>
    </div>
  );
}

export default function ApprovalsInbox() {
  const { currentUser, users } = useAuth();
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
    type: "GENERAL",
    comment: "",
  });

  // Action state
  const [actionComment, setActionComment] = useState("");
  const [forwardUser, setForwardUser] = useState("");

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
      setForm({ title: "", description: "", amount: "", type: "GENERAL", comment: "" });
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

  const myRequests = requests.filter(r => r.createdById === currentUser?.id);
  const pendingApprovals = requests.filter(r => r.assignedToId === currentUser?.id && !TERMINAL_STATUSES.includes(r.status?.toUpperCase()));
  const historyRequests = requests.filter(r => (r.createdById === currentUser?.id || r.assignedToId === currentUser?.id) && TERMINAL_STATUSES.includes(r.status?.toUpperCase()));

  return (
    <Tabs defaultValue="approvals" className="w-full space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="approvals" className="flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          Formal Approvals
        </TabsTrigger>
        <TabsTrigger value="tasks" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Task Board
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alerts & Activity
        </TabsTrigger>
      </TabsList>

      <TabsContent value="approvals" className="space-y-4">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div>
          <CardTitle className="text-xl font-bold font-heading flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" /> Approvals & Tasks Hub
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
              <div className="rounded-md border">
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
                    {pendingApprovals.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold">{req.title}</TableCell>
                        <TableCell>{TYPE_LABELS[req.type] || req.type}</TableCell>
                        <TableCell>{req.createdBy?.displayName || req.createdById}</TableCell>
                        <TableCell>{req.amount ? `$${Number(req.amount).toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(req);
                              setDialogOpen(true);
                            }}
                          >
                            Review <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold">{req.title}</TableCell>
                        <TableCell>{TYPE_LABELS[req.type] || req.type}</TableCell>
                        <TableCell>{req.assignedTo?.displayName || "Self"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[req.status?.toUpperCase()] || "bg-gray-100"}>
                            {STATUS_LABELS[req.status?.toUpperCase()] || req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRequest(req);
                              setDialogOpen(true);
                            }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold">{req.title}</TableCell>
                        <TableCell>{TYPE_LABELS[req.type] || req.type}</TableCell>
                        <TableCell>{req.createdBy?.displayName || req.createdById}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[req.status?.toUpperCase()] || "bg-gray-100"}>
                            {STATUS_LABELS[req.status?.toUpperCase()] || req.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{req.amount ? `$${Number(req.amount).toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRequest(req);
                              setDialogOpen(true);
                            }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
                <Label htmlFor="type">Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General Task</SelectItem>
                    <SelectItem value="FIELD_TRIP">Field Work Trip</SelectItem>
                    <SelectItem value="MARKETING">Marketing Budget</SelectItem>
                    <SelectItem value="STOCK_REORDER">Stock Reorder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Budget Amount ($)</Label>
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
                      {selectedRequest.amount ? `$${Number(selectedRequest.amount).toLocaleString()}` : "—"}
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

                {/* Action Inputs - visible only if the user is the active assignee and status is not terminal */}
                {selectedRequest.assignedToId === currentUser?.id && !TERMINAL_STATUSES.includes(selectedRequest.status?.toUpperCase()) && (
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-semibold">Take Action</Label>
                    <Textarea
                      placeholder="Add a comment or routing message..."
                      value={actionComment}
                      onChange={e => setActionComment(e.target.value)}
                    />
                    
                    {/* Forward option specifically for General Manager */}
                    {currentUser?.role === "manager" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="forward-user" className="text-xs">Or Forward request to (Manager):</Label>
                        <div className="flex gap-2">
                          <Select value={forwardUser} onValueChange={setForwardUser}>
                            <SelectTrigger id="forward-user" className="flex-1">
                              <SelectValue placeholder="Select user to route to" />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter(u => u.id !== currentUser.id && u.id !== selectedRequest.createdById)
                                .map(u => (
                                  <SelectItem key={u.id} value={u.username}>
                                    {u.displayName} ({u.role})
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
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAction("APPROVE")}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
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
      </TabsContent>

      <TabsContent value="tasks" className="space-y-4 bg-card p-6 border rounded-xl shadow-sm">
        <TaskBoard />
      </TabsContent>

      <TabsContent value="notifications" className="space-y-4 bg-card p-6 border rounded-xl shadow-sm">
        <NotificationsList />
      </TabsContent>
    </Tabs>
  );
}
