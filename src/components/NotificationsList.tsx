import React, { useEffect, useState } from "react";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, Notification } from "@/lib/api/communication";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, BellOff, CheckCircle2, Trash2, Calendar, Circle, ShieldAlert, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import { useWebSocket } from "@/context/WebSocketProvider";

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { socket } = useWebSocket();
  const navigate = useNavigate();

  const fetchNotifications = async (showLoading = false) => {
    if (!currentUser) return;
    if (showLoading) setLoading(true);
    try {
      const data = await getNotifications();
      // Strict Role & User Gated Filtering
      const filtered = (data || []).filter((n: any) => {
        if (n.userId === currentUser.id) return true;
        const role = (currentUser.role || "").toLowerCase();
        const titleAndContent = `${n.title || ""} ${n.content || ""} ${n.type || ""}`.toLowerCase();

        if (role === "storekeeper" && (titleAndContent.includes("stock") || titleAndContent.includes("product") || titleAndContent.includes("inventory"))) return true;
        if (role === "finance" && (titleAndContent.includes("pay") || titleAndContent.includes("vat") || titleAndContent.includes("expense") || titleAndContent.includes("bank"))) return true;
        if ((role === "fieldwork" || role === "ttl") && (titleAndContent.includes("field") || titleAndContent.includes("job") || titleAndContent.includes("task") || titleAndContent.includes("sizing"))) return true;
        if (role === "manager" || role === "admin") return true;

        return false;
      });
      setNotifications(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 4000);

    if (socket) {
      const handleNewNotification = () => fetchNotifications(false);
      socket.on("new_notification", handleNewNotification);
      socket.on("refresh_notifications", handleNewNotification);
      return () => {
        clearInterval(interval);
        socket.off("new_notification", handleNewNotification);
        socket.off("refresh_notifications", handleNewNotification);
      };
    }

    return () => clearInterval(interval);
  }, [currentUser, socket]);

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      if (link) {
        navigate(link);
      }
    } catch (err) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to clear notifications");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification removed");
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-3 border-border">
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            Role-Gated Alerts & Operational Activity
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 animate-pulse">
                {unreadCount} New
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Strictly filtered notifications for {currentUser?.displayName || currentUser?.username} ({currentUser?.role?.toUpperCase()})
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-xs">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading alerts...
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-xl bg-muted/10 space-y-2">
          <BellOff className="h-10 w-10 text-muted-foreground/60" />
          <h4 className="font-bold text-sm">No Alerts Right Now</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            You are all caught up! Operational activity and task assignments specifically permitted for your role will appear here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1 max-h-[600px]">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              onClick={() => handleMarkAsRead(notif.id, notif.link)}
              className={`cursor-pointer transition-all hover:border-amber-500/50 hover:shadow-md ${
                !notif.read ? "bg-amber-500/5 border-amber-500/30" : "bg-card border-border/60"
              }`}
            >
              <CardContent className="p-3.5 flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {!notif.read ? (
                      <Circle className="h-2 w-2 text-amber-500 fill-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-bold text-xs text-foreground">
                      {notif.title || notif.type}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-mono">
                      {notif.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">{notif.content}</p>
                  <p className="text-[10px] text-muted-foreground/70 pl-5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={(e) => handleDelete(notif.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
