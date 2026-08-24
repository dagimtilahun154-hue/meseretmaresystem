import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, CreditCard, ShieldCheck, User } from "lucide-react";
import { format } from "date-fns";

interface EmployeeIdCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: {
    id: string;
    worker_code?: string;
    workerCode?: string;
    full_name?: string;
    fullName?: string;
    position?: string;
    departmentName?: string;
    department?: string;
    phone?: string;
    email?: string;
    photo_url?: string;
    photoUrl?: string;
    national_id?: string;
    nationalId?: string;
    tin?: string;
    address_region?: string;
    addressRegion?: string;
    address_zone?: string;
    addressZone?: string;
    date_of_joining?: string;
    dateOfJoining?: string;
  } | null;
}

export const EmployeeIdCardModal: React.FC<EmployeeIdCardModalProps> = ({ open, onOpenChange, worker }) => {
  const [frontQrUrl, setFrontQrUrl] = useState<string>("");
  const [backQrUrl, setBackQrUrl] = useState<string>("");
  const [activeSide, setActiveSide] = useState<"both" | "front" | "back">("both");
  const cardPrintRef = useRef<HTMLDivElement>(null);

  const workerCode = worker?.worker_code || worker?.workerCode || "EMP-001";
  const fullName = worker?.full_name || worker?.fullName || "Staff Member";
  const position = worker?.position || "Solar Technician";
  const department = worker?.departmentName || worker?.department || "Technical & Engineering";
  const phone = worker?.phone || "+251 91 123 4567";
  const nationalId = worker?.national_id || worker?.nationalId || "ETH-000000";
  const photo = worker?.photo_url || worker?.photoUrl || "";
  const joinDate = worker?.date_of_joining || worker?.dateOfJoining || new Date().toISOString().slice(0, 10);

  const issueDateFormatted = format(new Date(joinDate || new Date()), "dd MMM yyyy").toUpperCase();
  const expiryDate = new Date(joinDate || new Date());
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);
  const expiryDateFormatted = format(expiryDate, "dd MMM yyyy").toUpperCase();

  const staffPayload = JSON.stringify({
    company: "MESERET MARE",
    code: workerCode,
    name: fullName,
    dept: department,
    fcn: nationalId,
  });

  useEffect(() => {
    if (open && worker) {
      QRCode.toDataURL(staffPayload, {
        width: 260,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then(setFrontQrUrl)
        .catch((e) => console.error("Front QR Error:", e));

      QRCode.toDataURL("https://meseretmare.com", {
        width: 320,
        margin: 1,
        color: { dark: "#064e3b", light: "#ffffff" },
        errorCorrectionLevel: "H",
      })
        .then(setBackQrUrl)
        .catch((e) => console.error("Back QR Error:", e));
    }
  }, [open, worker, staffPayload]);

  const handlePrint = () => {
    window.print();
  };

  if (!worker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto print:p-0 print:border-0 print:max-h-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-heading">
                  Company ID Card Generation
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Official high-resolution staff badge with security QR code.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-center my-1 print:hidden">
          <Tabs value={activeSide} onValueChange={(v: any) => setActiveSide(v)} className="w-auto">
            <TabsList className="grid grid-cols-3 w-[300px]">
              <TabsTrigger value="both" className="text-xs">Both Sides</TabsTrigger>
              <TabsTrigger value="front" className="text-xs">Front Only</TabsTrigger>
              <TabsTrigger value="back" className="text-xs">Back Only</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          ref={cardPrintRef}
          className="id-card-print-area flex flex-wrap items-center justify-center gap-6 p-4 bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl border print:p-0 print:border-0 print:bg-white print:gap-4"
        >
          {(activeSide === "both" || activeSide === "front") && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">
                FRONT SIDE
              </span>
              <div
                className="id-card-front w-[300px] h-[475px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <div className="pt-2 px-3 pb-1 bg-white flex items-center justify-start gap-2 z-20 border-b border-slate-100">
                  <div className="h-10 w-10 shrink-0 bg-white flex items-center justify-center">
                    <img src="/uploads/Untitled_design__4_-removebg-preview.png" alt="Logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-[12.5px] font-black leading-tight tracking-tight text-slate-950 font-heading">MESERET MARE</h2>
                    <h3 className="text-[9px] font-extrabold leading-tight text-emerald-700 tracking-tight">Solar products import and installations</h3>
                  </div>
                </div>
                <div className="relative h-[130px] flex items-center justify-center">
                  <svg viewBox="0 0 300 130" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="mFrontWave" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="60%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                      <linearGradient id="mFrontGold" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,0 L 300,0 L 300,55 Q 215,120 150,85 Q 80,48 0,100 Z" fill="url(#mFrontWave)" />
                    <path d="M 0,100 Q 80,48 150,85 Q 215,120 300,55 L 300,61 Q 215,126 150,91 Q 80,54 0,106 Z" fill="url(#mFrontGold)" />
                  </svg>
                  <div className="relative z-10 mt-1">
                    <div className="h-[98px] w-[98px] rounded-[18px] overflow-hidden border-[3px] border-amber-400 bg-white shadow-xl p-0.5 flex items-center justify-center">
                      {photo ? <img src={photo} alt={fullName} className="h-full w-full object-cover rounded-[14px]" /> : <div className="h-full w-full bg-slate-100 flex items-center justify-center"><User className="h-10 w-10 text-slate-400" /></div>}
                    </div>
                  </div>
                </div>
                <div className="px-3 text-center flex flex-col items-center justify-center z-10 pt-1">
                  <h1 className="text-[16px] font-black text-slate-950 tracking-tight uppercase leading-snug break-words max-w-[270px]">{fullName}</h1>
                  <p className="text-[11.5px] font-extrabold text-blue-950 uppercase tracking-wider mt-0.5">{position}</p>
                  <div className="mt-1">
                    <span className="px-3.5 py-0.5 bg-emerald-700 text-white rounded-full text-[9.5px] font-black uppercase tracking-wider shadow-sm inline-block">{department}</span>
                  </div>
                </div>
                <div className="mx-3.5 mt-1.5 mb-1 bg-slate-50 border border-slate-200/90 rounded-xl py-1.5 px-3.5 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center"><span className="font-bold text-slate-500 text-[10.5px]">STAFF ID:</span><span className="font-mono font-black text-slate-950 text-[11.5px]">{workerCode}</span></div>
                  <div className="flex justify-between items-center"><span className="font-bold text-slate-500 text-[10.5px]">FCN / NATIONAL ID:</span><span className="font-mono font-black text-slate-950 text-[11.5px]">{nationalId}</span></div>
                  <div className="flex justify-between items-center"><span className="font-bold text-slate-500 text-[10.5px]">PHONE:</span><span className="font-mono font-black text-slate-950 text-[11.5px]">{phone}</span></div>
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
          )}
          {(activeSide === "both" || activeSide === "back") && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">BACK SIDE</span>
              <div className="id-card-back w-[300px] h-[475px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="relative h-[96px] flex items-center justify-center">
                  <svg viewBox="0 0 300 96" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="mBackWave" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="60%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,0 L 300,0 L 300,56 Q 150,94 0,56 Z" fill="url(#mBackWave)" />
                    <path d="M 0,56 Q 150,94 300,56 L 300,61 Q 150,99 0,61 Z" fill="#fbbf24" />
                  </svg>
                  <div className="relative z-10 h-16 w-16 rounded-full bg-white p-1.5 shadow-xl flex items-center justify-center border-[2.5px] border-amber-300 mt-1">
                    <img src="/uploads/Untitled_design__4_-removebg-preview.png" alt="Logo Emblem" className="h-12 w-12 object-contain" />
                  </div>
                </div>
                <div className="px-4 text-center flex flex-col items-center">
                  {backQrUrl && <div className="h-[86px] w-[86px] p-1 bg-white border-2 border-emerald-600 rounded-xl shadow-md flex items-center justify-center"><img src={backQrUrl} alt="Website QR" className="h-full w-full object-contain" /></div>}
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-800 mt-1">SCAN TO VISIT MESERETMARE.COM</h4>
                  <div className="grid grid-cols-2 gap-1.5 w-full mt-1 py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[9px]">
                    <div><span className="text-slate-500 block font-bold">ISSUE DATE:</span><span className="font-mono font-black text-slate-900">{issueDateFormatted}</span></div>
                    <div><span className="text-slate-500 block font-bold">EXPIRY DATE:</span><span className="font-mono font-black text-emerald-700">{expiryDateFormatted}</span></div>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 text-center text-[10px] text-slate-800 space-y-1">
                  <div>
                    <span className="font-black text-slate-950 block uppercase text-[10px] tracking-wide">MESERET MARE SOLAR PLC & FZ TRADING</span>
                    <span className="font-bold text-slate-700 block text-[9.5px]">Addis Ababa, Gulele Sub-City, Addisu Gebeya</span>
                  </div>
                  <div className="text-[9.5px]"><span className="font-bold text-slate-950">HOTLINE: </span><span className="font-mono font-bold text-slate-900">+251 11 662 0000 / +251 91 123 4567</span></div>
                  <div className="text-[9.5px]"><span className="font-bold text-slate-950">WEB: </span><span className="font-bold text-emerald-700">www.meseretmare.com</span><span className="mx-1 text-slate-300">•</span><span className="font-bold text-slate-950">EMAIL: </span><span className="font-bold text-emerald-700">info@meseretmare.com</span></div>
                </div>
                <div className="mt-auto px-4 pb-2 pt-1 border-t border-slate-100 bg-slate-50 text-center">
                  <p className="text-[8px] text-slate-600 leading-tight font-medium">Return Notice: If found, please return to any Meseret Mare Solar office or contact the hotline.</p>
                  <div className="mt-1 flex items-center justify-between pt-0.5 border-t border-dashed border-slate-300">
                    <span className="text-[8px] font-mono font-bold text-slate-500">{workerCode}</span>
                    <div className="text-right">
                      <div className="font-serif italic text-[11px] font-bold text-blue-950 leading-none">M. Mare</div>
                      <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-slate-600 block">Authorized Signatory</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            CR80 Standard (54mm × 86mm) 300 DPI High Density Output
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow">
              <Printer className="h-4 w-4" /> Print ID Badge
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
