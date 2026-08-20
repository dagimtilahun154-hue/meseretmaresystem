import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm font-semibold text-foreground">Meseret Mare ERP</span>
            </div>
            
            <button
              onClick={() => {
                const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs text-muted-foreground border border-border transition-all cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-primary" />
              <span>Search commands & pages...</span>
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-background">
                Ctrl + K
              </Badge>
            </button>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}
