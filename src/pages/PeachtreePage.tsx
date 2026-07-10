import { useEffect, useState } from "react";
import { Server, Users, FileText, BookOpen, RefreshCcw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/StoreContext";
import { peachtreeDB } from "@/lib/db-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Customer = {
  id: string;
  name: string;
  balance: number;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  city?: string;
  state?: string;
  zip?: string;
  creditLimit?: number;
};

type Vendor = {
  id: string;
  name: string;
  balance: number;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  city?: string;
  state?: string;
  zip?: string;
  creditLimit?: number;
};

type Invoice = {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate?: string;
  total: number;
  status: string;
  items?: any;
};

type JournalEntry = {
  id: string;
  date: string;
  description: string;
  amount: number;
  lines: any;
};

type SyncedData = {
  customers: Customer[];
  vendors: Vendor[];
  invoices: Invoice[];
  journalEntries: JournalEntry[];
};

export default function PeachtreePage() {
  const { financeEntity } = useStore();
  const [data, setData] = useState<SyncedData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await peachtreeDB.getSyncedData();
      if (response && response.success !== false) {
        setData(response);
      } else {
        toast.error("Failed to load synced Peachtree data.");
      }
    } catch {
      toast.error("Could not reach backend to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [financeEntity]);

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading">Peachtree Data</h1>
              <p className="text-sm text-muted-foreground">Live automated sync from Peachtree 2010</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {financeEntity}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {!data ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading synced data...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="customers" className="flex gap-2"><Users className="h-4 w-4"/> Customers</TabsTrigger>
            <TabsTrigger value="vendors" className="flex gap-2"><DollarSign className="h-4 w-4"/> Vendors</TabsTrigger>
            <TabsTrigger value="invoices" className="flex gap-2"><FileText className="h-4 w-4"/> Invoices</TabsTrigger>
            <TabsTrigger value="journals" className="flex gap-2"><BookOpen className="h-4 w-4"/> Journals</TabsTrigger>
          </TabsList>

          {/* CUSTOMERS TAB */}
          <TabsContent value="customers" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Customers ({data.customers?.length || 0})</CardTitle>
                <CardDescription>Perfectly organized customer records from Peachtree.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Credit Limit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.customers?.length > 0 ? data.customers.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-xs">{c.id}</TableCell>
                          <TableCell className="font-semibold">{c.name}</TableCell>
                          <TableCell>{c.contact || "—"}</TableCell>
                          <TableCell>{c.phone || "—"}</TableCell>
                          <TableCell>{c.email || "—"}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{c.address || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {[c.city, c.state, c.zip].filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(c.creditLimit || 0)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatCurrency(c.balance)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No customers synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VENDORS TAB */}
          <TabsContent value="vendors" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendors ({data.vendors?.length || 0})</CardTitle>
                <CardDescription>Perfectly organized vendor records from Peachtree.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Credit Limit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.vendors?.length > 0 ? data.vendors.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium text-xs">{v.id}</TableCell>
                          <TableCell className="font-semibold">{v.name}</TableCell>
                          <TableCell>{v.contact || "—"}</TableCell>
                          <TableCell>{v.phone || "—"}</TableCell>
                          <TableCell>{v.email || "—"}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{v.address || "—"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {[v.city, v.state, v.zip].filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">{formatCurrency(v.creditLimit || 0)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatCurrency(v.balance)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No vendors synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoices ({data.invoices?.length || 0})</CardTitle>
                <CardDescription>Recent invoices synced from Peachtree.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices?.length > 0 ? data.invoices.map(i => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-xs">{i.id}</TableCell>
                          <TableCell>{formatDate(i.date)}</TableCell>
                          <TableCell>{i.customerName || i.customerId || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{i.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(i.total)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No invoices synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* JOURNALS TAB */}
          <TabsContent value="journals" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Journal Entries ({data.journalEntries?.length || 0})</CardTitle>
                <CardDescription>Recent financial journal entries.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Entry ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.journalEntries?.length > 0 ? data.journalEntries.map(j => (
                        <TableRow key={j.id}>
                          <TableCell className="font-medium text-xs">{j.id}</TableCell>
                          <TableCell>{formatDate(j.date)}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{j.description || "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(j.amount)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No journal entries synced yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      )}
    </div>
  );
}
