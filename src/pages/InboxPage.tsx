import ApprovalsInbox from "@/components/ApprovalsInbox";

export default function InboxPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-heading">Inbox & Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Manage and track your requests, workflow tasks, and approvals.
        </p>
      </div>
      <ApprovalsInbox />
    </div>
  );
}
