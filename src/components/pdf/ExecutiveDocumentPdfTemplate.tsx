import React from "react";
import { formatCurrency } from "@/lib/data";

export interface ExecutivePdfData {
  documentTitle?: string;
  subtitle?: string;
  refNumber?: string;
  date?: string;
  clientSection?: {
    title?: string;
    fields: { label: string; value: string | number | undefined | null }[];
  };
  secondarySection?: {
    title?: string;
    fields: { label: string; value: string | number | undefined | null }[];
  };
  tableData?: {
    title?: string;
    headers: string[];
    rows: (string | number)[][];
  };
  financials?: {
    totalFee?: number;
    adjustments?: number;
    totalDue?: number;
    payment1?: number;
    payment2?: number;
    balanceDue?: number;
  };
  completionPhotos?: string[];
}

export function ExecutiveDocumentPdfTemplate({ data }: { data: ExecutivePdfData }) {
  if (!data) return null;

  const clientFields = data.clientSection?.fields || [];
  const secFields = data.secondarySection?.fields || [];
  const maxRows = Math.max(clientFields.length, secFields.length);

  return (
    <div className="printable-executive-pdf w-full bg-white text-slate-900 p-8 font-sans border-l-[8px] border-blue-900 shadow-none print:p-6 print:m-0 print:border-l-[8px] print:border-blue-900">
      {/* Header Banner */}
      <div className="text-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase font-serif">
          {data.documentTitle || "Meseret Mare Master Client Information Sheet"}
        </h1>
        {data.subtitle && (
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-1">
            {data.subtitle}
          </p>
        )}
        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 font-mono">
          <span>REF NO: {data.refNumber || `MM-${Date.now().toString().slice(-6)}`}</span>
          <span>DATE: {data.date || new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Two-Column Side-by-Side Form Information Sheet */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Left Column: Primary Client Information */}
        <div className="space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            {data.clientSection?.title || "TAXPAYER / CLIENT INFORMATION"}
          </h2>
          <div className="space-y-2 pt-1">
            {clientFields.map((field, idx) => (
              <div key={idx} className="flex items-center text-xs justify-between gap-2">
                <span className="w-1/3 text-slate-600 font-semibold text-[11px] truncate">{field.label}</span>
                <div className="w-2/3 border border-slate-300 rounded px-2 py-1 bg-slate-50 text-slate-900 font-medium text-xs truncate min-h-[26px] flex items-center">
                  {field.value !== undefined && field.value !== null && field.value !== "" ? String(field.value) : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Technical / Site Specifications */}
        <div className="space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            {data.secondarySection?.title || "HYDRAULIC & TECHNICAL SPECIFICATIONS"}
          </h2>
          <div className="space-y-2 pt-1">
            {secFields.map((field, idx) => (
              <div key={idx} className="flex items-center text-xs justify-between gap-2">
                <span className="w-1/3 text-slate-600 font-semibold text-[11px] truncate">{field.label}</span>
                <div className="w-2/3 border border-slate-300 rounded px-2 py-1 bg-slate-50 text-slate-900 font-medium text-xs truncate min-h-[26px] flex items-center">
                  {field.value !== undefined && field.value !== null && field.value !== "" ? String(field.value) : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Structured Table Section (Equipment / Dependents / Operations) */}
      {data.tableData && data.tableData.headers && data.tableData.headers.length > 0 && (
        <div className="mb-8 space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            {data.tableData.title || "EQUIPMENT & SYSTEM ASSET SPECIFICATIONS"}
          </h2>
          <table className="w-full text-xs border border-slate-300 rounded overflow-hidden mt-2">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px] border-b border-slate-300">
                {data.tableData.headers.map((h, i) => (
                  <th key={i} className="p-2 border-r border-slate-300 last:border-r-0 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tableData.rows.length > 0 ? (
                data.tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 border-r border-slate-200 last:border-r-0 text-slate-800 font-medium text-xs">
                        {String(cell || "—")}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={data.tableData.headers.length} className="p-3 text-center text-slate-500 italic">
                    No items registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Completion Site Photos if present */}
      {Array.isArray(data.completionPhotos) && data.completionPhotos.length > 0 && (
        <div className="mb-8 space-y-2 page-break-inside-avoid">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            VERIFIED SITE INSTALLATION PHOTOS
          </h2>
          <div className="grid grid-cols-2 gap-4 pt-2">
            {data.completionPhotos.map((url, idx) => (
              <div key={idx} className="border border-slate-300 p-2 rounded bg-slate-50">
                <span className="text-[10px] font-bold text-slate-700 block mb-1">Photo #{idx + 1}</span>
                <div className="h-32 bg-slate-200 rounded overflow-hidden flex items-center justify-center">
                  {url.startsWith("http") || url.startsWith("data:") ? (
                    <img src={url} alt={`Site photo ${idx + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-mono text-slate-600 break-all p-2">{url}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Summary Section at Bottom */}
      {data.financials && (
        <div className="mb-8 space-y-2 page-break-inside-avoid">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            FINANCIAL SCHEDULE & AMOUNT DUE
          </h2>
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Total Turnkey Package Fee</span>
                <div className="w-1/2 border border-slate-300 rounded px-2 py-1 bg-slate-50 font-bold text-slate-900">
                  {formatCurrency(data.financials.totalFee || 0)} ETB
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Adjustments / Per Diem</span>
                <div className="w-1/2 border border-slate-300 rounded px-2 py-1 bg-slate-50 font-bold text-slate-900">
                  {formatCurrency(data.financials.adjustments || 0)} ETB
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-900 font-black">Total Amount Due</span>
                <div className="w-1/2 border-2 border-slate-900 rounded px-2 py-1 bg-slate-100 font-black text-slate-950">
                  {formatCurrency(data.financials.totalDue || (data.financials.totalFee || 0))} ETB
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Deposit / Payment 1</span>
                <div className="w-1/2 border border-slate-300 rounded px-2 py-1 bg-slate-50 font-bold text-emerald-700">
                  {formatCurrency(data.financials.payment1 || 0)} ETB
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Final Release / Payment 2</span>
                <div className="w-1/2 border border-slate-300 rounded px-2 py-1 bg-slate-50 font-bold text-emerald-700">
                  {formatCurrency(data.financials.payment2 || 0)} ETB
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-900 font-black">Outstanding Balance Due</span>
                <div className="w-1/2 border-2 border-slate-900 rounded px-2 py-1 bg-slate-100 font-black text-blue-900">
                  {formatCurrency(data.financials.balanceDue || 0)} ETB
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Sign-Off Footer */}
      <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 page-break-inside-avoid">
        <div className="space-y-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">MESERET MARE AUTHORIZED OFFICER SIGNATURE</span>
          <div className="border-b border-slate-400 pb-1">
            <span className="text-xs font-bold text-slate-900 block">Lead Engineer / Officer Signature</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Date & Stamp: _______________________</span>
        </div>
        <div className="space-y-6">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">CLIENT / TAXPAYER ACCEPTANCE SIGNATURE</span>
          <div className="border-b border-slate-400 pb-1">
            <span className="text-xs font-bold text-slate-900 block">Client Representative Signature</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Date: _______________________</span>
        </div>
      </div>
    </div>
  );
}
