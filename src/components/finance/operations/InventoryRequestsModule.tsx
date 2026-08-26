import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { RequestStatus } from "@/lib/finance-data";
import { InventoryRequest } from "@/lib/inventory-requests";

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export type InventoryRequestWithPrice = InventoryRequest & {
  price?: number;
};

interface InventoryRequestsModuleProps {
  invRequests: InventoryRequestWithPrice[];
  canApprove: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function InventoryRequestsModule({
  invRequests,
  canApprove,
  onApprove,
  onReject,
}: InventoryRequestsModuleProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Inventory Requisitions & Stock Purchases
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Approve or reject stock purchases, track item unit prices and quantities, and release required inventory for active installations.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {invRequests.filter((r) => r.status === "pending").length} Pending Approvals
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-bold">ID</TableHead>
                <TableHead className="font-bold">Code</TableHead>
                <TableHead className="font-bold">Product</TableHead>
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="text-center font-bold">Qty</TableHead>
                <TableHead className="text-right font-bold">Price</TableHead>
                <TableHead className="font-bold">Requested By</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Note</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Approved By</TableHead>
                <TableHead className="font-bold">Approved Date</TableHead>
                {canApprove && <TableHead className="text-right font-bold">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invRequests.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="font-mono text-xs">{r.productCode}</TableCell>
                  <TableCell className="font-semibold text-xs text-foreground">{r.productName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.category}</TableCell>
                  <TableCell className="text-center font-bold text-xs">{r.quantity}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(Number(r.price || 0))}</TableCell>
                  <TableCell className="text-xs">{r.requestedBy}</TableCell>
                  <TableCell className="text-xs">{r.date}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">{r.note || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[r.status]}>
                      {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {r.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {r.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.approvedBy || "—"}</TableCell>
                  <TableCell className="text-xs">{r.approvedDate || "—"}</TableCell>
                  {canApprove && (
                    <TableCell className="text-right space-x-1">
                      {r.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 text-xs font-bold"
                            onClick={() => onApprove(r.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-red-50 h-7 text-xs font-bold"
                            onClick={() => onReject(r.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {invRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                    No inventory purchase requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
