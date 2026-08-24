import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { hrDB, DEFAULT_DEPARTMENTS } from "@/lib/db-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Printer, CreditCard, User, Building2, MapPin,
  Phone, Mail, ShieldCheck, DollarSign, Calendar, FileText,
  Briefcase, Edit, Download, CheckCircle2
} from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { format } from "date-fns";
import { toast } from "sonner";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<any | null>(null);
  const [departments, setDepartments] = useState<any[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [frontQrUrl, setFrontQrUrl] = useState<string>("");
  const [backQrUrl, setBackQrUrl] = useState<string>("");
  const [printMode, setPrintMode] = useState<"dossier" | "idcard">("dossier");

  useEffect(() => {
    loadWorker();
  }, [id]);

  const loadWorker = async () => {
    setLoading(true);
    try {
      const [workersList, deptsList] = await Promise.all([
        hrDB.getWorkers(),
        hrDB.getDepartments(),
      ]);

      if (Array.isArray(deptsList) && deptsList.length > 0) {
        setDepartments(deptsList);
      }

      if (Array.isArray(workersList)) {
        const found = workersList.find((w: any) => String(w.id) === String(id) || String(w.worker_code) === String(id));
        if (found) {
          setWorker(found);
          generateQRCodes(found);
        } else {
          toast.error("Employee not found in registry.");
        }
      }
    } catch (e) {
      console.error("Error loading worker profile:", e);
      toast.error("Failed to load worker profile.");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodes = (w: any) => {
    const workerCode = w.worker_code || w.workerCode || "EMP-001";
    const fullName = w.full_name || w.fullName || "Staff Member";
    const dept = w.departmentName || w.department || "Technical";
    const nationalId = w.national_id || w.nationalId || "ETH-000000";

    // Front QR: Staff Verification Payload (placed on front side under the metadata section)
    const staffPayload = JSON.stringify({
      company: "MESERET MARE",
      code: workerCode,
      name: fullName,
      dept,
      fcn: nationalId,
    });

    QRCode.toDataURL(staffPayload, {
      width: 260,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setFrontQrUrl)
      .catch(console.error);

    // Back QR: Official Website Link (https://meseretmare.com)
    QRCode.toDataURL("https://meseretmare.com", {
      width: 320,
      margin: 1,
      color: { dark: "#064e3b", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setBackQrUrl)
      .catch(console.error);
  };

  const handlePrintDossier = () => {
    setPrintMode("dossier");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintIdCard = () => {
    setPrintMode("idcard");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading employee dossier...</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold">Employee Record Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested employee does not exist or has been removed.</p>
        <Button onClick={() => navigate("/hr/workers")} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Return to Workforce Registry
        </Button>
      </div>
    );
  }

  const workerCode = worker.worker_code || worker.workerCode || "EMP-042";
  const fullName = worker.full_name || worker.fullName || "Staff Member";
  const position = worker.position || "Solar Technician";
  const departmentName = worker.departmentName || departments.find((d) => d.id === worker.department_id)?.name || "Technical & Engineering";
  const phone = worker.phone || "—";
  const email = worker.email || "—";
  const gender = worker.gender || "Staff";
  const employmentType = worker.employment_type || worker.employmentType || "Permanent";
  const baseSalary = Number(worker.base_salary || worker.baseSalary || 0);
  const nationalId = worker.national_id || worker.nationalId || "ETH-984210";
  const tin = worker.tin || "100203040";
  const photo = worker.photo_url || worker.photoUrl || "";
  const bankName = worker.bank_name || worker.bankName || "Commercial Bank of Ethiopia (CBE)";
  const bankAccount = worker.bank_account_no || worker.bankAccountNo || "—";
  const region = worker.address_region || worker.addressRegion || "Addis Ababa";
  const zone = worker.address_zone || worker.addressZone || "Gulele Sub-City";
  const woreda = worker.address_woreda || worker.addressWoreda || "Addisu Gebeya";
  const kebele = worker.address_kebele || worker.addressKebele || "Kebele 02";
  const emergencyName = worker.emergency_contact_name || worker.emergencyContactName || "—";
  const emergencyPhone = worker.emergency_contact_phone || worker.emergencyContactPhone || "—";
  const joinDate = worker.date_of_joining || worker.dateOfJoining || new Date().toISOString().slice(0, 10);
  const issueDateFormatted = format(new Date(joinDate || new Date()), "dd MMM yyyy").toUpperCase();
  const expiryDate = new Date(joinDate || new Date());
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);
  const expiryDateFormatted = format(expiryDate, "dd MMM yyyy").toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Top Action Toolbar (Hidden during print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/hr/workers")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Registry
          </Button>
          <div className="h-5 w-px bg-border" />
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
              {fullName}
              <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                {worker.status || "Active"}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              {workerCode} • {position} • {departmentName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handlePrintDossier} className="gap-1.5 shadow-sm">
            <Printer className="h-4 w-4 text-primary" /> Print Full Dossier (A4)
          </Button>
          <Button size="sm" onClick={handlePrintIdCard} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow">
            <CreditCard className="h-4 w-4" /> Print ID Badge (CR80)
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL A4 EMPLOYEE MASTER DOSSIER (Visible on screen and during Dossier Print) */}
      {/* ========================================================================= */}
      <div className={printMode === "idcard" ? "print:hidden" : "block"}>
        <div className="bg-card text-card-foreground rounded-2xl border shadow-sm p-6 sm:p-8 space-y-8 print:p-0 print:border-0 print:shadow-none">
          {/* Header & Logo Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b pb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white p-2 border shadow-sm flex items-center justify-center shrink-0">
                <img src="/uploads/Untitled_design__4_-removebg-preview.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground font-heading">MESERET MARE SOLAR</h2>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600">Human Resources & Personnel Directorate</h3>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">CONFIDENTIAL EMPLOYEE MASTER DOSSIER</p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5 bg-muted/40 p-3 rounded-xl border sm:bg-transparent sm:p-0 sm:border-0">
              <div className="font-bold text-foreground">STAFF ID: <span className="font-mono text-primary font-black">{workerCode}</span></div>
              <div className="text-muted-foreground">Generated: {format(new Date(), "dd MMMM yyyy")}</div>
              <div className="text-muted-foreground">National Tax Ref: <span className="font-mono font-semibold">{tin}</span></div>
            </div>
          </div>

          {/* Core Profile Banner with Photo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border">
            {/* Photo Avatar */}
            <div className="flex flex-col items-center justify-center">
              <div className="h-36 w-36 rounded-2xl overflow-hidden border-4 border-amber-400 bg-white shadow-md p-0.5 flex items-center justify-center">
                {photo ? (
                  <img src={photo} alt={fullName} className="h-full w-full object-cover rounded-xl" />
                ) : (
                  <User className="h-16 w-16 text-slate-400" />
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2">
                Official Portrait
              </span>
            </div>

            {/* Core Identification Data */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Full Legal Name</span>
                <p className="text-sm font-bold text-foreground">{fullName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Job Designation</span>
                <p className="text-sm font-bold text-primary">{position}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Assigned Department</span>
                <p className="text-sm font-bold text-foreground">{departmentName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Employment Status</span>
                <p className="font-bold text-emerald-600">{employmentType} ({worker.status || "Active"})</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Gender / Demographics</span>
                <p className="font-semibold text-foreground">{gender}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Date of Appointment</span>
                <p className="font-semibold font-mono text-foreground">{format(new Date(joinDate || new Date()), "dd MMMM yyyy")}</p>
              </div>
            </div>
          </div>

          {/* Section 1: Detailed Residence & Emergency Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 border-b pb-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" /> 1. Contact & Regional Residence Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-muted/20 p-4 rounded-xl border">
              <div>
                <span className="text-muted-foreground font-medium">Primary Mobile Phone</span>
                <p className="font-mono font-bold text-foreground mt-0.5">{phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Official Corporate Email</span>
                <p className="font-semibold text-foreground mt-0.5">{email}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Regional State</span>
                <p className="font-semibold text-foreground mt-0.5">{region}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Zone / Sub-City</span>
                <p className="font-semibold text-foreground mt-0.5">{zone}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Woreda / District</span>
                <p className="font-semibold text-foreground mt-0.5">{woreda}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Kebele / House No.</span>
                <p className="font-semibold text-foreground mt-0.5">{kebele}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Emergency Contact Person</span>
                <p className="font-bold text-foreground mt-0.5">{emergencyName}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground font-medium">Emergency Contact Phone</span>
                <p className="font-mono font-bold text-foreground mt-0.5">{emergencyPhone}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Compensation & Banking */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 border-b pb-1.5">
              <DollarSign className="h-4 w-4 text-emerald-600" /> 2. Payroll Compensation & Banking Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-muted/20 p-4 rounded-xl border">
              <div>
                <span className="text-muted-foreground font-medium">Salary</span>
                <p className="text-base font-black font-mono text-emerald-600 mt-0.5">{formatCurrency(baseSalary)}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Designated Bank</span>
                <p className="font-bold text-foreground mt-0.5">{bankName}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Account Number</span>
                <p className="font-mono font-bold text-foreground mt-0.5">{bankAccount}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">National / Kebele ID</span>
                <p className="font-mono font-bold text-foreground mt-0.5">{nationalId}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Official Sign-Off & Verification Stamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Employee Acknowledgement</span>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                I hereby declare that the information registered in this employee master file is true, complete, and accurate.
              </p>
              <div className="pt-6 border-b border-dashed w-48" />
              <span className="text-[10px] text-muted-foreground block">Signature & Date</span>
            </div>

            <div className="space-y-2 sm:text-right">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Authorized HR Approval</span>
              <div className="sm:ml-auto w-48 space-y-1">
                <div className="h-8 flex items-center justify-end">
                  <span className="font-serif italic font-bold text-base text-primary">Meseret M.</span>
                </div>
                <div className="border-b border-slate-300 dark:border-slate-700" />
                <span className="text-[10px] font-semibold text-muted-foreground block">
                  Director of Human Resources
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL CR80 DUAL-SIDED ID BADGE (Pixel-Perfect, Zero Gap, Standard Ratio) */}
      {/* ========================================================================= */}
      <div className={printMode === "dossier" ? "print:hidden" : "block"}>
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h3 className="text-base font-bold font-heading flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" /> Official Dual-Sided ID Badge (CR80 Standard)
              </h3>
              <p className="text-xs text-muted-foreground">
                High-density 300 DPI layout with zero empty gaps. Fits standard PVC card printers (54mm × 86mm).
              </p>
            </div>
            <Button onClick={handlePrintIdCard} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow">
              <Printer className="h-4 w-4" /> Print Badge Only
            </Button>
          </div>

          {/* ID Cards Layout Container */}
          <div className="flex flex-wrap items-center justify-center gap-8 bg-slate-200/60 dark:bg-slate-950/70 p-6 rounded-2xl border print:p-0 print:border-0 print:bg-white print:gap-4">
            
            {/* --------------------------------------------------------------------- */}
            {/* FRONT SIDE BADGE (Tight, Elegant, Zero Empty Space) */}
            {/* --------------------------------------------------------------------- */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">
                Front Side
              </span>

              {/* Physical CR80 Dimensions: 300px x 475px */}
              <div
                className="w-[300px] h-[475px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* 1. Top White Header Banner with Logo & Expanded Title */}
                <div className="pt-2 px-3 pb-1 bg-white flex items-center justify-start gap-2 z-20 border-b border-slate-100">
                  <div className="h-10 w-10 shrink-0 bg-white flex items-center justify-center">
                    <img
                      src="/uploads/Untitled_design__4_-removebg-preview.png"
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <h2 className="text-[12.5px] font-black leading-tight tracking-tight text-slate-950 font-heading">
                      MESERET MARE
                    </h2>
                    <h3 className="text-[9px] font-extrabold leading-tight text-emerald-700 tracking-tight">
                      Solar products import and installations
                    </h3>
                  </div>
                </div>

                {/* 2. Curved Emerald-to-Gold Wave Banner & Framed Photo (130px) */}
                <div className="relative h-[130px] flex items-center justify-center">
                  {/* Wave Vector SVG */}
                  <svg
                    viewBox="0 0 300 130"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="pFrontWave" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="60%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                      <linearGradient id="pFrontGold" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,0 L 300,0 L 300,55 Q 215,120 150,85 Q 80,48 0,100 Z" fill="url(#pFrontWave)" />
                    <path d="M 0,100 Q 80,48 150,85 Q 215,120 300,55 L 300,61 Q 215,126 150,91 Q 80,54 0,106 Z" fill="url(#pFrontGold)" />
                  </svg>

                  {/* Centered Employee Portrait */}
                  <div className="relative z-10 mt-1">
                    <div className="h-[98px] w-[98px] rounded-[18px] overflow-hidden border-[3px] border-amber-400 bg-white shadow-xl p-0.5 flex items-center justify-center">
                      {photo ? (
                        <img src={photo} alt={fullName} className="h-full w-full object-cover rounded-[14px]" />
                      ) : (
                        <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                          <User className="h-10 w-10 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Employee Name & Designation (Larger Typography) */}
                <div className="px-3 text-center flex flex-col items-center justify-center z-10 pt-1">
                  <h1 className="text-[16px] font-black text-slate-950 tracking-tight uppercase leading-snug break-words max-w-[270px]">
                    {fullName}
                  </h1>
                  <p className="text-[11.5px] font-extrabold text-blue-950 uppercase tracking-wider mt-0.5">
                    {position}
                  </p>
                  <div className="mt-1">
                    <span className="px-3.5 py-0.5 bg-emerald-700 text-white rounded-full text-[9.5px] font-black uppercase tracking-wider shadow-sm inline-block">
                      {departmentName}
                    </span>
                  </div>
                </div>

                {/* 4. Structured Employee Metadata Box (Includes FCN, Staff ID, Phone) */}
                <div className="mx-3.5 mt-1.5 mb-1 bg-slate-50 border border-slate-200/90 rounded-xl py-1.5 px-3.5 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500 text-[10.5px]">STAFF ID:</span>
                    <span className="font-mono font-black text-slate-950 text-[11.5px]">{workerCode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500 text-[10.5px]">FCN / NATIONAL ID:</span>
                    <span className="font-mono font-black text-slate-950 text-[11.5px]">{nationalId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500 text-[10.5px]">PHONE:</span>
                    <span className="font-mono font-black text-slate-950 text-[11.5px]">{phone}</span>
                  </div>
                </div>

                {/* 5. Centered Staff Identity QR Code (Right under metadata box) */}
                <div className="flex flex-col items-center justify-center my-auto z-10">
                  {frontQrUrl && (
                    <div className="h-[68px] w-[68px] bg-white p-1 rounded-xl border-2 border-emerald-600/40 shadow-sm flex items-center justify-center">
                      <img src={frontQrUrl} alt="Staff QR" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700 mt-1">
                    STAFF IDENTITY QR
                  </span>
                </div>

                {/* 6. Bottom Solid Navy Accent Bar */}
                <div className="mt-auto bg-[#0a1931] h-[28px] px-3.5 flex items-center justify-between text-white z-20">
                  <span className="text-[8px] font-extrabold tracking-widest uppercase text-emerald-400">
                    OFFICIAL PERSONNEL IDENTIFICATION
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-400 font-bold">
                    MESERET MARE PLC
                  </span>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* BACK SIDE BADGE (Bigger Logo, meseretmare.com QR, Updated Location) */}
            {/* --------------------------------------------------------------------- */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">
                Back Side
              </span>

              {/* Physical CR80 Dimensions: 300px x 475px */}
              <div
                className="w-[300px] h-[475px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* 1. Top Curved Emerald-Gold Wave Header with BIGGER Logo (96px) */}
                <div className="relative h-[96px] flex items-center justify-center">
                  <svg
                    viewBox="0 0 300 96"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="pBackWave" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="60%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,0 L 300,0 L 300,56 Q 150,94 0,56 Z" fill="url(#pBackWave)" />
                    <path d="M 0,56 Q 150,94 300,56 L 300,61 Q 150,99 0,61 Z" fill="#fbbf24" />
                  </svg>

                  {/* Bigger Circular White Logo Emblem */}
                  <div className="relative z-10 h-16 w-16 rounded-full bg-white p-1.5 shadow-xl flex items-center justify-center border-[2.5px] border-amber-300 mt-1">
                    <img
                      src="/uploads/Untitled_design__4_-removebg-preview.png"
                      alt="Logo Emblem"
                      className="h-12 w-12 object-contain"
                    />
                  </div>
                </div>

                {/* 2. Official Website QR Code & Validity (Bigger QR & Text) */}
                <div className="px-4 text-center flex flex-col items-center">
                  {backQrUrl && (
                    <div className="h-[86px] w-[86px] p-1 bg-white border-2 border-emerald-600 rounded-xl shadow-md flex items-center justify-center">
                      <img src={backQrUrl} alt="Website QR" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-800 mt-1">
                    SCAN TO VISIT MESERETMARE.COM
                  </h4>

                  <div className="grid grid-cols-2 gap-1.5 w-full mt-1 py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[9px]">
                    <div>
                      <span className="text-slate-500 block font-bold">ISSUE DATE:</span>
                      <span className="font-mono font-black text-slate-900">{issueDateFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-bold">EXPIRY DATE:</span>
                      <span className="font-mono font-black text-emerald-700">{expiryDateFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Company Contact Block (Updated Location: Gulele Sub-City, Addisu Gebeya) */}
                <div className="px-3.5 py-1.5 text-center text-[10px] text-slate-800 space-y-1">
                  <div>
                    <span className="font-black text-slate-950 block uppercase text-[10px] tracking-wide">
                      MESERET MARE SOLAR PLC & FZ TRADING
                    </span>
                    <span className="font-bold text-slate-700 block text-[9.5px]">
                      Addis Ababa, Gulele Sub-City, Addisu Gebeya
                    </span>
                  </div>
                  <div className="text-[9.5px]">
                    <span className="font-bold text-slate-950">HOTLINE: </span>
                    <span className="font-mono font-bold text-slate-900">+251 11 662 0000 / +251 91 123 4567</span>
                  </div>
                  <div className="text-[9.5px]">
                    <span className="font-bold text-slate-950">WEB: </span>
                    <span className="font-bold text-emerald-700">www.meseretmare.com</span>
                    <span className="mx-1 text-slate-300">•</span>
                    <span className="font-bold text-slate-950">EMAIL: </span>
                    <span className="font-bold text-emerald-700">info@meseretmare.com</span>
                  </div>
                </div>

                {/* 4. Official Notice & Signatory */}
                <div className="mt-auto px-4 pb-2 pt-1 border-t border-slate-100 bg-slate-50 text-center">
                  <p className="text-[8px] text-slate-600 leading-tight font-medium">
                    Return Notice: If found, please return to any Meseret Mare Solar office or contact the hotline.
                  </p>
                  
                  <div className="mt-1 flex items-center justify-between pt-0.5 border-t border-dashed border-slate-300">
                    <span className="text-[8px] font-mono font-bold text-slate-500">{workerCode}</span>
                    <div className="text-right">
                      <div className="font-serif italic text-[11px] font-bold text-blue-950 leading-none">M. Mare</div>
                      <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-slate-600 block">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
