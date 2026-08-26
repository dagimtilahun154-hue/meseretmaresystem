import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/data";
import { VATRecord } from "@/lib/finance-data";
import { downloadCSV, generateVATExport } from "@/lib/export-utils";

interface VatComplianceModuleProps {
  vatRecords: VATRecord[];
  totalVAT: number;
}

export function VatComplianceModule({
  vatRecords,
  totalVAT,
}: VatComplianceModuleProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Card className="border shadow-sm">
        <CardHeader className="bg-muted/15 border-b pb-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" /> Ethiopian VAT (15%) Compliance & Sales Tax Records
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Official Ministry of Revenue VAT ledger: Track standard 15% value-added taxes collected from commercial sales and POS invoices.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadCSV("vat_export.csv", generateVATExport(vatRecords))}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Export for Tax Filing
              </Button>
              <Badge className="bg-primary/10 text-primary font-mono text-xs font-bold py-1 px-2.5">
                Total VAT Collected: {formatCurrency(totalVAT)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-bold text-xs">Customer Name</TableHead>
                <TableHead className="font-bold text-xs">Receipt / Sales Slip #</TableHead>
                <TableHead className="font-bold text-xs text-right">VAT Amount (15%)</TableHead>
                <TableHead className="font-bold text-xs">Tax Note</TableHead>
                <TableHead className="font-bold text-xs text-right">Filing Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {vatRecords.map((v) => (
                <TableRow key={v.id} className="hover:bg-muted/20">
                  <TableCell className="font-semibold text-foreground">{v.customerName}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{v.receiptNumber}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-destructive">{formatCurrency(v.vatAmount)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{v.note || "Standard Tax"}</TableCell>
                  <TableCell className="text-right font-mono">{v.date}</TableCell>
                </TableRow>
              ))}
              {vatRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No VAT declarations recorded.
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
