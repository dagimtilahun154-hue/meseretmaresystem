import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, Clock, CheckCircle2, XCircle, User } from "lucide-react";
import { hrDB } from "@/lib/db-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// -------------------------------------------------------
// Component
// -------------------------------------------------------
export default function AttendanceScan() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanning, setScanning] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [selectedFingerprint, setSelectedFingerprint] = useState<string>("");
  const [result, setResult] = useState<{
    status: "success" | "error";
    message: string;
    type?: "check-in" | "check-out";
    workerName?: string;
    time?: string;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    const workersData = await hrDB.getWorkers();
    if (workersData) setWorkers(workersData.filter((w: any) => !!w.fingerprint_id));

    const settingsData = await hrDB.getSettings();
    if (settingsData) setSettings(settingsData);
  };

  const handleScan = async () => {
    if (!selectedFingerprint) {
      toast({ title: "Select a fingerprint first", description: "Choose which worker is scanning.", variant: "destructive" });
      return;
    }

    setScanning(true);
    setResult(null);

    // Simulate the 1-second scanner delay
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const scanResult = await hrDB.scanAttendance(selectedFingerprint);
      
      if (!scanResult || scanResult.error) {
        throw new Error(scanResult?.message || "Scan failed.");
      }

      setResult({
        status: "success",
        message: scanResult.message,
        type: scanResult.type,
        workerName: scanResult.worker?.full_name,
        time: format(new Date(), "hh:mm:ss a"),
      });
    } catch (error: any) {
      setResult({
        status: "error",
        message: error.message || "Scan failed. Try again.",
      });
    } finally {
      setScanning(false);
      // Auto-clear after 5 seconds
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white">
      {/* Clock */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-black tracking-tight mb-1 tabular-nums">
          {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </h1>
        <p className="text-slate-400 font-medium">
          {currentTime.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Fingerprint Selector (Simulation) */}
      <div className="w-full max-w-md mb-4">
        <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-widest mb-2">
          Simulation — Select Worker Fingerprint
        </p>
        <Select value={selectedFingerprint} onValueChange={setSelectedFingerprint}>
          <SelectTrigger className="bg-white shadow-sm">
            <SelectValue placeholder="Choose whose finger is scanning..." />
          </SelectTrigger>
          <SelectContent>
            {workers.length === 0 ? (
              <SelectItem value="_none" disabled>No registered fingerprints found</SelectItem>
            ) : (
              workers.map((w) => (
                <SelectItem key={w.id} value={w.fingerprint_id}>
                  {w.full_name} — ID: {w.fingerprint_id}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Scan Card */}
      <Card className={`w-full max-w-md transition-all duration-500 border-4 shadow-xl ${
        result?.status === "success"
          ? "border-green-400 bg-green-50/30"
          : result?.status === "error"
          ? "border-red-400 bg-red-50/30"
          : "border-slate-200"
      }`}>
        <CardContent className="p-8">
          {!result ? (
            // Idle State
            <div className="flex flex-col items-center space-y-8">
              <div className={`p-10 rounded-full bg-primary/5 border-4 border-primary/10 transition-all duration-300 ${
                scanning ? "scale-110 animate-pulse border-primary/30 bg-primary/10" : ""
              }`}>
                <Fingerprint className={`h-20 w-20 text-primary transition-opacity ${scanning ? "opacity-40" : "opacity-100"}`} />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-slate-800">
                  {scanning ? "Reading fingerprint..." : "Scan Your Finger"}
                </h2>
                <p className="text-slate-400 text-sm">
                  {scanning ? "Please hold still" : "Place finger on scanner to check-in or check-out"}
                </p>
              </div>
              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
                onClick={handleScan}
                disabled={scanning || !selectedFingerprint}
              >
                {scanning ? "Processing..." : "SIMULATE SCAN"}
              </Button>
            </div>
          ) : (
            // Result State
            <div className="flex flex-col items-center space-y-5 animate-in zoom-in duration-300">
              {result.status === "success" ? (
                <div className="p-4 rounded-full bg-green-100">
                  <CheckCircle2 className="h-14 w-14 text-green-600" />
                </div>
              ) : (
                <div className="p-4 rounded-full bg-red-100">
                  <XCircle className="h-14 w-14 text-red-600" />
                </div>
              )}

              <div className="text-center w-full">
                {result.workerName && (
                  <div className="flex flex-col items-center mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-white shadow mb-2 flex items-center justify-center">
                      <User className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-xl font-black">{result.workerName}</p>
                    {result.time && (
                      <p className="text-slate-400 text-sm font-mono mt-1">{result.time}</p>
                    )}
                  </div>
                )}

                <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-3 ${
                  result.type === "check-in"
                    ? "bg-green-600 text-white"
                    : result.type === "check-out"
                    ? "bg-blue-600 text-white"
                    : "bg-red-600 text-white"
                }`}>
                  {result.type?.toUpperCase() || "ERROR"}
                </span>

                <p className={`text-base font-semibold ${result.status === "success" ? "text-slate-700" : "text-red-700"}`}>
                  {result.message}
                </p>
              </div>

              <p className="text-slate-300 text-xs italic">Screen resets in 5 seconds...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Times */}
      <div className="mt-8 flex gap-6 text-xs font-semibold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Start: {settings?.work_start_time || "08:00"}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          End: {settings?.work_end_time || "17:00"}
        </div>
        <div className="flex items-center gap-1.5">
          Grace: {settings?.grace_period_minutes ?? 15} min
        </div>
      </div>
    </div>
  );
}
