import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  CheckCircle2,
  Package,
  Calendar,
  Filter,
  History,
} from "lucide-react";
import { InventoryTransactionItem } from "@/lib/api/inventory";
import { formatCurrency, ProductCategory } from "@/lib/data";
import { toast } from "sonner";

interface InventoryHistoryTabProps {
  transactions: InventoryTransactionItem[];
}

export const InventoryHistoryTab: React.FC<InventoryHistoryTabProps> = ({ transactions }) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchType = typeFilter === "ALL" || tx.transactionType === typeFilter;
      const matchCat = categoryFilter === "ALL" || tx.category === categoryFilter;
      const matchSearch =
        tx.productName.toLowerCase().includes(search.toLowerCase()) ||
        (tx.reference || "").toLowerCase().includes(search.toLowerCase()) ||
        (tx.serialNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (tx.performedBy || "").toLowerCase().includes(search.toLowerCase());

      return matchType && matchCat && matchSearch;
    });
  }, [transactions, typeFilter, categoryFilter, search]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "Transaction ID",
      "Date & Time",
      "Type",
      "Item Name",
      "Category",
      "Quantity",
      "Unit",
      "Serial Number",
      "Reference",
      "Performed By",
      "Notes",
    ];

    const rows = filtered.map((tx) => [
      tx.id,
      new Date(tx.createdAt).toISOString(),
      tx.transactionType,
      `"${tx.productName.replace(/"/g, '""')}"`,
      tx.category,
      tx.quantity,
      tx.unit || "Piece",
      tx.serialNumber || "",
      tx.reference || "",
      tx.performedBy || "",
      `"${(tx.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Meseret_Mare_Inventory_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transaction ledger exported as CSV");
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Bar */}
      <div className="p-4 bg-card rounded-2xl border border-border/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product, serial, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border/60 text-foreground h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background border-border/60 text-foreground text-xs h-9 w-36">
                <SelectValue placeholder="All Movement Types" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground text-xs">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="RECEIVE">↗ Inbound (Receive)</SelectItem>
                <SelectItem value="ISSUE">↙ Outbound (Issue)</SelectItem>
                <SelectItem value="RETURN">↩ Tool Return</SelectItem>
                <SelectItem value="ADJUSTMENT">± Count Adjustment</SelectItem>
                <SelectItem value="BOUGHT">🛒 Direct Purchase</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-background border-border/60 text-foreground text-xs h-9 w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground text-xs">
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="PUMP">Pumps</SelectItem>
                <SelectItem value="PUMP_EQUIPMENT">Pump Equipment</SelectItem>
                <SelectItem value="COMPANY_TOOL">Company Tools</SelectItem>
                <SelectItem value="WORK_TOOL">Work Tools</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="border-border text-foreground hover:bg-muted text-xs h-9 flex items-center gap-1.5 shrink-0"
        >
          <Download className="h-4 w-4" /> Export CSV Ledger
        </Button>
      </div>

      {/* Transaction Table */}
      <Card className="bg-card border border-border/60 shadow-sm rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <History className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <div className="font-bold text-sm text-foreground">No transactions found</div>
            <p className="text-xs max-w-sm mx-auto">
              No inventory transactions recorded matching your search or filters. Stock receipts, issues, and audit adjustments will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border/60">
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Date & Time</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Movement Type</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Product Name</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Category</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3 text-center">Quantity</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Serial / Tag</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Reference</TableHead>
                  <TableHead className="text-xs font-bold text-muted-foreground py-3">Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => {
                  const isIssue = tx.transactionType === "ISSUE";
                  const isAdjustmentNeg = tx.transactionType === "ADJUSTMENT" && tx.quantity < 0;
                  const isNegative = isIssue || isAdjustmentNeg;

                  return (
                    <TableRow key={tx.id} className="hover:bg-muted/30 border-b border-border/40 transition-colors">
                      <TableCell className="py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()}{" "}
                        <span className="text-[10px] text-muted-foreground/60">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            tx.transactionType === "RECEIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : tx.transactionType === "ISSUE"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : tx.transactionType === "RETURN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : tx.transactionType === "ADJUSTMENT"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {tx.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-semibold text-xs text-foreground">{tx.productName}</div>
                        {tx.notes && (
                          <div className="text-[10px] text-muted-foreground line-clamp-1 italic mt-0.5">
                            {tx.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-[9px]">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-center font-mono text-xs font-bold whitespace-nowrap">
                        <span className={isNegative ? "text-rose-600" : "text-emerald-600"}>
                          {isNegative ? (tx.quantity < 0 ? `${tx.quantity}` : `-${tx.quantity}`) : `+${tx.quantity}`} {tx.unit || "pcs"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                        {tx.serialNumber || "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground font-mono">
                        {tx.reference || "—"}
                      </TableCell>
                      <TableCell className="py-3 text-xs text-foreground font-medium">
                        {tx.performedBy || "Storekeeper"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
