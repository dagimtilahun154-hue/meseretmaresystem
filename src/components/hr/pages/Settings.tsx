import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hrDB } from "@/lib/db-service";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function HRSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [sData, dData] = await Promise.all([
      hrDB.getSettings(),
      hrDB.getDepartments()
    ]);
    if (sData) setSettings(sData);
    if (dData) setDepartments(dData);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    const success = await hrDB.saveSettings(settings);

    setLoading(false);
    if (!success) {
      toast({ title: "Error", description: "Could not update settings.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Settings updated successfully." });
    }
  };

  const handleAddDept = async () => {
    if (!newDeptName) return;
    const success = await hrDB.saveDepartment({ id: uuidv4(), name: newDeptName });
    if (!success) {
      toast({ title: "Error", description: "Could not add department.", variant: "destructive" });
    } else {
      setNewDeptName("");
      fetchData();
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      const success = await hrDB.deleteDepartment(id);
      if (success) {
        toast({ title: "Success", description: "Department deleted successfully." });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete department.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete department.", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Settings</h1>
        <p className="text-muted-foreground">Configure attendance rules, departments, and company profile.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Rules</CardTitle>
            <CardDescription>Define working hours and grace periods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work Start Time</Label>
                <Input 
                  type="time" 
                  value={settings.work_start_time || ""} 
                  onChange={e => setSettings({...settings, work_start_time: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Work End Time</Label>
                <Input 
                  type="time" 
                  value={settings.work_end_time || ""} 
                  onChange={e => setSettings({...settings, work_end_time: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grace Period (Minutes)</Label>
              <Input 
                type="number" 
                value={settings.grace_period_minutes || 0} 
                onChange={e => setSettings({...settings, grace_period_minutes: parseInt(e.target.value)})} 
              />
            </div>
            <Button onClick={handleSaveSettings} disabled={loading} className="w-full mt-4">Save Rules</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
            <CardDescription>Management of your company profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                value={settings.company_name || ""} 
                onChange={e => setSettings({...settings, company_name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Company Logo URL</Label>
              <Input 
                placeholder="https://..." 
                value={settings.company_logo || ""} 
                onChange={e => setSettings({...settings, company_logo: e.target.value})} 
              />
            </div>
            <Button onClick={handleSaveSettings} disabled={loading} className="w-full mt-4">Update Profile</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Departments Management</CardTitle>
            <CardDescription>Manage company departments for worker assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input 
                placeholder="New Department Name..." 
                value={newDeptName} 
                onChange={e => setNewDeptName(e.target.value)} 
                className="max-w-xs"
              />
              <Button onClick={handleAddDept}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDept(d.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {departments.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center italic text-muted-foreground">No departments configured.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
