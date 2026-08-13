import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, MessageSquare, Send, Check, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { eodReportsDB } from "@/lib/db-service";
import { useAuth } from "@/context/AuthContext";

export interface EodActivityWidgetProps {
  eodReports?: any[];
  onReportSubmitted?: () => void;
  onOpenComments?: (report: any) => void;
  allowSubmission?: boolean;
}

export function EodActivityWidget({
  eodReports = [],
  onReportSubmitted,
  onOpenComments,
  allowSubmission = true,
}: EodActivityWidgetProps) {
  const { currentUser } = useAuth();
  const [workAccomplished, setWorkAccomplished] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getSuperiorLabel = () => {
    const role = currentUser?.role || "general";
    if (["technician", "fieldwork"].includes(role)) return "Technical Team Leader (TTL)";
    if (["accountant", "cashier"].includes(role)) return "Finance Admin";
    return "General Manager (GM)";
  };

  const handleSubmit = async () => {
    if (!workAccomplished.trim()) {
      toast.error("Please describe your work accomplished today.");
      return;
    }
    setSubmitting(true);
    try {
      await eodReportsDB.create({
        content: workAccomplished,
        workAccomplished,
        additionalComments,
        date: new Date().toISOString().slice(0, 10),
      });
      toast.success(`EOD report submitted to ${getSuperiorLabel()}!`);
      setWorkAccomplished("");
      setAdditionalComments("");
      if (onReportSubmitted) onReportSubmitted();
    } catch (e) {
      toast.error("Failed to submit EOD log.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border border-indigo-200 dark:border-indigo-900 bg-card shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Structured End-of-Day (EOD) Accomplishment Report
          </span>
          <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
            Routes to {getSuperiorLabel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {allowSubmission && (
          <div className="space-y-3 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Work Accomplished Today (Tasks & Operations)</Label>
              <Textarea
                placeholder="• Completed pump sizing for Gondar site
• Reconciled cash ledger and verified 4 invoices
• Replaced solar inverter on job #104"
                value={workAccomplished}
                onChange={(e) => setWorkAccomplished(e.target.value)}
                className="text-xs resize-none bg-background focus-visible:ring-indigo-500 min-h-[70px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Additional Comments, Notes & Blockers</Label>
              <Input
                placeholder="Optional notes for manager..."
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                className="text-xs bg-background h-8"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-indigo-500" /> Automatic departmental routing
              </span>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8"
              >
                <Send className="h-3 w-3 mr-1" />
                {submitting ? "Submitting..." : "Submit Daily EOD Report"}
              </Button>
            </div>
          </div>
        )}

        {/* Filed EOD List */}
        {eodReports.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Recent Filed Reports
            </h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {eodReports.slice(0, 5).map((rep: any) => (
                <div
                  key={rep.id}
                  className="p-2.5 rounded-lg border bg-muted/20 text-xs space-y-1 hover:border-indigo-500/40 transition-all"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-foreground flex items-center gap-1.5 font-bold">
                      <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                      {rep.submittedBy?.displayName || rep.submittedBy?.username}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {rep.department || rep.submittedBy?.department || "General"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{rep.workAccomplished || rep.content}</p>
                  {rep.additionalComments && (
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 italic">
                      Note: "{rep.additionalComments}"
                    </p>
                  )}
                  {onOpenComments && (
                    <div className="pt-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-indigo-600"
                        onClick={() => onOpenComments(rep)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Replies ({rep.comments?.length || 0})
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
