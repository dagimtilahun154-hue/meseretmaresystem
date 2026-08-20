import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, QrCode, Zap, RefreshCw, X, Keyboard, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (decodedText: string) => void;
  title?: string;
  description?: string;
  expectedItemName?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onOpenChange,
  onScan,
  title = "Scan QR / Barcode Tag",
  description = "Point your camera at the warehouse asset tag or shelf QR code.",
  expectedItemName,
}) => {
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "html5-qr-reader-container";

  // Stop camera helper
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop QR scanner cleanly:", err);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  // Start camera helper
  const startScanner = async (cameraId?: string) => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        });
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError("No cameras detected on this device. You can type the code below.");
        return;
      }

      setCameras(devices);
      const targetId = cameraId || devices[devices.length - 1].id;
      setSelectedCameraId(targetId);

      await scannerRef.current.start(
        targetId,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera scanner error:", err);
      setCameraError(
        err?.message?.includes("Permission")
          ? "Camera access permission denied. Please allow camera permissions or type the code manually."
          : "Could not start camera. Please enter code manually."
      );
      setIsScanning(false);
    }
  };

  const handleSuccess = (decoded: string) => {
    if (navigator.vibrate) navigator.vibrate(100);
    toast.success(`Scanned: ${decoded}`);
    stopScanner();
    onOpenChange(false);
    onScan(decoded);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccess(manualCode.trim());
    setManualCode("");
  };

  // Lifecycle
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
      setManualCode("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background text-foreground border-border shadow-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-foreground text-lg">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Camera className="h-5 w-5" />
              </div>
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs mt-1">
            {description}
          </DialogDescription>
          {expectedItemName && (
            <div className="mt-2 p-2 rounded-lg bg-muted/40 border border-border flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Scanning for item:</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                {expectedItemName}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {/* Video / Camera Viewport */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] w-full overflow-hidden">
          <div id={scannerContainerId} className="w-full h-full min-h-[300px]" />

          {/* Scanner Overlay Visual Target */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-primary/80 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                {/* Laser animation bar */}
                <div className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(59,130,246,1)] animate-bounce" />
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-background/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <p className="text-xs text-foreground font-semibold max-w-xs">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startScanner(selectedCameraId)}
                className="text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Camera
              </Button>
            </div>
          )}
        </div>

        {/* Camera Switcher (If multiple) */}
        {cameras.length > 1 && (
          <div className="px-6 py-2 bg-muted/40 border-b flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Camera:</span>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCameraId(id);
                stopScanner().then(() => startScanner(id));
              }}
              className="bg-background text-foreground border border-border rounded px-2 py-1 text-xs"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Manual Barcode & Hardware Gun Input */}
        <div className="p-5 bg-card border-t space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <span>Manual or USB Barcode Gun Entry</span>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="Type or scan item code / serial number..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="h-9 text-xs bg-background border-border"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={!manualCode.trim()}
              className="bg-primary text-primary-foreground font-bold h-9 px-4 text-xs shrink-0"
            >
              Verify Code
            </Button>
          </form>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close Scanner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
