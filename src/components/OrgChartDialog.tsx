import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, User, ArrowDown, ChevronRight, Briefcase } from "lucide-react";

interface OrgChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrgChartDialog: React.FC<OrgChartDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0b1324] text-white border-white/15 p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <ShieldCheck className="h-6 w-6 text-sky-400" />
            Corporate Reporting Hierarchy & Org Chart
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Visual organizational structure and escalation paths for hierarchy requests, approvals, and reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* LEVEL 1: GENERAL MANAGER */}
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-4 rounded-xl shadow-lg border border-sky-400/30 text-center w-64 space-y-1">
              <Badge className="bg-white/20 text-white text-[10px]">Level 1 - Executive</Badge>
              <h3 className="font-bold text-sm text-white flex items-center justify-center gap-1.5">
                <User className="h-4 w-4" /> General Manager
              </h3>
              <p className="text-[11px] text-sky-100 font-mono">manager (GM)</p>
              <p className="text-[10px] text-slate-300">Final Approval Authority</p>
            </div>
            <ArrowDown className="h-6 w-6 text-sky-400 mt-2 animate-bounce" />
          </div>

          {/* LEVEL 2: DEPARTMENT HEADS */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/90 p-3 rounded-xl border border-purple-500/30 text-center space-y-1">
              <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/30">HR Dept</Badge>
              <h4 className="font-bold text-xs text-white">HR Manager</h4>
              <p className="text-[10px] text-slate-400 font-mono">hr / hr123</p>
              <p className="text-[10px] text-purple-300">Reports to: GM</p>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-500/30 text-center space-y-1">
              <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">Finance Dept</Badge>
              <h4 className="font-bold text-xs text-white">Finance Admin</h4>
              <p className="text-[10px] text-slate-400 font-mono">finance / finance123</p>
              <p className="text-[10px] text-emerald-300">Reports to: GM</p>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-amber-500/30 text-center space-y-1">
              <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">Technical Dept</Badge>
              <h4 className="font-bold text-xs text-white">Technical Manager</h4>
              <p className="text-[10px] text-slate-400 font-mono">field / field123</p>
              <p className="text-[10px] text-amber-300">Reports to: GM</p>
            </div>
          </div>

          {/* LEVEL 3: OPERATIONS & FIELD LEADS */}
          <div className="flex justify-end pr-4">
            <div className="w-2/3 bg-slate-950 p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Technical Operations Team
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Subordinate Chain</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-white/5">
                  <div>
                    <p className="text-xs font-semibold text-white">Technical Team Leader (TTL)</p>
                    <p className="text-[10px] text-slate-400 font-mono">ttl / ttl123</p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">Reports to: Tech Mgr</Badge>
                </div>

                <div className="pl-4 border-l-2 border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-white/5">
                    <div>
                      <p className="text-xs font-semibold text-white">Storekeeper (Inventory & Requests)</p>
                      <p className="text-[10px] text-slate-400 font-mono">store / store123</p>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-300 text-[10px]">Reports to: TTL</Badge>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-white/5">
                    <div>
                      <p className="text-xs font-semibold text-white">Fieldwork Engineers & Technicians</p>
                      <p className="text-[10px] text-slate-400 font-mono">fieldwork / technician</p>
                    </div>
                    <Badge className="bg-sky-500/20 text-sky-300 text-[10px]">Reports to: TTL</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
