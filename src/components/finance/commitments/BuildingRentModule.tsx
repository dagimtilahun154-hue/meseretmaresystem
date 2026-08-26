import React, { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building, Plus, CalendarClock, Check, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { BuildingRentRecord } from "@/lib/finance-data";
import { toMoneyNumber } from "@/lib/finance-hub-store";

interface BuildingRentModuleProps {
  buildingRents: BuildingRentRecord[];
  selectedEntity: "FZ" | "MM";
  totalRentCollected: number;
  onAddRent: (record: any) => Promise<void>;
}

export function BuildingRentModule({
  buildingRents,
  selectedEntity,
  totalRentCollected,
  onAddRent,
}: BuildingRentModuleProps) {
  const [rentDialog, setRentDialog] = useState(false);
  const [rentForm, setRentForm] = useState<{
    month: string;
    floor: BuildingRentRecord["floor"];
    roomNo: string;
    collection: string;
    rentPrice: string;
    amount: string;
    status: "paid" | "pending";
    remark: string;
  }>({
    month: new Date().toLocaleString("default", { month: "long" }),
    floor: "Ground",
    roomNo: "",
    collection: "",
    rentPrice: "",
    amount: "",
    status: "paid",
    remark: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!rentForm.roomNo || !rentForm.rentPrice || !rentForm.amount) return;
    setSubmitting(true);
    try {
      await onAddRent({
        ...rentForm,
        rentPrice: Number(rentForm.rentPrice) || 0,
        amount: Number(rentForm.amount) || 0,
      });
      setRentDialog(false);
      setRentForm({
        month: new Date().toLocaleString("default", { month: "long" }),
        floor: "Ground",
        roomNo: "",
        collection: "",
        rentPrice: "",
        amount: "",
        status: "paid",
        remark: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const entityRents = buildingRents.filter((r) => r.entity === selectedEntity);
  const rentsByMonth = entityRents.reduce((acc, rent) => {
    if (!acc[rent.month]) acc[rent.month] = [];
    acc[rent.month].push(rent);
    return acc;
  }, {} as Record<string, BuildingRentRecord[]>);

  const floors = ["Ground", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor"] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading">Building & Warehouse Rent Tracker</h2>
          <p className="text-xs text-muted-foreground">Track rental collections per floor and branch facilities for {selectedEntity}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-primary/10 text-primary border-primary/30 text-xs font-bold">
            Total Collected: <span className="ml-1.5 font-mono font-black">{formatCurrency(totalRentCollected)}</span>
          </Badge>
          <Button size="sm" onClick={() => setRentDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Rent Record
          </Button>
        </div>
      </div>

      {Object.entries(rentsByMonth).map(([month, rents]) => {
        const monthTotal = rents.reduce((s, r) => s + toMoneyNumber(r.amount), 0);

        return (
          <Card key={month} className="overflow-hidden border border-border/70 shadow-sm">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" /> {month} Collections
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  Month Total: <span className="font-mono font-bold ml-1">{formatCurrency(monthTotal)}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-[120px] font-bold text-xs">Floor</TableHead>
                    <TableHead className="font-bold text-xs">Room No.</TableHead>
                    <TableHead className="font-bold text-xs">Collection</TableHead>
                    <TableHead className="text-right font-bold text-xs">Rent Price</TableHead>
                    <TableHead className="text-right font-bold text-xs">Amount</TableHead>
                    <TableHead className="font-bold text-xs">Remark</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {floors.map((floor) => {
                    const floorRents = rents.filter((r) => r.floor === floor);
                    if (floorRents.length === 0) return null;
                    const floorSubTotal = floorRents.reduce((s, r) => s + toMoneyNumber(r.amount), 0);
                    const floorExpected = floorRents.reduce((s, r) => s + toMoneyNumber(r.rentPrice), 0);

                    return (
                      <Fragment key={floor}>
                        {floorRents.map((r, idx) => (
                          <TableRow key={r.id} className={`hover:bg-muted/20 ${r.status === "pending" ? "bg-red-50/20 dark:bg-red-950/10" : ""}`}>
                            {idx === 0 ? (
                              <TableCell rowSpan={floorRents.length} className="font-bold align-top bg-muted/5 border-r border-border/30">
                                {floor}
                              </TableCell>
                            ) : null}
                            <TableCell className="font-medium">{r.roomNo}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold text-muted-foreground">
                                {r.collection}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(r.rentPrice)}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${r.amount === 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                              {formatCurrency(r.amount)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.remark || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={r.status === "paid" ? "bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200"}>
                                {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                {r.status === "paid" && <Check className="h-3 w-3 mr-1" />}
                                {r.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/10 border-b-2">
                          <TableCell colSpan={2} className="text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground border-r border-border/30">
                            Sub Total {floor}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-muted-foreground line-through opacity-70">
                            {formatCurrency(floorExpected)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-black text-primary text-sm">
                            {formatCurrency(floorSubTotal)}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {entityRents.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p>No rent records found for {selectedEntity}.</p>
        </Card>
      )}

      {/* Add Rent Dialog */}
      <Dialog open={rentDialog} onOpenChange={setRentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Record Building Rent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Month</Label>
                <Input value={rentForm.month} onChange={(e) => setRentForm((prev) => ({ ...prev, month: e.target.value }))} placeholder="e.g. March" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Floor</Label>
                <Select value={rentForm.floor} onValueChange={(v: BuildingRentRecord["floor"]) => setRentForm((prev) => ({ ...prev, floor: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ground">Ground Floor</SelectItem>
                    <SelectItem value="1st Floor">1st Floor</SelectItem>
                    <SelectItem value="2nd Floor">2nd Floor</SelectItem>
                    <SelectItem value="3rd Floor">3rd Floor</SelectItem>
                    <SelectItem value="4th Floor">4th Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Room No</Label>
                <Input value={rentForm.roomNo} onChange={(e) => setRentForm((prev) => ({ ...prev, roomNo: e.target.value }))} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Collection Name</Label>
                <Input value={rentForm.collection} onChange={(e) => setRentForm((prev) => ({ ...prev, collection: e.target.value }))} className="text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Rent Price (ETB)</Label>
                <Input type="number" value={rentForm.rentPrice} onChange={(e) => setRentForm((prev) => ({ ...prev, rentPrice: e.target.value }))} className="text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Paid Amount (ETB)</Label>
                <Input type="number" value={rentForm.amount} onChange={(e) => setRentForm((prev) => ({ ...prev, amount: e.target.value }))} className="text-xs font-mono font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Status</Label>
                <Select value={rentForm.status} onValueChange={(v: "paid" | "pending") => setRentForm((prev) => ({ ...prev, status: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Remark</Label>
                <Input value={rentForm.remark} onChange={(e) => setRentForm((prev) => ({ ...prev, remark: e.target.value }))} className="text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRentDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting} className="font-bold">
              {submitting ? "Saving..." : "Save Rent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
