import { useState } from "react";
import { useAuth, AppUser, UserRole, ROLE_LABELS } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
      reportsToId: form.reportsToId || null,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">User Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage system users and roles</p>
          </div>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.displayName}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_COLORS[u.role] || "bg-slate-100 text-slate-800"}>
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
