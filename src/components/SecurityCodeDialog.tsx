import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { toast } from "sonner";

interface SecurityCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function SecurityCodeDialog({ open, onOpenChange, onVerified, title = "Security Verification", description = "Enter the admin security code to proceed with this action." }: SecurityCodeDialogProps) {
  const { verifySecurityCode } = useAuth();
  const [code, setCode] = useState("");

  const handleVerify = () => {
    if (verifySecurityCode(code)) {
      setCode("");
      onOpenChange(false);
      onVerified();
    } else {
      toast.error("Invalid security code");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setCode(""); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Security Code</Label>
            <Input
              type="password"
              placeholder="Enter admin code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setCode(""); onOpenChange(false); }}>Cancel</Button>
            <Button onClick={handleVerify}>Verify</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
