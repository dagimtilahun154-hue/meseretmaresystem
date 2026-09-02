import React, { useState, useEffect } from "react";
import { useAuth, AppUser } from "@/context/AuthContext";
import { getTasks, createTask, updateTask, deleteTask, getComments, addComment, Task, Comment } from "@/lib/api/communication";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle, MessageSquare, Clock, ArrowRight, User, Trash2, Calendar, CheckCircle2, Circle } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const COLUMNS = [
  { id: "TODO", title: "To Do", color: "border-t-slate-400 dark:border-t-slate-600" },
  { id: "IN_PROGRESS", title: "In Progress", color: "border-t-blue-500 dark:border-t-blue-600" },
  { id: "REVIEW", title: "Review", color: "border-t-yellow-500 dark:border-t-yellow-600" },
  { id: "DONE", title: "Done", color: "border-t-green-500 dark:border-t-green-600" },
];

export function TaskBoard() {
  const { currentUser, users } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Task Creation State
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAssignee) {
      toast.error("Title and Assignee are required");
      return;
    }

    try {
      await createTask({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        assigneeId: newAssignee,
        dueDate: newDueDate || undefined,
      });
      toast.success("Task assigned successfully");
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewPriority("MEDIUM");
      setNewAssignee("");
      setNewDueDate("");
      fetchTasks();
    } catch (err) {
      toast.error("Failed to assign task");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    try {
      await updateTask(taskId, { status: newStatus });
      toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
      fetchTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      toast.error("Failed to move task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  const loadComments = async (taskId: string) => {
    setCommentsLoading(true);
    try {
      const data = await getComments("TASK", taskId);
      setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    loadComments(task.id);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedTask) return;

    try {
      const added = await addComment({
        entityType: "TASK",
        entityId: selectedTask.id,
        content: newComment,
      });
      setComments((prev) => [...prev, added]);
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      toast.error("Failed to add comment");
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Task Board</h3>
          <p className="text-sm text-muted-foreground">Assign and monitor work progress for your department.</p>
        </div>
        {currentUser && (currentUser.role === "manager" || currentUser.role === "fieldwork" || currentUser.role === "finance") && (
          <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Assign Task
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading task board...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0 overflow-y-auto">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) handleStatusChange(taskId, col.id as Task["status"]);
                }}
                className="flex flex-col bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-border transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-900/60"
              >
                <div className="flex items-center justify-between border-b pb-2 mb-3 border-border">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.id === 'DONE' ? 'bg-green-500' : col.id === 'REVIEW' ? 'bg-yellow-500' : col.id === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                    {col.title}
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {colTasks.length}
                  </Badge>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto min-h-[120px] max-h-[600px] pr-1">
                  {colTasks.map((task) => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                      onClick={() => handleTaskClick(task)}
                      className={`cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all border-t-4 ${col.color}`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={PRIORITY_COLORS[task.priority]} variant="outline">
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm tracking-tight text-foreground line-clamp-2">
                          {task.title}
                        </h4>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignee?.displayName}
                          </span>
                          {task.description && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px]">
                              Details
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="h-20 flex items-center justify-center border border-dashed rounded-xl border-muted text-[11px] text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Describe the action required"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Detailed Description</Label>
              <Textarea
                id="desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Include step-by-step instructions or references"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="assignee">Assign To</Label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => u.id !== currentUser?.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.displayName} ({u.role.toUpperCase()})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Assign Work</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Details & Comments Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-xl flex flex-col h-[85vh]">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={PRIORITY_COLORS[selectedTask.priority]}>{selectedTask.priority}</Badge>
                  <Badge variant="secondary">{selectedTask.status.replace("_", " ")}</Badge>
                  {selectedTask.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" /> Due {new Date(selectedTask.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl mt-2">{selectedTask.title}</DialogTitle>
                <div className="text-xs text-muted-foreground flex gap-4 mt-1 border-b pb-3">
                  <span>Assigned to: <strong>{selectedTask.assignee?.displayName}</strong></span>
                  <span>Assigned by: <strong>{selectedTask.creator?.displayName}</strong></span>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground font-semibold block uppercase">Description</span>
                  <p className="text-sm bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border leading-relaxed whitespace-pre-wrap">
                    {selectedTask.description || "No description provided."}
                  </p>
                </div>

                {/* Status transitions */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-semibold block uppercase">Change Status</span>
                  <div className="flex flex-wrap gap-2">
                    {COLUMNS.filter((c) => c.id !== selectedTask.status).map((col) => (
                      <Button
                        key={col.id}
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(selectedTask.id, col.id as Task["status"])}
                        className="text-xs"
                      >
                        Move to {col.title}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs text-muted-foreground font-semibold block uppercase flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Discussion / Progress Logs
                  </span>

                  <div className="space-y-2">
                    {commentsLoading ? (
                      <div className="text-center text-xs text-muted-foreground py-4">Loading discussion...</div>
                    ) : comments.map((c) => (
                      <div key={c.id} className="text-xs bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-border/60">
                        <div className="flex justify-between font-semibold mb-0.5">
                          <span>{c.author?.displayName}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{c.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && !commentsLoading && (
                      <div className="text-center text-xs text-muted-foreground/80 py-4 italic">No comments yet. Start the discussion below.</div>
                    )}
                  </div>

                  <div className="flex gap-2 items-start mt-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Post a progress report or comment..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                    <Button onClick={handlePostComment} size="sm" className="h-9 px-3">
                      Post
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-3 flex justify-between items-center mt-auto">
                {currentUser?.id === selectedTask.creatorId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Task
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
