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

import { getDepartmentBilingual } from "@/lib/db-service";

interface EmployeeIdCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: {
    id: string;
    worker_code?: string;
    workerCode?: string;
    full_name?: string;
    fullName?: string;
    full_name_amharic?: string;
    fullNameAmharic?: string;
    position?: string;
    position_amharic?: string;
    positionAmharic?: string;
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
  const fullNameEnglish = worker?.full_name || worker?.fullName || "Staff Member";
  const fullNameAmharic = worker?.full_name_amharic || worker?.fullNameAmharic || "";

  const positionEnglish = worker?.position || "Solar Technician";
  const positionAmharic = worker?.position_amharic || worker?.positionAmharic || "";

  const deptInfo = getDepartmentBilingual(worker?.departmentName || worker?.department);
  const phone = worker?.phone || "+251 91 123 4567";
  const nationalId = worker?.national_id || worker?.nationalId || "ETH-000000";
  const photo = worker?.photo_url || worker?.photoUrl || "";
  const joinDate = worker?.date_of_joining || worker?.dateOfJoining || new Date().toISOString().slice(0, 10);

  const issueDateFormatted = format(new Date(joinDate || new Date()), "dd MMM yyyy").toUpperCase();
  const expiryDate = new Date(joinDate || new Date());
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);
  const expiryDateFormatted = format(expiryDate, "dd MMM yyyy").toUpperCase();

  const staffPayload = JSON.stringify({
    company: "MESERET MARE SOLAR IMPORT AND INSTALLATION",
    code: workerCode,
    name: fullNameEnglish,
    nameAm: fullNameAmharic || undefined,
    dept: deptInfo.english,
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
                  የሰራተኛ መታወቂያ ካርድ / Company ID Card Generation
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Official high-resolution staff badge with bilingual labels and security QR code.
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
                FRONT SIDE (የፊት ገጽ)
              </span>
              <div
                className="id-card-front w-[300px] h-[480px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* 1. Top 2-Line Header with Logo */}
                <div className="pt-2 px-3 pb-1.5 bg-white flex items-center justify-start gap-2.5 z-20 border-b border-slate-100">
                  <div className="h-10 w-10 shrink-0 bg-white flex items-center justify-center">
                    <img src="/uploads/Untitled_design__4_-removebg-preview.png" alt="Logo" className="h-full w-full object-contain" />
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
                  <svg viewBox="0 0 300 122" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
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
                    <path d="M 0,0 L 300,0 L 300,52 Q 215,115 150,82 Q 80,45 0,95 Z" fill="url(#mFrontWave)" />
                    <path d="M 0,95 Q 80,45 150,82 Q 215,115 300,52 L 300,57 Q 215,120 150,87 Q 80,50 0,100 Z" fill="url(#mFrontGold)" />
                  </svg>
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
                  <div className="w-[120px] shrink-0 flex flex-col items-center justify-center pr-1 border-r border-slate-200">
                    <div className="h-12 w-full overflow-hidden flex items-center justify-center">
                      <img
                        src="/uploads/sign.png"
                        alt="Authorized Signature"
                        className="h-10 w-auto max-w-[130px] scale-[2.2] object-contain"
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
          )}

          {(activeSide === "both" || activeSide === "back") && (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">
                BACK SIDE (የጀርባ ገጽ)
              </span>
              <div
                className="id-card-back w-[300px] h-[480px] bg-white text-slate-900 rounded-[20px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 select-none print:shadow-none print:m-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* 1. Curved Emerald-Gold Wave Header with Emblem */}
                <div className="relative h-[90px] flex items-center justify-center">
                  <svg viewBox="0 0 300 90" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="mBackWave" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="60%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,0 L 300,0 L 300,52 Q 150,90 0,52 Z" fill="url(#mBackWave)" />
                    <path d="M 0,52 Q 150,90 300,52 L 300,57 Q 150,95 0,57 Z" fill="#fbbf24" />
                  </svg>
                  <div className="relative z-10 h-15 w-15 rounded-full bg-white p-1.5 shadow-xl flex items-center justify-center border-[2.5px] border-amber-300 mt-1">
                    <img src="/uploads/Untitled_design__4_-removebg-preview.png" alt="Logo Emblem" className="h-11 w-11 object-contain" />
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
                    src="/uploads/stamp.png"
                    alt="Official Company Stamp"
                    className="h-[110px] max-h-[110px] w-auto object-contain drop-shadow-md mix-blend-multiply opacity-95 scale-[1.3] transition-transform"
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
                      <div className="h-7 flex items-center justify-end overflow-hidden">
                        <img
                          src="/uploads/sign.png"
                          alt="Signature"
                          className="h-6 max-h-6 max-w-[100px] scale-[2.0] object-contain"
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
