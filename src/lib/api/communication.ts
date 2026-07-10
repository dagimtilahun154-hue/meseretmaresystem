import { apiClient } from "./client";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
  creatorId: string;
  assigneeId: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; displayName: string; username: string; department: string };
  assignee?: { id: string; displayName: string; username: string; department: string };
}

export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: { id: string; displayName: string; username: string; department: string };
}

export interface ChatChannel {
  id: string;
  name?: string;
  type: "PUBLIC" | "PRIVATE" | "DM";
  createdAt: string;
  updatedAt: string;
  members?: { user: { id: string; displayName: string; username: string } }[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; displayName: string; username: string; department?: string };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title?: string;
  content: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

// Tasks API
export async function getTasks(): Promise<Task[]> {
  const res = await apiClient.get<Task[]>("/tasks");
  return res.data;
}

export async function createTask(payload: { title: string; description?: string; priority?: string; dueDate?: string; assigneeId: string }): Promise<Task> {
  const res = await apiClient.post<Task>("/tasks", payload);
  return res.data;
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<Task> {
  const res = await apiClient.put<Task>(`/tasks/${id}`, payload);
  return res.data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}

// Comments API
export async function getComments(entityType: string, entityId: string): Promise<Comment[]> {
  const res = await apiClient.get<Comment[]>("/comments", {
    params: { entityType, entityId },
  });
  return res.data;
}

export async function addComment(payload: { entityType: string; entityId: string; content: string }): Promise<Comment> {
  const res = await apiClient.post<Comment>("/comments", payload);
  return res.data;
}

// Chat API
export async function getChannels(): Promise<ChatChannel[]> {
  const res = await apiClient.get<ChatChannel[]>("/chat/channels");
  return res.data;
}

export async function getChannelMessages(channelId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get<ChatMessage[]>(`/chat/channels/${channelId}/messages`);
  return res.data;
}

export async function createChannel(payload: { name?: string; type: string; memberIds: string[] }): Promise<ChatChannel> {
  const res = await apiClient.post<ChatChannel>("/chat/channels", payload);
  return res.data;
}

export async function getOrCreateDM(withUserId: string): Promise<ChatChannel> {
  const res = await apiClient.post<ChatChannel>("/chat/dm", { withUserId });
  return res.data;
}

export async function markChannelAsRead(channelId: string): Promise<void> {
  await apiClient.post(`/chat/channels/${channelId}/read`);
}

// Notifications API
export async function getNotifications(): Promise<Notification[]> {
  const res = await apiClient.get<Notification[]>("/notifications");
  return res.data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.post("/notifications/read-all");
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${id}`);
}
