import React from "react";
import { Check, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: number;
  label: string;
  sublabel: string;
  role: string;
}

const STEPS: StepItem[] = [
  { id: 1, label: "Customer Intake", sublabel: "Sales Intake & GPS", role: "Sales Desk" },
  { id: 2, label: "Tech Sizing", sublabel: "Pump & Solar Specs", role: "Tech Manager" },
  { id: 3, label: "Finance Payment", sublabel: "Peachtree Verification", role: "Finance Team" },
  { id: 4, label: "Trip & Tools", sublabel: "Crew Roster & Checkouts", role: "Tech Team Leader" },
  { id: 5, label: "Installation & Return", sublabel: "On-site & Asset Returns", role: "Field Crew & TM" },
];

interface WorkflowStepperProps {
  currentStep: number; // 1 to 5
  statusLabel?: string;
  className?: string;
}

export function WorkflowStepper({ currentStep, statusLabel, className }: WorkflowStepperProps) {
  return (
    <div className={cn("w-full bg-card border rounded-xl p-4 space-y-4 shadow-sm", className)}>
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Order Workflow Progress
          </h3>
          <p className="text-[11px] text-muted-foreground">5-Step Lifecycle from Sales Intake to Installation Sign-off</p>
        </div>
        {statusLabel && (
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Current Stage: {statusLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 relative">
        {STEPS.map((step) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs transition-all",
                isDone && "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
                isCurrent && "bg-primary/10 border-primary text-primary font-bold shadow-sm ring-1 ring-primary/20",
                !isDone && !isCurrent && "bg-muted/30 border-border text-muted-foreground opacity-60"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isDone && "bg-emerald-600 text-white",
                  isCurrent && "bg-primary text-primary-foreground animate-pulse",
                  !isDone && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-tight">{step.label}</p>
                <p className="truncate text-[10px] text-muted-foreground">{step.role}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
