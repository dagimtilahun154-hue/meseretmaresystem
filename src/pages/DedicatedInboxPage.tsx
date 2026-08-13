import ApprovalsInbox from "@/components/ApprovalsInbox";

export default function DedicatedInboxPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Requests</h2>
      </div>
      <div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm p-4 overflow-hidden">
        <ApprovalsInbox />
      </div>
    </div>
  );
}
