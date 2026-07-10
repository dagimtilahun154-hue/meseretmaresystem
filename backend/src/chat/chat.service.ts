import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getChannels(userId: string) {
    // Find all channels where the user is a member, or public channels
    return this.prisma.chatChannel.findMany({
      where: {
        OR: [
          { type: 'PUBLIC' },
          {
            members: {
              some: { userId },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, username: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getChannelMessages(channelId: string) {
    return this.prisma.chatMessage.findMany({
      where: { channelId },
      include: {
        sender: {
          select: { id: true, displayName: true, username: true, department: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createChannel(payload: { name?: string; type: string; memberIds: string[] }) {
    const channel = await this.prisma.chatChannel.create({
      data: {
        name: payload.name,
        type: payload.type,
        members: {
          create: payload.memberIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, username: true },
            },
          },
        },
      },
    });
    return channel;
  }

  async findOrCreateDMChannel(user1Id: string, user2Id: string) {
    // Check if DM channel already exists between these two users
    const existing = await this.prisma.chatChannel.findFirst({
      where: {
        type: 'DM',
        AND: [
          { members: { some: { userId: user1Id } } },
          { members: { some: { userId: user2Id } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, username: true },
            },
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create a new DM channel
    return this.createChannel({
      type: 'DM',
      memberIds: [user1Id, user2Id],
    });
  }

  async markChannelAsRead(channelId: string, userId: string) {
    return this.prisma.channelMember.update({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });
  }
}
