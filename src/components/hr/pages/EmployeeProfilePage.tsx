import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { hrDB, DEFAULT_DEPARTMENTS, getDepartmentBilingual } from "@/lib/db-service";
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
    fetchWorker();
  }, [id]);

  const fetchWorker = async () => {
    try {
      setLoading(true);
      const [workersData, deptsData] = await Promise.all([
        hrDB.getWorkers(),
        hrDB.getDepartments(),
      ]);
      setDepartments(deptsData);
      if (id) {
        const found = workersData.find((w: any) => String(w.id) === String(id) || String(w.worker_code) === String(id));
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
    const fullNameEnglish = w.full_name || w.fullName || "Staff Member";
    const fullNameAmharic = w.full_name_amharic || w.fullNameAmharic || "";
    const deptInfo = getDepartmentBilingual(w.departmentName || w.department);
    const nationalId = w.national_id || w.nationalId || "ETH-000000";

    // Front QR: Staff Verification Payload (placed on front side under the metadata section)
    const staffPayload = JSON.stringify({
      company: "MESERET MARE SOLAR IMPORT AND INSTALLATION",
      code: workerCode,
      name: fullNameEnglish,
      nameAm: fullNameAmharic || undefined,
      dept: deptInfo.english,
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
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading employee record...</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold">Employee Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested workforce member dossier does not exist.</p>
        <Button onClick={() => navigate("/hr/workers")}>Return to HR Hub</Button>
      </div>
    );
  }

  const workerCode = worker.worker_code || worker.workerCode || "EMP-042";
  const fullNameEnglish = worker.full_name || worker.fullName || "Staff Member";
  const fullNameAmharic = worker.full_name_amharic || worker.fullNameAmharic || "";
  const positionEnglish = worker.position || "Solar Technician";
  const positionAmharic = worker.position_amharic || worker.positionAmharic || "";
  const deptInfo = getDepartmentBilingual(worker.departmentName || worker.department);
  const departmentName = deptInfo.combined;
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
                Front Side (የፊት ገጽ)
              </span>

              {/* Physical CR80 Dimensions: 300px x 480px */}
              <div
                className="w-[300px] h-[480px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* 1. Top 2-Line Header with Logo */}
                <div className="pt-2 px-3 pb-1.5 bg-white flex items-center justify-start gap-2.5 z-20 border-b border-slate-100">
                  <div className="h-10 w-10 shrink-0 bg-white flex items-center justify-center">
                    <img
                      src="/uploads/Untitled_design__4_-removebg-preview.png"
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h2 className="text-[12px] font-black leading-tight tracking-tight text-slate-950 truncate">
                      መሠረት ማሬ የሶላር ምርቶች አስመጪ እና ገጣሚ
                    </h2>
                    <h3 className="text-[8px] font-extrabold leading-tight text-emerald-700 tracking-tight uppercase truncate mt-0.5">
                      MESERET MARE SOLAR IMPORT AND INSTALLATION
                    </h3>
                  </div>
                </div>

                {/* 2. Wave Graphic & Enlarged Portrait Photo */}
                <div className="relative h-[122px] flex items-center justify-center">
                  <svg
                    viewBox="0 0 300 122"
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
                    <path d="M 0,0 L 300,0 L 300,52 Q 215,115 150,82 Q 80,45 0,95 Z" fill="url(#pFrontWave)" />
                    <path d="M 0,95 Q 80,45 150,82 Q 215,115 300,52 L 300,57 Q 215,120 150,87 Q 80,50 0,100 Z" fill="url(#pFrontGold)" />
                  </svg>

                  {/* Centered Enlarged Employee Portrait */}
                  <div className="relative z-10 mt-1">
                    <div className="h-[98px] w-[98px] rounded-[18px] overflow-hidden border-[3px] border-amber-400 bg-white shadow-xl p-0.5 flex items-center justify-center">
                      {photo ? (
                        <img src={photo} alt={fullNameEnglish} className="h-full w-full object-cover rounded-[15px]" />
                      ) : (
                        <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                          <User className="h-10 w-10 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Employee Bilingual Name & Designation */}
                <div className="px-3 text-center flex flex-col items-center justify-center z-10 pt-0.5">
                  {fullNameAmharic ? (
                    <>
                      <h1 className="text-[16px] font-black text-slate-950 tracking-tight uppercase leading-tight break-words max-w-[280px]">
                        {fullNameAmharic}
                      </h1>
                      <h2 className="text-[9.5px] font-bold text-slate-600 tracking-wider uppercase leading-tight break-words max-w-[280px] mt-0.5">
                        {fullNameEnglish}
                      </h2>
                    </>
                  ) : (
                    <h1 className="text-[15.5px] font-black text-slate-950 tracking-tight uppercase leading-snug break-words max-w-[280px]">
                      {fullNameEnglish}
                    </h1>
                  )}

                  {positionAmharic ? (
                    <div className="mt-0.5 text-center">
                      <p className="text-[11.5px] font-black text-blue-950 uppercase tracking-wide leading-tight">
                        {positionAmharic}
                      </p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
                        {positionEnglish}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider mt-0.5">
                      {positionEnglish}
                    </p>
                  )}

                  <div className="mt-1 flex flex-col items-center">
                    <span className="px-3 py-0.5 bg-emerald-700 text-white rounded-full text-[9px] font-black tracking-wider shadow-sm inline-block max-w-[270px] truncate">
                      {deptInfo.amharic}
                    </span>
                    {deptInfo.english && (
                      <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-800/80 mt-0.5">
                        {deptInfo.english}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Structured Employee Metadata Box */}
                <div className="mx-3 mt-1 mb-0.5 bg-slate-50/90 border border-slate-200/90 rounded-xl py-1 px-3 space-y-0.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">
                      መለያ ቁጥር <span className="text-[8.5px] font-semibold text-slate-400">/ ID:</span>
                    </span>
                    <span className="font-mono font-black text-slate-950 text-[11px]">{workerCode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">
                      ብሔራዊ መታወቂያ (ፋይዳ) <span className="text-[8.5px] font-semibold text-slate-400">/ FCN:</span>
                    </span>
                    <span className="font-mono font-black text-slate-950 text-[11px]">{nationalId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">
                      ስልክ ቁጥር <span className="text-[8.5px] font-semibold text-slate-400">/ Phone:</span>
                    </span>
                    <span className="font-mono font-black text-slate-950 text-[11px]">{phone}</span>
                  </div>
                </div>

                {/* 5. Side-by-Side Signature & QR Code Area */}
                <div className="mx-3 my-0.5 py-0.5 px-1.5 flex items-center justify-between border-t border-slate-100 z-10 gap-1.5">
                  {/* Left: Compact Authorized Signature Section */}
                  <div className="w-[110px] shrink-0 flex flex-col items-center justify-center pr-1 border-r border-slate-200">
                    <div className="h-10 w-full overflow-hidden flex items-center justify-center">
                      <img
                        src="/uploads/logo3.jpg"
                        alt="Authorized Signature"
                        className="h-9 w-auto max-w-[115px] scale-[1.5] object-contain"
                      />
                    </div>
                    <div className="text-center mt-0.5">
                      <span className="block text-[8px] font-black text-slate-800 leading-tight">
                        ህጋዊ ፊርማ
                      </span>
                      <span className="block text-[6.5px] font-bold text-slate-500 uppercase tracking-tight">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>

                  {/* Right: Enlarged Staff Identity QR Code */}
                  <div className="flex-1 flex flex-col items-center justify-center pl-1">
                    {frontQrUrl && (
                      <div className="h-[76px] w-[76px] bg-white p-1 rounded-xl border-2 border-emerald-600 shadow-md flex items-center justify-center">
                        <img src={frontQrUrl} alt="Staff QR" className="h-full w-full object-contain" />
                      </div>
                    )}
                    <div className="text-center mt-0.5">
                      <span className="block text-[7.5px] font-black text-slate-800 leading-tight">
                        የመታወቂያ QR
                      </span>
                      <span className="block text-[6px] font-bold text-slate-500 uppercase tracking-tight">
                        Staff QR
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Bottom Solid Navy Accent Bar */}
                <div className="mt-auto shrink-0 bg-[#0a1931] h-[26px] px-3 flex items-center justify-between text-white z-20">
                  <div className="flex items-center gap-1">
                    <span className="text-[8.5px] font-bold text-emerald-400">ይፋዊ መታወቂያ</span>
                    <span className="text-[7px] font-medium text-slate-300">/ PERSONNEL ID</span>
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-300 tracking-wider">
                    MESERET MARE
                  </span>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* BACK SIDE BADGE */}
            {/* --------------------------------------------------------------------- */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">
                Back Side (የጀርባ ገጽ)
              </span>

              {/* Physical CR80 Dimensions: 300px x 480px */}
              <div
                className="w-[300px] h-[480px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* 1. Top Curved Emerald-Gold Wave Header with Emblem */}
                <div className="relative h-[90px] flex items-center justify-center">
                  <svg
                    viewBox="0 0 300 90"
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
                    <path d="M 0,0 L 300,0 L 300,52 Q 150,90 0,52 Z" fill="url(#pBackWave)" />
                    <path d="M 0,52 Q 150,90 300,52 L 300,57 Q 150,95 0,57 Z" fill="#fbbf24" />
                  </svg>

                  {/* Circular White Logo Emblem */}
                  <div className="relative z-10 h-15 w-15 rounded-full bg-white p-1.5 shadow-xl flex items-center justify-center border-[2.5px] border-amber-300 mt-1">
                    <img
                      src="/uploads/Untitled_design__4_-removebg-preview.png"
                      alt="Logo Emblem"
                      className="h-11 w-11 object-contain"
                    />
                  </div>
                </div>

                {/* 2. Official Website QR Code & Bilingual Validity Dates */}
                <div className="px-4 text-center flex flex-col items-center">
                  {backQrUrl && (
                    <div className="h-[76px] w-[76px] p-1 bg-white border-2 border-emerald-600 rounded-xl shadow-md flex items-center justify-center">
                      <img src={backQrUrl} alt="Website QR" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <h4 className="text-[9.5px] font-black uppercase tracking-wider text-emerald-800 mt-1">
                    SCAN TO VISIT MESERETMARE.COM
                  </h4>

                  <div className="grid grid-cols-2 gap-1.5 w-full mt-1 py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[8.5px]">
                    <div>
                      <span className="text-slate-700 block font-bold text-[9px]">የተሰጠበት ቀን <span className="text-[7.5px] font-normal text-slate-500">/ Issue</span></span>
                      <span className="font-mono font-black text-slate-900">{issueDateFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-700 block font-bold text-[9px]">የሚያበቃበት ቀን <span className="text-[7.5px] font-normal text-slate-500">/ Expiry</span></span>
                      <span className="font-mono font-black text-emerald-700">{expiryDateFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Company Contact Block (No FZ) */}
                <div className="px-3 py-1 text-center text-slate-800 space-y-0.5">
                  <div>
                    <span className="font-black text-slate-950 block text-[10px] tracking-tight">
                      መሠረት ማሬ የሶላር ምርቶች አስመጪ እና ገጣሚ
                    </span>
                    <span className="font-bold text-emerald-800 block text-[8px] uppercase tracking-tight">
                      MESERET MARE SOLAR IMPORT AND INSTALLATION
                    </span>
                    <span className="font-semibold text-slate-600 block text-[8.5px] mt-0.5">
                      አዲስ አበባ ፣ ጉለሌ ክ/ከተማ ፣ አዲሱ ገበያ • Addis Ababa, Gulele
                    </span>
                  </div>
                  <div className="text-[9px]">
                    <span className="font-bold text-slate-950">ስልክ / HOTLINE: </span>
                    <span className="font-mono font-bold text-slate-900">+251 11 662 0000 / +251 91 123 4567</span>
                  </div>
                  <div className="text-[8.5px]">
                    <span className="font-bold text-slate-950">WEB: </span>
                    <span className="font-bold text-emerald-700">www.meseretmare.com</span>
                    <span className="mx-1 text-slate-300">•</span>
                    <span className="font-bold text-slate-950">EMAIL: </span>
                    <span className="font-bold text-emerald-700">info@meseretmare.com</span>
                  </div>
                </div>

                {/* 4. Official Company Stamp */}
                <div className="flex items-center justify-center my-1 z-10">
                  <img
                    src="/uploads/stamp.jpg"
                    alt="Official Company Stamp"
                    className="h-[75px] max-h-[75px] w-auto object-contain drop-shadow-sm mix-blend-multiply opacity-95"
                  />
                </div>

                {/* 5. Bilingual Official Notice & Generic Signatory */}
                <div className="mt-auto px-3.5 pb-2 pt-1 border-t border-slate-100 bg-slate-50 text-center">
                  <p className="text-[7.5px] text-slate-700 leading-tight font-medium">
                    ይህ መታወቂያ የጠፋበት ቢገኝ እባክዎን በቅርብ ወደሚገኘው የመሠረት ማሬ ቢሮ ወይም በስልክ ቁጥራችን ያሳውቁን።
                  </p>
                  <p className="text-[6.5px] text-slate-500 leading-tight mt-0.5">
                    If found, please return to any Meseret Mare Solar office or contact our hotline.
                  </p>

                  <div className="mt-1 flex items-center justify-between pt-0.5 border-t border-dashed border-slate-300">
                    <span className="text-[8px] font-mono font-bold text-slate-500">{workerCode}</span>
                    <div className="text-right">
                      <div className="h-5 flex items-center justify-end">
                        <img
                          src="/uploads/logo3.jpg"
                          alt="Signature"
                          className="h-4 max-h-4 max-w-[80px] object-contain"
                        />
                      </div>
                      <span className="text-[7.5px] font-black text-slate-800 block">
                        ህጋዊ ፊርማ <span className="text-[6.5px] font-medium text-slate-500 uppercase">/ Authorized Signatory</span>
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
