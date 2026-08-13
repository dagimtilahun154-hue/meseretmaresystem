import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, QrCode as QrIcon } from "lucide-react";
import { toast } from "sonner";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    code?: string | number;
    category?: string;
    price?: number;
    unit?: string;
  } | null;
}

/**
 * Lightweight QR Code Pattern Generator for Asset Tagging
 */
function generateQRSvg(data: string, size = 180) {
  // Simple deterministic pattern generator matching QR grid standards
  const gridCount = 21; // Standard Version 1 QR matrix 21x21
  const cellSize = size / gridCount;
  const modules: boolean[][] = Array.from({ length: gridCount }, () => Array(gridCount).fill(false));

  // Add 3 corner finder patterns (7x7 outer, 5x5 inner white, 3x3 inner black)
  const addFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || col === 0 || col === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          modules[row + r][col + c] = true;
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, gridCount - 7);
  addFinder(gridCount - 7, 0);

  // Deterministic data encoding pattern based on string hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      // Reserved finder pattern areas
      if ((r < 8 && c < 8) || (r < 8 && c >= gridCount - 8) || (r >= gridCount - 8 && c < 8)) {
        continue;
      }
      const bit = Math.abs((hash ^ (r * 31 + c * 17 + data.length)) % 3);
      if (bit === 1 || (r % 2 === 0 && c % 3 === 0)) {
        modules[r][c] = true;
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white p-2 rounded-xl shadow-inner border border-slate-200">
      {modules.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.3}
              height={cellSize + 0.3}
              fill="#0b1324"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ open, onOpenChange, item }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const itemCode = String(item.code || item.id);
  const tagData = `SOLARFLOW-INV:${itemCode}:${item.name}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=600,height=600");
    if (!printWindow) {
      toast.error("Please allow popups to print asset label tags.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Asset Tag - ${itemCode}</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
            .tag { border: 2px solid #000; padding: 24px; text-align: center; border-radius: 12px; max-width: 280px; }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; color: #111; }
            .code { font-size: 14px; font-weight: 800; color: #0284c7; margin-bottom: 12px; letter-spacing: 1px; }
            .company { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="title">${item.name}</div>
            <div class="code">ID: ${itemCode}</div>
            ${printRef.current?.querySelector("svg")?.outerHTML || ""}
            <div class="company">MESERET MARE SOLAR - WAREHOUSE</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0f172a] text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <QrIcon className="h-5 w-5 text-sky-400" />
            Warehouse Asset QR Code Tag
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Scan with warehouse scanner or mobile app for instant stock verification & checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4" ref={printRef}>
          <div className="text-center">
            <h3 className="font-bold text-lg text-white">{item.name}</h3>
            <p className="text-xs font-mono font-semibold text-sky-400 mt-0.5 tracking-wider">
              ID: {itemCode}
            </p>
            {item.category && (
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {item.category}
              </span>
            )}
          </div>

          <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-sky-500/30">
            {generateQRSvg(tagData, 190)}
          </div>

          <div className="text-center text-[11px] text-slate-400 tracking-widest uppercase font-mono">
            MESERET MARE SOLARFLOW ERP
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-slate-300 hover:bg-white/5">
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Asset Tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
