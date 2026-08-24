import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string) => void;
  counts: { notifications: number; tasks: number; chat: number };
  refreshCounts: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [counts, setCounts] = useState({ notifications: 0, tasks: 0, chat: 0 });

  const refreshCounts = async () => {
    if (!currentUser) return;
    try {
      const response = await apiClient.get('/notifications/counts');
      setCounts(response.data);
    } catch (error) {
      console.error("Failed to fetch notification counts", error);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = "http://localhost:4000";
    const socketInstance = io(socketUrl, {
      query: { userId: currentUser.id },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 10000,
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("connect_error", () => {
      // Quietly fallback without breaking UI
      setIsConnected(false);
    });

    socketInstance.on("new_message", (message) => {
      if (message.senderId !== currentUser.id) {
        toast(`New message: ${message.content.substring(0, 30)}...`);
        refreshCounts();
      }
    });

    setSocket(socketInstance);
    
    // Initial fetch of counts
    refreshCounts();

    return () => {
      socketInstance.disconnect();
    };
  }, [currentUser]);

  const joinChannel = (channelId: string) => {
    if (socket) {
      socket.emit("join_channel", channelId);
    }
  };

  const leaveChannel = (channelId: string) => {
    if (socket) {
      socket.emit("leave_channel", channelId);
    }
  };

  const sendMessage = (channelId: string, content: string) => {
    if (socket && currentUser) {
      socket.emit("send_message", {
        channelId,
        senderId: currentUser.id,
        content,
      });
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, joinChannel, leaveChannel, sendMessage, counts, refreshCounts }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}
