import { useState, useMemo } from "react";
import { useAuth, AppUser, UserRole, ROLE_LABELS } from "@/context/AuthContext";
import { OrgChartDialog } from "@/components/OrgChartDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Users, ShieldCheck, GitFork, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<UserRole, string> = {
  manager: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400",
  fieldwork: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400",
  ttl: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400",
  finance: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400",
  storekeeper: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400",
  sales: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400",
  technician: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400",
  attendance: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400",
};

interface OrgNodeProps {
  user: AppUser;
  allUsers: AppUser[];
  level: number;
}

function OrgNode({ user, allUsers, level }: OrgNodeProps) {
  const directReports = useMemo(() => {
    return allUsers.filter(u => u.reportsToId === user.id);
  }, [allUsers, user.id]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Node Card */}
      <div className={cn(
        "p-4 rounded-2xl border shadow-sm w-56 flex flex-col items-center text-center transition-all bg-card/60 backdrop-blur-md relative",
        level === 0 
          ? "border-purple-500 ring-2 ring-purple-500/20 shadow-purple-500/10" 
          : level === 1 
            ? "border-blue-400 hover:border-blue-500" 
            : "border-border hover:border-muted-foreground/30"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center font-black text-lg mb-2 text-white shadow-md",
          level === 0 ? "bg-purple-600" : level === 1 ? "bg-blue-600" : "bg-slate-500"
        )}>
          {user.displayName.slice(0, 2).toUpperCase()}
        </div>
        <h4 className="font-bold text-sm tracking-tight">{user.displayName}</h4>
        <p className="text-[10px] text-muted-foreground font-mono">@{user.username}</p>
        
        <div className="mt-2.5">
          <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5", ROLE_COLORS[user.role] || "bg-slate-100 text-slate-800")}>
            {ROLE_LABELS[user.role] || user.role}
          </Badge>
        </div>

        {user.department && (
          <p className="text-[9px] font-black tracking-widest text-primary/85 mt-2 uppercase border-t pt-1.5 w-full border-border/50">
            {user.department.replace('_', ' ')}
          </p>
        )}
      </div>

      {/* Children Nodes */}
      {directReports.length > 0 && (
        <div className="w-full flex flex-col items-center">
          {/* Vertical connection line */}
          <div className="w-0.5 h-6 bg-border" />
          
          {/* Horizontal connecting line bar */}
          {directReports.length > 1 && (
            <div className="w-4/5 h-0.5 bg-border relative mb-2" />
          )}

          {/* Children grid */}
          <div className="flex justify-center gap-6 pt-2">
            {directReports.map((report) => (
              <OrgNode key={report.id} user={report} allUsers={allUsers} level={level + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserAccountsPage() {
  const { users, addUser, updateUser, deleteUser, currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ 
    username: "", 
    password: "", 
    displayName: "", 
    role: "storekeeper" as UserRole,
    reportsToId: "",
    department: "",
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ 
      username: "", 
      password: "", 
      displayName: "", 
      role: "storekeeper",
      reportsToId: "",
      department: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({ 
      username: u.username, 
      password: u.password || "", 
      displayName: u.displayName, 
      role: u.role,
      reportsToId: u.reportsToId || "",
      department: u.department || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.username || (!editing && !form.password) || !form.displayName) {
      toast.error("Required fields are missing");
      return;
    }
    const payload = {
      ...form,
      reportsToId: form.reportsToId === "none" || !form.reportsToId ? null : form.reportsToId,
      department: form.department || null,
    };
    if (editing) {
      await updateUser({ ...editing, ...payload });
    } else {
      await addUser({ id: crypto.randomUUID(), ...payload });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (u: AppUser) => {
    if (u.id === currentUser?.id) { toast.error("Cannot delete yourself"); return; }
    await deleteUser(u.id);
  };

  const rootUsers = useMemo(() => {
    return users.filter(u => !u.reportsToId || u.reportsToId === "none" || !users.some(parent => parent.id === u.reportsToId));
  }, [users]);
  const [orgChartOpen, setOrgChartOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">User Accounts & Org</h1>
            <p className="text-sm text-muted-foreground">Manage system users, roles, and reporting structures</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setOrgChartOpen(true)} className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
            <ShieldCheck className="h-4 w-4" /> View Corporate Org Chart
          </Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
        </div>
      </div>
      <OrgChartDialog open={orgChartOpen} onOpenChange={setOrgChartOpen} />

      <Tabs defaultValue="list" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 w-72">
          <TabsTrigger value="list" className="font-bold flex items-center gap-1.5">
            <User className="h-4 w-4" /> Users List
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="font-bold flex items-center gap-1.5">
            <GitFork className="h-4 w-4" /> Hierarchy Tree
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Manager (Reports To)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const manager = users.find(m => m.id === u.reportsToId);
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-semibold">{u.displayName}</TableCell>
                        <TableCell className="font-mono text-xs">@{u.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ROLE_COLORS[u.role] || "bg-slate-100 text-slate-800"}>
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-medium">
                          {manager ? `${manager.displayName} (@${manager.username})` : <span className="italic text-xs text-muted-foreground/60">None (General Manager)</span>}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="pt-2">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Organizational Structure</CardTitle>
                <CardDescription>Visual chart representing who reports to who in the corporate matrix.</CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">{users.length} Active System Users</Badge>
            </CardHeader>
            <CardContent className="p-8 overflow-x-auto custom-scrollbar">
              <div className="flex flex-col items-center min-w-[800px] justify-center gap-12 pt-4">
                {rootUsers.map((root) => (
                  <OrgNode key={root.id} user={root} allUsers={users} level={0} />
                ))}
                {rootUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <GitFork className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-bold">No hierarchy nodes could be mapped</p>
                    <p className="text-xs">Ensure your user accounts have valid reports-to settings configured.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue placeholder="No Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL_MANAGEMENT">General Management</SelectItem>
                  <SelectItem value="TECHNICAL">Technical</SelectItem>
                  <SelectItem value="MARKETING">Marketing & Social Media</SelectItem>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                  <SelectItem value="INVENTORY">Inventory/Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reports To (Manager)</Label>
              <Select value={form.reportsToId} onValueChange={(v) => setForm({ ...form, reportsToId: v })}>
                <SelectTrigger><SelectValue placeholder="No Manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (General Manager)</SelectItem>
                  {users
                    .filter((u) => u.id !== editing?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.displayName} ({u.username})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
