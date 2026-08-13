import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ClipboardList, ArrowRight, CheckCircle2, Circle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNotifications, Notification } from "@/lib/api/communication";
import { useAuth } from "@/context/AuthContext";

export function QuickAlertsTasksWidget() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadAlerts() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const data = await getNotifications();
        // Filter notifications relevant to current user ID or role
        const filtered = Array.isArray(data)
          ? data.filter(
              (n) =>
                n.userId === currentUser.id ||
                !n.userId ||
                n.content.toLowerCase().includes(currentUser.role.toLowerCase()) ||
                n.type === "GENERAL"
            )
          : [];
        setNotifications(filtered.slice(0, 3));
      } catch (err) {
        console.error("Failed to load quick alerts", err);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Card className="border border-border/60 shadow-sm bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            My Daily Tasks & Latest Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] animate-pulse">
                {unreadCount} New
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-primary hover:text-primary font-bold"
            onClick={() => navigate("/alerts")}
          >
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        {loading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Loading quick alerts...</div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => navigate(n.link || "/alerts")}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:bg-muted/40 ${
                  !n.read ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/20 border-border/40"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 font-bold text-foreground">
                    {!n.read ? (
                      <Circle className="h-2 w-2 text-amber-500 fill-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                    )}
                    {n.title || n.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{n.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>No pending unread alerts right now</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
