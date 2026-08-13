import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, WifiOff } from "lucide-react";

export interface HeaderActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary";
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
  gradientClass = "bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700",
  actions = [],
  queuedOfflineCount = 0,
}: DashboardHeaderBannerProps) {
  return (
    <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${gradientClass} p-6 rounded-2xl text-white shadow-xl relative overflow-hidden`}>
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <Badge className="bg-white/20 text-white border-none text-[10px] font-bold">
            {roleBadge}
          </Badge>
          {queuedOfflineCount > 0 && (
            <Badge className="bg-amber-400 text-amber-950 border-none text-[10px] font-bold flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> {queuedOfflineCount} Offline Queued
            </Badge>
          )}
          <span className="text-xs opacity-80">· SolarFlow Operating Desk</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        <p className="text-xs opacity-90 mt-1 max-w-xl leading-relaxed">
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
                className={act.className || "bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md text-xs h-9"}
              >
                {Icon && <Icon className="h-4 w-4 mr-1.5" />}
                {act.label}
                {act.badgeCount !== undefined && act.badgeCount > 0 && (
                  <Badge className="ml-1.5 bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0">
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
