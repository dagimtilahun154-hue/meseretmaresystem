import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Search, PlusCircle, FileText, Phone, MapPin, ShieldCheck, Droplets, ExternalLink, ArrowRight } from "lucide-react";
import { customersDB, Customer } from "@/lib/db-service";
import { CustomerDossierModal } from "@/components/customers/CustomerDossierModal";
import { toast } from "sonner";

import { useNavigate } from "react-router-dom";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const list = await customersDB.getAll();
      setCustomers(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error("Failed to load customers list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenDossier = (id: string) => {
    navigate(`/customers/${id}`);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      (c.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.address || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.installedPumpModel || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-heading">Customer Accounts & Master Files Hub</h2>
            <p className="text-sm text-muted-foreground">
              Unified 360° Customer Dossiers linking Pump Sizing, Sales, Peachtree Ledger, & Field Trips
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, phone, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm bg-background"
          />
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {filteredCustomers.length} Total Master Accounts
        </Badge>
      </div>

      {/* Customer Master List Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading customer master files...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border-dashed">
              No customer master files found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer File Name</TableHead>
                  <TableHead>Sold / Installed Pump</TableHead>
                  <TableHead>Phone / Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Peachtree Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-500 shrink-0" />
                        <div>
                          <span>{c.name}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono font-normal">ID: {c.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold">
                        <Droplets className="h-3 w-3 mr-1 text-amber-500" />
                        {c.installedPumpModel || "Solar Pump System"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" /> {c.phone || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" /> {c.address || c.city || "Location N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-600 text-white text-[10px]">
                        Peachtree Linked
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                        onClick={() => handleOpenDossier(c.id)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" /> Open Customer File
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Master Dossier Modal */}
      <CustomerDossierModal
        customerId={selectedCustomerId}
        open={dossierOpen}
        onOpenChange={setDossierOpen}
      />
    </div>
  );
}
