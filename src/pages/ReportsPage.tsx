import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { formatCurrency } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Printer, Crown, ClipboardList, Send, MessageSquare, Share2, CheckCircle2, UserCheck, Calendar, Filter, Building, Sparkles, Truck, ExternalLink } from "lucide-react";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { eodReportsDB } from "@/lib/db-service";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ReportsPage() {
  const { sales, products, fieldWorks } = useStore();
  const { currentUser, hasAccess } = useAuth();
  const [period, setPeriod] = useState("all");
  const [eodReports, setEodReports] = useState<any[]>([]);
  const [loadingEod, setLoadingEod] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const fieldWorkDailyReportsList = useMemo(() => {
    const list: any[] = [];
    (fieldWorks || []).forEach((fw: any) => {
      if (Array.isArray(fw.dailyReports)) {
        fw.dailyReports.forEach((rep: any) => {
          list.push({
            ...rep,
            fieldWorkId: fw.id,
            fieldWorkTitle: fw.title,
            customerName: fw.customerName,
            location: fw.location,
            status: fw.status,
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [fieldWorks]);

  // State for GM / Superior reply box
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [forwardNote, setForwardNote] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  const fetchEod = async () => {
    setLoadingEod(true);
    try {
      const data = await eodReportsDB.getAll();
      setEodReports(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load EOD accomplishment reports");
    } finally {
      setLoadingEod(false);
    }
  };

  useEffect(() => {
    fetchEod();
  }, []);

  const handleSendReply = async (reportId: string) => {
    const text = replyText[reportId];
    if (!text || !text.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }
    setSubmittingReply(reportId);
    try {
      await eodReportsDB.addComment(reportId, text);
      toast.success("Reply sent! The author has been notified.");
      setReplyText({ ...replyText, [reportId]: "" });
      fetchEod();
    } catch (e) {
      toast.error("Failed to send reply.");
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleForwardToGm = async (reportId: string) => {
    const note = forwardNote[reportId] || "Departmental summary review attached.";
    try {
      await eodReportsDB.forwardToGm(reportId, note);
      toast.success("Report consolidated & escalated to General Manager!");
      setForwardNote({ ...forwardNote, [reportId]: "" });
      fetchEod();
    } catch (e) {
      toast.error("Failed to escalate report.");
    }
  };

  const filteredSales = useMemo(() => {
    if (period === "all") return sales;
    const now = new Date();
    return sales.filter((s) => {
      const d = new Date(s.date);
      if (period === "today") return d.toDateString() === now.toDateString();
      if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "year") return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [sales, period]);

  const totalSales = filteredSales.reduce((s, sale) => s + sale.totalSell, 0);
  const totalProfit = filteredSales.reduce((s, sale) => s + sale.profit, 0);
  const totalCost = filteredSales.reduce((s, sale) => s + sale.totalCost, 0);

  const salesByDate = useMemo(() => {
    const map: Record<string, { sales: number; profit: number }> = {};
    filteredSales.forEach((s) => {
      if (!map[s.date]) map[s.date] = { sales: 0, profit: 0 };
      map[s.date].sales += s.totalSell;
      map[s.date].profit += s.profit;
    });
    return Object.entries(map).map(([date, v]) => ({ date: date.slice(5), ...v }));
  }, [filteredSales]);

  // EOD Filtering
  const filteredEodReports = useMemo(() => {
    return eodReports.filter((r) => {
      const matchesDept = departmentFilter === "ALL" || r.department?.toUpperCase() === departmentFilter;
      const q = searchFilter.toLowerCase();
      const matchesSearch =
        !searchFilter ||
        r.submittedBy?.displayName?.toLowerCase().includes(q) ||
        r.submittedBy?.username?.toLowerCase().includes(q) ||
        (r.workAccomplished || r.content || "").toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [eodReports, departmentFilter, searchFilter]);

  const forwardedToGmReports = useMemo(() => {
    return eodReports.filter((r) => r.status === "FORWARDED_TO_GM" || r.targetRole === "manager");
  }, [eodReports]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Executive Reports & Daily Staff Accomplishments Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Review user daily work logs, departmental escalations, GM feedback, and financial performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <Tabs defaultValue="eod-workspace" className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="eod-workspace" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Staff Accomplishments Logs
          </TabsTrigger>
          <TabsTrigger value="financial-analytics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Financial Analytics
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: EOD ACCOMPLISHMENTS WORKSPACE */}
        <TabsContent value="eod-workspace" className="space-y-4">
          <Tabs defaultValue={hasAccess(["manager"]) ? "consolidated" : "all-reports"} className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/60 p-1">
                {hasAccess(["manager"]) && (
                  <TabsTrigger value="consolidated" className="flex items-center gap-1.5 text-xs">
                    <Crown className="h-3.5 w-3.5 text-amber-500" /> Departmental Escalations ({forwardedToGmReports.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="all-reports" className="flex items-center gap-1.5 text-xs">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" /> Individual Staff Accomplishments ({filteredEodReports.length})
                </TabsTrigger>
                <TabsTrigger value="fieldwork-eod" className="flex items-center gap-1.5 text-xs">
                  <Truck className="h-3.5 w-3.5 text-purple-500" /> Field Work EOD Reports ({fieldWorkDailyReportsList.length})
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search employee or task..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-48 h-8 text-xs bg-background"
                />
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs bg-background"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    <SelectItem value="TECHNICAL">Technical & Field</SelectItem>
                    <SelectItem value="FINANCE">Finance</SelectItem>
                    <SelectItem value="STORE">Inventory & Store</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sub-tab: GM Consolidated Department Reports */}
            {hasAccess(["manager"]) && (
              <TabsContent value="consolidated" className="space-y-4">
                {forwardedToGmReports.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground text-sm border-dashed">
                    No forwarded departmental summary reports at the moment.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {forwardedToGmReports.map((rep) => (
                      <Card key={rep.id} className="border-amber-500/40 bg-card shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3 border-b border-amber-500/20 bg-amber-500/5">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">
                              FORWARDED TO GM
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {rep.date}
                            </span>
                          </div>
                          <CardTitle className="text-sm font-bold mt-1 flex items-center justify-between">
                            <span>{rep.submittedBy?.displayName || rep.submittedBy?.username}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {rep.department}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3 space-y-3">
                          {rep.departmentSummary && (
                            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                              <span className="font-bold text-amber-800 dark:text-amber-300 block text-[10px] uppercase mb-0.5">
                                Department Lead Note:
                              </span>
                              <p className="text-amber-900 dark:text-amber-200 italic">"{rep.departmentSummary}"</p>
                            </div>
                          )}

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Work Accomplished:</span>
                            <p className="text-xs text-foreground bg-muted/30 p-2 rounded border whitespace-pre-wrap">
                              {rep.workAccomplished || rep.content}
                            </p>
                          </div>

                          {/* Reply Box for GM */}
                          <div className="pt-2 border-t space-y-2">
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              General Manager Reply / Instructions:
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Type GM instructions..."
                                value={replyText[rep.id] || ""}
                                onChange={(e) => setReplyText({ ...replyText, [rep.id]: e.target.value })}
                                className="text-xs h-8 bg-background"
                              />
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold h-8 text-xs"
                                onClick={() => handleSendReply(rep.id)}
                                disabled={submittingReply === rep.id}
                              >
                                <Send className="h-3 w-3 mr-1" /> Reply
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {/* Sub-tab: All Individual Staff Accomplishments */}
            <TabsContent value="all-reports" className="space-y-4">
              {loadingEod ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading accomplishment logs...</div>
              ) : filteredEodReports.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm border-dashed">
                  No accomplishment logs found for the selected filter.
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredEodReports.map((rep) => (
                    <Card key={rep.id} className="border border-border/60 shadow-sm hover:border-primary/40 transition-all">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b bg-muted/10">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {rep.submittedBy?.displayName?.slice(0, 2).toUpperCase() || "US"}
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold">
                              {rep.submittedBy?.displayName || rep.submittedBy?.username}
                            </CardTitle>
                            <CardDescription className="text-[11px]">
                              {rep.department} · Submitted for {rep.date}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            Target: {rep.targetRole || "Manager"}
                          </Badge>
                          {rep.status === "FORWARDED_TO_GM" && (
                            <Badge className="bg-amber-500 text-slate-950 text-[9px]">
                              Forwarded to GM
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3 space-y-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Accomplishments Today:
                          </span>
                          <p className="text-xs text-foreground bg-muted/20 p-3 rounded-lg border whitespace-pre-wrap leading-relaxed">
                            {rep.workAccomplished || rep.content}
                          </p>
                        </div>

                        {rep.additionalComments && (
                          <div className="text-xs bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 block text-[10px] uppercase">
                              Additional Notes / Blockers:
                            </span>
                            <p className="text-muted-foreground italic">"{rep.additionalComments}"</p>
                          </div>
                        )}

                        {/* Forward option for Department Leads */}
                        {hasAccess(["ttl", "finance", "admin"]) && rep.status !== "FORWARDED_TO_GM" && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                              Department Lead Review (Attach summary & forward to GM):
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Attach departmental summary note for General Manager..."
                                value={forwardNote[rep.id] || ""}
                                onChange={(e) => setForwardNote({ ...forwardNote, [rep.id]: e.target.value })}
                                className="text-xs h-8 bg-background"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs font-bold shrink-0"
                                onClick={() => handleForwardToGm(rep.id)}
                              >
                                <Share2 className="h-3 w-3 mr-1" /> Forward to GM
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Existing Replies Thread */}
                        {rep.comments && rep.comments.length > 0 && (
                          <div className="space-y-1.5 border-t pt-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-primary" /> Manager / Superior Replies ({rep.comments.length})
                            </span>
                            <div className="space-y-1.5 pl-3 border-l-2 border-primary/30">
                              {rep.comments.map((c: any) => (
                                <div key={c.id} className="text-xs bg-muted/40 p-2 rounded">
                                  <span className="font-bold text-primary mr-1 font-mono">{c.user?.displayName}:</span>
                                  <span>{c.comment}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reply Input Box */}
                        <div className="pt-2 border-t flex gap-2">
                          <Input
                            placeholder="Write feedback / reply to report author..."
                            value={replyText[rep.id] || ""}
                            onChange={(e) => setReplyText({ ...replyText, [rep.id]: e.target.value })}
                            className="text-xs h-8 bg-background"
                          />
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground font-bold h-8 text-xs shrink-0"
                            onClick={() => handleSendReply(rep.id)}
                            disabled={submittingReply === rep.id}
                          >
                            <Send className="h-3 w-3 mr-1" /> Reply
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sub-tab: Field Work On-Site EOD Reports */}
            <TabsContent value="fieldwork-eod" className="space-y-5">
              {fieldWorkDailyReportsList.length === 0 ? (
                <Card className="p-10 text-center border-dashed">
                  <Truck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No Field Work EOD daily progress reports submitted yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Reports will appear here once field crews submit their end-of-day progress.</p>
                </Card>
              ) : (
                <div className="space-y-5">
                  {fieldWorkDailyReportsList.map((rep: any, repIdx: number) => (
                    <Card key={rep.id} className="border-2 border-purple-500/20 bg-gradient-to-br from-slate-50 to-purple-50/20 dark:from-slate-900/60 dark:to-purple-950/15 shadow-md overflow-hidden">
                      {/* Report Header */}
                      <CardHeader className="pb-3 border-b border-purple-500/20 bg-purple-600/8 dark:bg-purple-900/25">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-purple-600 text-white font-bold text-[10px] px-2.5 py-1">
                              FIELD WORK EOD
                            </Badge>
                            <div>
                              <CardTitle className="text-sm font-bold">{rep.customerName || rep.fieldWorkTitle}</CardTitle>
                              <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {rep.date ? new Date(rep.date).toLocaleString() : 'Recent'}
                                <span className="text-muted-foreground">•</span>
                                TTL: <strong>{rep.submittedBy}</strong>
                                <span className="text-muted-foreground">•</span>
                                Location: <strong>{rep.location}</strong>
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] text-purple-700 dark:text-purple-400 font-bold border-purple-500/30 hover:bg-purple-500/10 flex items-center gap-1"
                            onClick={() => window.location.hash = "#/fieldwork"}
                          >
                            <ExternalLink className="h-3 w-3" /> View in Field Work
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-5 space-y-4">
                        {/* Achievements */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Today's Work & Achievements</span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-emerald-500/20 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-sm">
                            {rep.achievements || rep.content}
                          </div>
                        </div>

                        {/* Challenges */}
                        {rep.challenges && (
                          <div className="space-y-1.5">
                            <span className="font-bold text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide">Site Challenges:</span>
                            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-500/25 p-3 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                              {rep.challenges}
                            </div>
                          </div>
                        )}

                        {/* Tomorrow's Plan */}
                        {rep.nextDayPlan && (
                          <div className="space-y-1.5">
                            <span className="font-bold text-xs text-sky-700 dark:text-sky-400 uppercase tracking-wide">Tomorrow's Plan:</span>
                            <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl border border-sky-500/25 p-3 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                              {rep.nextDayPlan}
                            </div>
                          </div>
                        )}

                        {/* Photos */}
                        {((Array.isArray(rep.photos) && rep.photos.length > 0) || rep.imageUrl) && (
                          <div className="space-y-1.5">
                            <span className="font-bold text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                              Daily Site Photos ({(rep.photos && rep.photos.length > 0 ? rep.photos : [rep.imageUrl]).length})
                            </span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {(rep.photos && rep.photos.length > 0 ? rep.photos : [rep.imageUrl]).map((imgUrl: string, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-slate-800/50 rounded-xl border-2 border-indigo-500/15 overflow-hidden shadow-sm">
                                  <div className="h-24 bg-muted overflow-hidden flex items-center justify-center">
                                    {imgUrl.startsWith("http") || imgUrl.startsWith("/") ? (
                                      <img src={imgUrl} alt={`Progress ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }} />
                                    ) : null}
                                  </div>
                                  <div className="p-1.5 text-center">
                                    <span className="text-[10px] font-bold text-muted-foreground">Photo #{idx + 1}</span>
                                    <p className="text-[9px] text-muted-foreground truncate font-mono">{imgUrl}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* TAB 2: FINANCIAL & BUSINESS ANALYTICS */}
        <TabsContent value="financial-analytics" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(totalSales)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Cost</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(totalCost)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Profit</p><p className="text-xl font-bold font-heading mt-1 text-emerald-600 dark:text-emerald-400">{formatCurrency(totalProfit)}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">Sales & Profit Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="hsl(142, 60%, 40%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
