import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, WifiOff, Calendar, ShieldCheck } from "lucide-react";

export interface HeaderActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary" | "ghost";
  badgeCount?: number;
  className?: string;
}

export interface DashboardHeaderBannerProps {
  roleBadge: string;
  title: string;
  description: string;
  gradientClass?: string;
  actions?: HeaderActionButton[];
  queuedOfflineCount?: number;
}

export function DashboardHeaderBanner({
  roleBadge,
  title,
  description,
  gradientClass = "bg-gradient-to-r from-[#2cb563] via-[#15803d] to-[#14532d]",
  actions = [],
  queuedOfflineCount = 0,
}: DashboardHeaderBannerProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${gradientClass} p-5 rounded-2xl text-white shadow-lg relative overflow-hidden`}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-white/20 hover:bg-white/25 text-white border-none text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
            {roleBadge}
          </Badge>
          <span className="text-xs text-white/80 flex items-center gap-1 font-medium">
            <Calendar className="h-3.5 w-3.5 text-white/80" /> {currentDate}
          </span>
          {queuedOfflineCount > 0 && (
            <Badge className="bg-amber-400 text-amber-950 border-none text-[10px] font-bold flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> {queuedOfflineCount} Offline Queued
            </Badge>
          )}
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-white">{title}</h2>
        <p className="text-xs text-white/90 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <Button
                key={idx}
                onClick={act.onClick}
                variant={act.variant || "default"}
                size="sm"
                className={act.className || "bg-white text-emerald-950 hover:bg-white/90 font-bold shadow-sm text-xs h-8"}
              >
                {Icon && <Icon className="h-3.5 w-3.5 mr-1" />}
                <span>{act.label}</span>
                {typeof act.badgeCount === "number" && act.badgeCount > 0 && (
                  <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-[10px] h-4">
                    {act.badgeCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

