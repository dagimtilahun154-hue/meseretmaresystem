import React from "react";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Globe, MapPin, ShieldCheck, Sun } from "lucide-react";

export interface CompanyDocumentHeaderProps {
  documentTitle?: string;
  subtitle?: string;
  refNumber?: string;
  date?: string;
  statusBadge?: string;
  statusColor?: string;
  showContactBar?: boolean;
}

export function CompanyDocumentHeader({
  documentTitle = "MASTER CLIENT INFORMATION & TECHNICAL DOSSIER",
  subtitle = "Unified 360° Solar Water Pumping & Commercial Engineering File",
  refNumber,
  date,
  statusBadge,
  statusColor = "bg-emerald-600 text-white",
  showContactBar = true,
}: CompanyDocumentHeaderProps) {
  const currentDate = date || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="company-document-header bg-card text-card-foreground border-2 border-primary/20 rounded-2xl overflow-hidden shadow-md mb-6 print:border print:shadow-none print:rounded-none print:m-0 print:mb-6">
      {/* Top Gold/Green Accent Bar */}
      <div className="h-2 bg-gradient-to-r from-[#2cb563] via-amber-400 to-[#14532d] w-full" />

      {/* Main Letterhead Body */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white print:bg-white print:text-slate-900 print:from-white print:to-white print:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/15 pb-4 print:border-slate-300">
          
          {/* Logo & Corporate Identity */}
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden bg-white p-1.5 flex items-center justify-center border border-white/20 shadow-sm shrink-0 print:border-slate-300">
              <img
                src="/uploads/Untitled_design__4_-removebg-preview.png"
                alt="Meseret Mare Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <Sun className="h-8 w-8 text-amber-400 hidden only-if-img-fails" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white print:text-slate-950 uppercase font-heading">
                  MESERET MARE
                </h1>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase print:text-slate-700 print:border-slate-400">
                  Solar Engineering
                </span>
              </div>
              <p className="text-xs text-slate-300 print:text-slate-600 font-medium">
                Solar Water Pumping Systems • Commercial Irrigation • Off-Grid Power
              </p>
              <p className="text-[10px] text-slate-400 print:text-slate-500 font-mono">
                TIN: 0045892110 • VAT Reg: 894120/2016 • License: ETH-AA-2015-B
              </p>
            </div>
          </div>

          {/* Reference & Document Timestamp Badge */}
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0 w-full sm:w-auto">
            {statusBadge && (
              <Badge className={`${statusColor} font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-md`}>
                {statusBadge}
              </Badge>
            )}
            <div className="text-xs font-mono text-slate-300 print:text-slate-700 sm:text-right space-y-0.5">
              <div>
                <span className="text-slate-400 print:text-slate-500">REF NO: </span>
                <strong className="text-amber-400 print:text-slate-900 font-bold">{refNumber || `MM-${Date.now().toString().slice(-6)}`}</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-500">DATE: </span>
                <strong className="text-white print:text-slate-900">{currentDate}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-amber-400 print:text-emerald-800 uppercase font-heading">
              {documentTitle}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-300 print:text-slate-600">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 print:text-emerald-700 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Official Technical Document</span>
          </div>
        </div>

        {/* Corporate Contact & HQ Details Footer Bar */}
        {showContactBar && (
          <div className="mt-4 pt-3 border-t border-white/10 print:border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-300 print:text-slate-600 font-mono">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="truncate">Addis Ababa, Gulele Sub-City, Addisu Gebeya</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="truncate">+251 91 151 4589 / +251 11 662 4589</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="truncate">info@meseretmare.com</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="truncate">www.meseretmare.com</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
