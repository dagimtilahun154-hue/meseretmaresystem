import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketProvider";
import { getChannels, getChannelMessages, createChannel, getOrCreateDM, ChatChannel, ChatMessage, markChannelAsRead } from "@/lib/api/communication";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Hash, MessageSquare, Send, Plus, User, ArrowLeft, Loader2, Sparkles } from "lucide-react";

export default function TeamChatPage() {
  const { currentUser, users } = useAuth();
  const { socket, joinChannel, leaveChannel, sendMessage, refreshCounts } = useWebSocket();

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Channel Creation State
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("PUBLIC");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const data = await getChannels();
      setChannels(data);
      // Automatically select first public channel on first load
      if (data.length > 0 && !selectedChannel) {
        handleSelectChannel(data[0]);
      }
    } catch (err) {
      toast.error("Failed to load chat channels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // Handle incoming real-time messages
  useEffect(() => {
    if (!socket || !selectedChannel) return;

    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.channelId === selectedChannel.id) {
        setMessages((prev) => {
          // Avoid duplicate messages (e.g. if broadcast reaches sender)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, selectedChannel]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectChannel = async (channel: ChatChannel) => {
    if (selectedChannel) {
      leaveChannel(selectedChannel.id);
    }
    setSelectedChannel(channel);
    joinChannel(channel.id);

    setMessagesLoading(true);
    try {
      const msgs = await getChannelMessages(channel.id);
      setMessages(msgs);
      await markChannelAsRead(channel.id);
      refreshCounts();
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleStartDM = async (userId: string) => {
    try {
      const channel = await getOrCreateDM(userId);
      // Refresh channels so it appears in the sidebar if new
      const allChannels = await getChannels();
      setChannels(allChannels);
      handleSelectChannel(channel);
    } catch (err) {
      toast.error("Failed to open chat with user");
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const created = await createChannel({
        name: newChannelName.toLowerCase().replace(/\s+/g, "-"),
        type: newChannelType,
        memberIds: [currentUser?.id || ""],
      });
      toast.success(`Channel #${created.name} created!`);
      setCreateOpen(false);
      setNewChannelName("");
      fetchChannels();
      handleSelectChannel(created);
    } catch (err) {
      toast.error("Failed to create channel");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChannel) return;

    sendMessage(selectedChannel.id, messageText.trim());
    setMessageText("");
  };

  const getChannelDisplayName = (channel: ChatChannel) => {
    if (channel.type === "DM") {
      // Find the other member
      const otherMember = channel.members?.find((m) => m.user.id !== currentUser?.id);
      return otherMember?.user.displayName || "Direct Message";
    }
    return `#${channel.name}`;
  };

  return (
    <div className="flex-1 flex min-h-0 bg-background rounded-xl border shadow-sm overflow-hidden h-[calc(100vh-140px)]">
      {/* Channels Sidebar */}
      <div className="w-80 border-r bg-slate-50/50 dark:bg-slate-900/30 flex flex-col min-h-0">
        <div className="p-4 border-b flex items-center justify-between bg-card">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="font-bold text-sm tracking-tight text-foreground">Channels & Chat</span>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable channels list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2">Channels</span>
            {channels
              .filter((c) => c.type !== "DM")
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectChannel(c)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    selectedChannel?.id === c.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-foreground"
                  }`}
                >
                  <Hash className="h-3.5 w-3.5" />
                  {c.name}
                </button>
              ))}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2">Direct Messages</span>
            {channels
              .filter((c) => c.type === "DM")
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectChannel(c)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    selectedChannel?.id === c.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-foreground"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  {getChannelDisplayName(c)}
                </button>
              ))}
          </div>

          <div className="space-y-1 pt-2 border-t">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2">Team Directory</span>
            <div className="max-h-44 overflow-y-auto space-y-0.5">
              {users
                .filter((u) => u.id !== currentUser?.id)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDM(u.id)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-foreground transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {u.displayName}
                    </span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono uppercase">
                      {u.role}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        {selectedChannel ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  {selectedChannel.type === "DM" ? <User className="h-4 w-4 text-primary" /> : <Hash className="h-4 w-4 text-primary" />}
                  {getChannelDisplayName(selectedChannel)}
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  {selectedChannel.type === "DM" ? "Private Conversation" : `Public Channel for Team Discussion`}
                </span>
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[70%] ${
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <span className="font-semibold">{msg.sender?.displayName}</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-none border"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2 items-center bg-card">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message ${getChannelDisplayName(selectedChannel)}...`}
                className="text-xs flex-1"
                disabled={messagesLoading}
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={messagesLoading || !messageText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-slate-50/20 dark:bg-slate-900/5">
            <MessageSquare className="h-10 w-10 text-muted-foreground/60 mb-2 animate-bounce" />
            <p className="font-bold text-sm text-foreground">Select a Channel or Team Member</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">Choose a channel from the left sidebar or click a user name to begin a direct conversation.</p>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateChannel} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. general, support, logistics"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
