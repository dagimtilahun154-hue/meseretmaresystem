import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export interface StatCardItem {
  key: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradientClass: string;
  badge?: string;
}

export interface StatCardGridProps {
  cards: StatCardItem[];
  expandedCard?: string | null;
  onToggleCard?: (key: string) => void;
  gridColsClass?: string;
}

export function StatCardGrid({
  cards,
  expandedCard,
  onToggleCard,
  gridColsClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
}: StatCardGridProps) {
  return (
    <div className={`grid ${gridColsClass} gap-4`}>
      {cards.map((c) => {
        const Icon = c.icon;
        const isExpanded = expandedCard === c.key;
        return (
          <Card
            key={c.key}
            onClick={() => onToggleCard && onToggleCard(c.key)}
            className={`cursor-pointer transition-all hover:scale-[1.02] border-0 shadow-md ${c.gradientClass} text-white relative overflow-hidden group`}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium opacity-90">{c.label}</span>
                {c.badge && (
                  <Badge className="bg-white/20 text-white text-[9px] border-none px-1.5 py-0.5 font-bold">
                    {c.badge}
                  </Badge>
                )}
              </div>
              <div className="text-lg font-black tracking-tight mb-1">{c.value}</div>
              {c.subtext && (
                <div className="flex items-center justify-between text-[10px] opacity-80 pt-1">
                  <span className="truncate">{c.subtext}</span>
                  {onToggleCard && (
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
