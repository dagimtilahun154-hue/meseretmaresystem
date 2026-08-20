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
import { Badge } from "@/components/ui/badge";
import { Printer, Download, QrCode as QrIcon, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { ProductCategory } from "@/lib/data";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    code?: string | number;
    category?: string;
    productCategory?: ProductCategory;
    price?: number;
    unit?: string;
    shelfLocation?: string;
  } | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ open, onOpenChange, item }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const itemCode = String(item?.code || item?.id || "");
  const tagPayload = `MESERETMARE:ITEM:${itemCode}:${item?.productCategory || item?.category || "EQUIPMENT"}`;

  useEffect(() => {
    if (open && item) {
      QRCode.toDataURL(tagPayload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => {
          console.error("QR Code generation failed", err);
          toast.error("Failed to generate QR Code");
        });
    }
  }, [open, item, tagPayload]);

  if (!item) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=600,height=600");
    if (!printWindow) {
      toast.error("Please allow popups to print asset label tags.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Tag - ${itemCode}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; }
            .tag { border: 2.5px solid #0f172a; padding: 20px; text-align: center; border-radius: 14px; width: 300px; background: #fff; }
            .company { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #0284c7; margin-bottom: 6px; }
            .title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.2; word-break: break-word; }
            .code { font-size: 13px; font-family: monospace; font-weight: 700; color: #475569; margin-bottom: 12px; }
            .qr-img { width: 180px; height: 180px; margin: 0 auto; display: block; }
            .footer-info { margin-top: 10px; font-size: 10px; color: #64748b; font-weight: 600; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
            .location { font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="company">MESERET MARE SOLAR / FZ TRADING</div>
            <div class="title">${item.name}</div>
            <div class="code">CODE: ${itemCode}</div>
            <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
            <div class="footer-info">
              <div>TAG: ${item.productCategory || item.category || "STOCK"}</div>
              ${item.shelfLocation ? `<div class="location">LOC: ${item.shelfLocation}</div>` : ""}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tagPayload);
    setCopied(true);
    toast.success("QR Tag data copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${itemCode}_${item.name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    a.click();
    toast.success("QR Code image downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background text-foreground border-border shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <QrIcon className="h-5 w-5" />
            </div>
            Standard Warehouse QR Code Tag
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Standard ISO/IEC 18004 QR tag for warehouse bins, shelves, and quick scanning.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-2xl border border-border/60 space-y-4"
          ref={printRef}
        >
          <div className="text-center">
            <div className="text-[10px] font-bold tracking-widest text-primary uppercase">
              Meseret Mare Inventory Tag
            </div>
            <h3 className="font-bold text-base text-foreground mt-1 max-w-[280px] truncate">{item.name}</h3>
            <p className="text-xs font-mono font-semibold text-muted-foreground mt-0.5 tracking-wider">
              Code: <span className="text-primary font-bold">{itemCode}</span>
            </p>
            {item.shelfLocation && (
              <Badge variant="outline" className="mt-1.5 text-[11px] font-mono">
                Shelf / Bin: {item.shelfLocation}
              </Badge>
            )}
          </div>

          <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-border">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Asset Tag QR Code" className="w-[180px] h-[180px] block" />
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center bg-muted text-muted-foreground text-xs">
                Generating QR...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border/60 max-w-full">
            <span className="truncate">{tagPayload}</span>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors"
              title="Copy payload"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs gap-1.5">
            <Download className="h-4 w-4" /> Download PNG
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Close
            </Button>
            <Button size="sm" onClick={handlePrint} className="text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-sm">
              <Printer className="h-4 w-4" /> Print Asset Label
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
