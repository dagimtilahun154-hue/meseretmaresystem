import React, { useEffect, useState } from "react";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, Notification } from "@/lib/api/communication";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, BellOff, CheckCircle2, Trash2, Calendar, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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
            <Bell className="h-5 w-5 text-primary" />
            Alerts & Activity
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 animate-pulse">
                {unreadCount} New
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">Keep track of direct assignments, EOD comments, and replies.</p>
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
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1 max-h-[600px]">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              onClick={() => handleMarkAsRead(notif.id, notif.link)}
              className={`cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/30 ${
                !notif.read ? "border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10" : ""
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <span className="mt-1">
                  {!notif.read ? (
                    <Circle className="h-2 w-2 fill-primary text-primary" />
                  ) : (
                    <Circle className="h-2 w-2 text-muted-foreground" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className={`text-sm font-semibold truncate ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {notif.title || "Notification"}
                    </h4>
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {notif.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                  onClick={(e) => handleDelete(notif.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {notifications.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl p-4 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-0.5">No notifications currently available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
