import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    // In a real app, verify JWT here
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(`user_${userId}`); // Join personal room for direct notifications
    }
    console.log(`Client connected: ${client.id}, userId: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_channel')
  handleJoinChannel(@ConnectedSocket() client: Socket, @MessageBody() channelId: string) {
    client.join(`channel_${channelId}`);
    return { event: 'joined', data: channelId };
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(@ConnectedSocket() client: Socket, @MessageBody() channelId: string) {
    client.leave(`channel_${channelId}`);
    return { event: 'left', data: channelId };
  }

  @SubscribeMessage('send_message')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: { channelId: string; senderId: string; content: string }) {
    const message = await this.prisma.chatMessage.create({
      data: {
        channelId: payload.channelId,
        senderId: payload.senderId,
        content: payload.content,
      },
      include: {
        sender: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });

    // Broadcast to the channel
    this.server.to(`channel_${payload.channelId}`).emit('new_message', message);
    return message;
  }

  sendNotificationToUser(userId: string, notification: any) {
    if (this.server) {
      if (userId) {
        this.server.to(`user_${userId}`).emit('new_notification', notification);
      }
      this.server.emit('new_notification', notification);
    }
  }
}
