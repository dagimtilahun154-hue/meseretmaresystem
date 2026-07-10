import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Trash2,
  User,
  FlaskConical,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hrDB } from "@/lib/db-service";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Step = 1 | 2 | 3;

export default function FingerprintRegistration() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<any[]>([]);
  const [registeredWorkers, setRegisteredWorkers] = useState<any[]>([]);

  // Step-by-step registration state
  const [step, setStep] = useState<Step>(1);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    const data = await hrDB.getWorkers();
    if (data) {
      setWorkers(data.filter((w: any) => !w.fingerprint_id));
      setRegisteredWorkers(data.filter((w: any) => !!w.fingerprint_id));
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedWorker(null);
    setTemplateId("");
    setDone(false);
  };

  // Step 1 → 2: Worker selected
  const handleSelectWorker = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    setSelectedWorker(worker);
  };

  const goToStep2 = () => {
    if (!selectedWorker) return;
    setStep(2);
  };

  const goToStep3 = () => {
    if (!templateId.trim()) {
      toast({ title: "Enter the Template ID", description: "Please enter the ID shown by your fingerprint device.", variant: "destructive" });
      return;
    }
    setStep(3);
  };

  // Final save
  const handleSave = async () => {
    if (!templateId.trim() || !selectedWorker) return;

    setSaving(true);

    // Check if ID already taken
    const allWorkers = await hrDB.getWorkers();
    const existing = allWorkers.find((w: any) => w.fingerprint_id === templateId.trim());

    if (existing) {
      toast({
        title: "Duplicate Fingerprint ID",
        description: `This ID is already linked to ${existing.full_name}. Each fingerprint ID must be unique.`,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const success = await hrDB.saveWorker({ ...selectedWorker, fingerprintId: templateId.trim() });

    setSaving(false);

    if (!success) {
      toast({ title: "Error", description: "Could not save fingerprint registration.", variant: "destructive" });
    } else {
      setDone(true);
      fetchWorkers();
    }
  };

  const handleRemoveFingerprint = async (workerId: string, workerName: string) => {
    if (!confirm(`Remove fingerprint registration from ${workerName}?`)) return;
    const worker = registeredWorkers.find(w => w.id === workerId);
    if (!worker) return;
    
    const success = await hrDB.saveWorker({ ...worker, fingerprintId: null });
    if (!success) {
      toast({ title: "Error", description: "Could not remove fingerprint.", variant: "destructive" });
    } else {
      toast({ title: "Removed", description: `Fingerprint removed from ${workerName}.` });
      fetchWorkers();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Fingerprint Registration</h1>
        <p className="text-muted-foreground">Link a worker's biometric fingerprint to their profile.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- REGISTRATION CARD ---- */}
        <Card>
          <CardHeader>
            <CardTitle>Register New Fingerprint</CardTitle>
            <CardDescription>Follow the steps below carefully.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* SUCCESS STATE */}
            {done ? (
              <div className="flex flex-col items-center py-10 space-y-4 animate-in zoom-in duration-300">
                <div className="p-4 rounded-full bg-green-100">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700">Registration Complete!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    <strong>{selectedWorker?.full_name}</strong> has been registered with fingerprint ID:{" "}
                    <span className="font-mono font-bold">{templateId}</span>
                  </p>
                </div>
                <Button className="w-full" onClick={resetForm}>
                  Register Another Worker
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* STEP INDICATOR */}
                <div className="flex items-center gap-2 text-sm">
                  {([1, 2, 3] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        step === s
                          ? "bg-primary text-white border-primary"
                          : step > s
                          ? "bg-green-500 text-white border-green-500"
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      }`}>
                        {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
                      </div>
                      {i < 2 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                    </div>
                  ))}
                  <div className="ml-2 text-slate-500">
                    {step === 1 && "Select Worker"}
                    {step === 2 && "Scan on Device"}
                    {step === 3 && "Confirm & Save"}
                  </div>
                </div>

                {/* STEP 1: SELECT WORKER */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border text-sm text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-800">Step 1: Choose the worker</p>
                      <p>Select the worker whose fingerprint you are about to register.</p>
                    </div>
                    <Select value={selectedWorker?.id || ""} onValueChange={handleSelectWorker}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a worker..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.length === 0 ? (
                          <SelectItem value="_none" disabled>All workers are registered</SelectItem>
                        ) : (
                          workers.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                {w.full_name} <span className="text-slate-400 text-xs">({w.worker_code})</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button className="w-full" onClick={goToStep2} disabled={!selectedWorker}>
                      Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* STEP 2: SCAN ON DEVICE */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 space-y-2">
                      <p className="font-semibold">Step 2: Place finger on the device NOW</p>
                      <ol className="list-decimal ml-4 space-y-1 text-xs">
                        <li>Ask <strong>{selectedWorker?.full_name}</strong> to place their finger on the biometric scanner.</li>
                        <li>Your device software will show a <strong>Template ID</strong> or <strong>Fingerprint Number</strong>.</li>
                        <li>Note down that ID (e.g. "5", "FP-001", "12345").</li>
                        <li>Then enter that ID below and proceed.</li>
                      </ol>
                    </div>

                    <div className="flex flex-col items-center py-5 border-2 border-dashed rounded-xl bg-slate-50 gap-3">
                      <Fingerprint className="h-14 w-14 text-primary opacity-70" />
                      <p className="text-sm text-slate-500 font-medium text-center">
                        Waiting for <strong>{selectedWorker?.full_name}</strong> to scan their finger...
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">
                        Enter Template ID from device
                      </label>
                      <Input
                        placeholder="e.g.  1  or  FP-004  or  12345"
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="font-mono"
                      />
                      <p className="text-xs text-slate-400">
                        This is the ID your biometric device shows after a successful scan.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                      <Button className="flex-1" onClick={goToStep3} disabled={!templateId.trim()}>
                        Continue <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: CONFIRM & SAVE */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border space-y-1">
                      <p className="text-sm font-semibold text-slate-700">Step 3: Confirm Registration</p>
                      <p className="text-xs text-slate-500">Please verify the details below before saving.</p>
                    </div>

                    <div className="rounded-xl border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-white">
                        <span className="text-sm text-slate-500">Worker</span>
                        <span className="font-semibold">{selectedWorker?.full_name}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
                        <span className="text-sm text-slate-500">Worker ID</span>
                        <span className="font-mono text-sm">{selectedWorker?.worker_code}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
                        <span className="text-sm text-slate-500">Fingerprint / Template ID</span>
                        <Badge variant="outline" className="font-mono">{templateId}</Badge>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Confirm & Save"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* TEST/DEMO NOTE at bottom */}
                <div className="flex items-start gap-2 bg-slate-50 border rounded-lg p-3 text-xs text-slate-500 mt-2">
                  <FlaskConical className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                  <span>
                    <strong>No device yet?</strong> In Step 2, just type any unique number (e.g. <code>101</code>) as the Template ID to test the system. You can replace it later with the real ID.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- REGISTERED WORKERS LIST ---- */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Workers ({registeredWorkers.length})</CardTitle>
            <CardDescription>Workers who have a fingerprint ID linked to their profile.</CardDescription>
          </CardHeader>
          <CardContent>
            {registeredWorkers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm italic">
                No fingerprints registered yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Fingerprint ID</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredWorkers.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{w.full_name}</p>
                        <p className="text-xs text-muted-foreground">{w.worker_code}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {w.fingerprint_id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveFingerprint(w.id, w.full_name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
