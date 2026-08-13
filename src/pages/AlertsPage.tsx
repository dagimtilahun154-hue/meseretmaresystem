import { NotificationsList } from "@/components/NotificationsList";
import { TaskBoard } from "@/components/TaskBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, ClipboardList } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-heading">Alerts & Operations Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Role-gated operational notifications, task assignments, and activity tracking
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="alerts" className="w-full flex-1 flex flex-col space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts & Activity
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Task Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm p-4 overflow-hidden mt-0">
          <NotificationsList />
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm p-4 overflow-auto mt-0">
          <TaskBoard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
