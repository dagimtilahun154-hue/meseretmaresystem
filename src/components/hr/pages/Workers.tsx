import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Edit, Trash2, Users, Camera, Upload, Eye,
  Building2, MapPin, ShieldCheck, UserCheck, CreditCard
} from "lucide-react";
import { hrDB, DEFAULT_DEPARTMENTS } from "@/lib/db-service";
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import { formatCurrency } from "@/lib/data";
import { EmployeeIdCardModal } from "../EmployeeIdCardModal";

export default function Workers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [search, setSearch] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [idCardWorker, setIdCardWorker] = useState<any | null>(null);
  const [viewingWorker, setViewingWorker] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workersData, deptsData] = await Promise.all([
        hrDB.getWorkers(),
        hrDB.getDepartments(),
      ]);

      if (Array.isArray(workersData)) setWorkers(workersData);
      if (Array.isArray(deptsData) && deptsData.length > 0) {
        setDepartments(deptsData);
      } else {
        setDepartments(DEFAULT_DEPARTMENTS);
      }
    } catch (error) {
      console.error("Error fetching HR data:", error);
      setDepartments(DEFAULT_DEPARTMENTS);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setForm((prev: any) => ({ ...prev, photo_url: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    const nextCode = `EMP-${String(workers.length + 1).padStart(3, "0")}`;
    setEditing(null);
    setForm({
      worker_code: nextCode,
      status: "Active",
      employment_type: "Permanent",
      department_id: departments[0]?.id || "dept-tech",
      gender: "Male",
      base_salary: 12000,
    });
    setOpen(true);
  };

  const handleOpenEdit = (w: any) => {
    setEditing(w);
    setForm({
      ...w,
      department_id: w.department_id || departments.find((d) => d.name === w.departmentName)?.id || departments[0]?.id || "dept-tech",
      status: w.status || "Active",
      employment_type: w.employment_type || w.employmentType || "Permanent",
      base_salary: w.base_salary || w.baseSalary || 0,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name?.trim()) {
      toast({ title: "Validation Error", description: "Full name is required.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const selectedDept = departments.find((d) => d.id === form.department_id) || departments[0];

      const payload = {
        id: editing?.id || uuidv4(),
        worker_code: form.worker_code || `EMP-${Date.now().toString().slice(-4)}`,
        full_name: form.full_name,
        phone: form.phone || "",
        email: form.email || "",
        position: form.position || "Staff",
        department_id: selectedDept.id,
        departmentName: selectedDept.name,
        photo_url: form.photo_url || "",
        status: form.status || "Active",

        // Comprehensive Dossier Details
        gender: form.gender || "Male",
        date_of_birth: form.date_of_birth || "",
        national_id: form.national_id || "",
        tin: form.tin || "",
        address_region: form.address_region || "Addis Ababa",
        address_zone: form.address_zone || "",
        address_woreda: form.address_woreda || "",
        address_kebele: form.address_kebele || "",
        house_no: form.house_no || "",
        emergency_contact_name: form.emergency_contact_name || "",
        emergency_contact_phone: form.emergency_contact_phone || "",
        employment_type: form.employment_type || "Permanent",
        date_of_joining: form.date_of_joining || new Date().toISOString().slice(0, 10),
        base_salary: Number(form.base_salary || 0),
        bank_name: form.bank_name || "Commercial Bank of Ethiopia (CBE)",
        bank_account_no: form.bank_account_no || "",
      };

      const success = await hrDB.saveWorker(payload);

      if (!success) throw new Error("Could not save worker to database");

      toast({ title: "Success", description: `Worker ${payload.full_name} registered successfully.` });
      setOpen(false);
      setEditing(null);
      setForm({});
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save worker.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name} from the workforce registry?`)) return;
    try {
      const success = await hrDB.deleteWorker(id);
      if (success) {
        toast({ title: "Success", description: "Worker record deleted successfully." });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete worker.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete worker.", variant: "destructive" });
    }
  };

  const filtered = workers.filter((w) => {
    const matchesSearch =
      (w.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (w.worker_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (w.phone || "").includes(search) ||
      (w.position || "").toLowerCase().includes(search.toLowerCase());

    const matchesDept =
      selectedDeptFilter === "all" ||
      w.department_id === selectedDeptFilter ||
      w.departmentName === selectedDeptFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading">Workforce Registry & Employee Dossiers</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">{workers.length} Total Staff</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete digital employee dossiers with photo profiles, address records, compensation, and departmental structures.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
          <Plus className="h-4 w-4" /> Register New Employee
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by full name, employee code, phone, or position..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-64">
          <Select value={selectedDeptFilter} onValueChange={setSelectedDeptFilter}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments ({workers.length})</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Workers Directory Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 text-xs">
              <TableHead className="w-16">Photo</TableHead>
              <TableHead>Worker Code</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position / Role</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead className="text-right">Base Salary</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium text-sm">No employee records found.</p>
                    <p className="text-xs">Click "Register New Employee" to add staff to the registry.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((w) => (
                <TableRow
                  key={w.id}
                  className="hover:bg-muted/60 transition-colors text-xs cursor-pointer group"
                  onClick={() => {
                    navigate(`/hr/workers/${w.id}`);
                  }}
                >
                  {/* Photo Avatar */}
                  <TableCell>
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                      {w.photo_url || w.photoUrl ? (
                        <img src={w.photo_url || w.photoUrl} alt={w.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <Users className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="font-mono font-bold text-primary">{w.worker_code}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <div className="group-hover:text-primary transition-colors">{w.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{w.gender || "Staff"} • {w.employment_type || w.employmentType || "Permanent"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[11px]">
                      {w.departmentName || departments.find((d) => d.id === w.department_id)?.name || "General"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{w.position || "Technician"}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{w.phone || "—"}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(w.base_salary || w.baseSalary || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === "Active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {w.status || "Active"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      title="Generate Official ID Card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIdCardWorker(w);
                        setIdCardOpen(true);
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="View Full Dossier"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/hr/workers/${w.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      title="Edit Profile"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(w);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      title="Delete Record"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(w.id, w.full_name);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Registration & Edit Employee Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              {editing ? `Edit Employee Dossier: ${editing.full_name}` : "Register New Workforce Member"}
            </DialogTitle>
            <DialogDescription>
              Provide comprehensive personnel, address, compensation, and departmental information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 1. Photo & Basic Identifiers */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border bg-muted/20">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/30 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Worker Code / ID *</label>
                  <Input
                    value={form.worker_code || ""}
                    onChange={(e) => setForm({ ...form, worker_code: e.target.value })}
                    placeholder="EMP-001"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Employment Status *</label>
                  <Select value={form.status || "Active"} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active Duty</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Inactive">Terminated / Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 2. Personal Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1">
                <Users className="h-3.5 w-3.5" /> 1. Personal & Identity Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium">Full Name (First, Middle, Last) *</label>
                  <Input
                    value={form.full_name || ""}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Abebe Bikila Tadesse"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Gender</label>
                  <Select value={form.gender || "Male"} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={form.date_of_birth || ""}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium">National / Kebele ID / Passport</label>
                  <Input
                    value={form.national_id || ""}
                    onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                    placeholder="e.g. ETH-984210"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Contact & Physical Address */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1">
                <MapPin className="h-3.5 w-3.5" /> 2. Contact & Physical Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Primary Phone Number *</label>
                  <Input
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+251 91 123 4567"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="employee@solarflow.et"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Region</label>
                  <Select value={form.address_region || "Addis Ababa"} onValueChange={(v) => setForm({ ...form, address_region: v })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Addis Ababa">Addis Ababa</SelectItem>
                      <SelectItem value="Amhara">Amhara</SelectItem>
                      <SelectItem value="Oromia">Oromia</SelectItem>
                      <SelectItem value="Tigray">Tigray</SelectItem>
                      <SelectItem value="Sidama">Sidama</SelectItem>
                      <SelectItem value="South Ethiopia">South Ethiopia</SelectItem>
                      <SelectItem value="Central Ethiopia">Central Ethiopia</SelectItem>
                      <SelectItem value="Afar">Afar</SelectItem>
                      <SelectItem value="Somali">Somali</SelectItem>
                      <SelectItem value="Benishangul-Gumuz">Benishangul-Gumuz</SelectItem>
                      <SelectItem value="Gambella">Gambella</SelectItem>
                      <SelectItem value="Dire Dawa">Dire Dawa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Zone / Sub-City</label>
                  <Input
                    value={form.address_zone || ""}
                    onChange={(e) => setForm({ ...form, address_zone: e.target.value })}
                    placeholder="e.g. Bole / North Gondar"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Woreda</label>
                  <Input
                    value={form.address_woreda || ""}
                    onChange={(e) => setForm({ ...form, address_woreda: e.target.value })}
                    placeholder="e.g. Woreda 03"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Kebele / House No.</label>
                  <Input
                    value={form.address_kebele || ""}
                    onChange={(e) => setForm({ ...form, address_kebele: e.target.value })}
                    placeholder="Kebele 08, House 142"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Emergency Contact Name</label>
                  <Input
                    value={form.emergency_contact_name || ""}
                    onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                    placeholder="Contact full name"
                    className="text-xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium">Emergency Contact Phone</label>
                  <Input
                    value={form.emergency_contact_phone || ""}
                    onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                    placeholder="+251 92 000 0000"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4. Department & Compensation */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1">
                <Building2 className="h-3.5 w-3.5" /> 3. Department, Position & Payroll Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-primary">Assigned Department *</label>
                  <Select
                    value={form.department_id || departments[0]?.id || "dept-tech"}
                    onValueChange={(v) => setForm({ ...form, department_id: v })}
                  >
                    <SelectTrigger className="text-xs font-medium border-primary/40 focus:ring-primary">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Job Title / Position *</label>
                  <Input
                    value={form.position || ""}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="e.g. Lead Solar Technician"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Employment Contract</label>
                  <Select value={form.employment_type || "Permanent"} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Permanent">Permanent (Full-Time)</SelectItem>
                      <SelectItem value="Contract">Fixed-Term Contract</SelectItem>
                      <SelectItem value="Probation">Probationary</SelectItem>
                      <SelectItem value="Temporary">Temporary / Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Salary (ETB) *</label>
                  <Input
                    type="number"
                    value={form.base_salary || 0}
                    onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Bank Name</label>
                  <Select value={form.bank_name || "Commercial Bank of Ethiopia (CBE)"} onValueChange={(v) => setForm({ ...form, bank_name: v })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</SelectItem>
                      <SelectItem value="Telebirr Merchant / Individual">Telebirr Wallet</SelectItem>
                      <SelectItem value="Awash Bank">Awash Bank</SelectItem>
                      <SelectItem value="Dashen Bank">Dashen Bank</SelectItem>
                      <SelectItem value="Bank of Abyssinia">Bank of Abyssinia</SelectItem>
                      <SelectItem value="Nib International Bank">Nib International Bank</SelectItem>
                      <SelectItem value="Cooperative Bank of Oromia">Cooperative Bank of Oromia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Bank Account / Wallet Number</label>
                  <Input
                    value={form.bank_account_no || ""}
                    onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                    placeholder="1000012345678"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
              {loading ? "Saving to Registry..." : editing ? "Update Employee Dossier" : "Register Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Digital Dossier Modal */}
      {viewingWorker && (
        <Dialog open={dossierOpen} onOpenChange={setDossierOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Employee Master Dossier
              </DialogTitle>
              <DialogDescription>Official employee digital personnel file.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Header profile card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {viewingWorker.photo_url || viewingWorker.photoUrl ? (
                    <img src={viewingWorker.photo_url || viewingWorker.photoUrl} alt={viewingWorker.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold font-heading">{viewingWorker.full_name}</h2>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {viewingWorker.status || "Active"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {viewingWorker.position} • {viewingWorker.departmentName || "General"}
                  </p>
                  <p className="text-xs font-mono font-semibold text-primary mt-1">{viewingWorker.worker_code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">National / Kebele ID:</span>
                  <p className="font-semibold font-mono">{viewingWorker.nationalId || viewingWorker.national_id || "Not registered"}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">TIN Number:</span>
                  <p className="font-semibold font-mono">{viewingWorker.tin || "Not registered"}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">Contact Phone:</span>
                  <p className="font-semibold font-mono">{viewingWorker.phone || "—"}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">Email Address:</span>
                  <p className="font-semibold">{viewingWorker.email || "—"}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">Physical Address:</span>
                  <p className="font-semibold">
                    {[viewingWorker.addressRegion || viewingWorker.address_region, viewingWorker.addressZone || viewingWorker.address_zone, viewingWorker.addressWoreda || viewingWorker.address_woreda, viewingWorker.addressKebele || viewingWorker.address_kebele].filter(Boolean).join(", ") || "Addis Ababa"}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">Emergency Contact:</span>
                  <p className="font-semibold">
                    {viewingWorker.emergencyContactName || viewingWorker.emergency_contact_name || "—"} ({viewingWorker.emergencyContactPhone || viewingWorker.emergency_contact_phone || "—"})
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">Monthly Base Salary:</span>
                  <p className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(viewingWorker.baseSalary || viewingWorker.base_salary || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-muted-foreground">Bank Account:</span>
                  <p className="font-semibold font-mono">
                    {viewingWorker.bankName || viewingWorker.bank_name || "CBE"}: {viewingWorker.bankAccountNo || viewingWorker.bank_account_no || "—"}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between gap-2">
              <Button
                onClick={() => {
                  setIdCardWorker(viewingWorker);
                  setIdCardOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CreditCard className="h-4 w-4" /> Generate Official ID Card
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDossierOpen(false)}>
                  Close Dossier
                </Button>
                <Button
                  onClick={() => {
                    setDossierOpen(false);
                    handleOpenEdit(viewingWorker);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Edit Dossier
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Official Employee ID Card Modal (Option B Design) */}
      <EmployeeIdCardModal
        open={idCardOpen}
        onOpenChange={setIdCardOpen}
        worker={idCardWorker}
      />
    </div>
  );
}
