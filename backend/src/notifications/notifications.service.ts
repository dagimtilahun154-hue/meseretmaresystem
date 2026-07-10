import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCounts(userId: string) {
    const unreadNotifications = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    const pendingTasks = await this.prisma.task.count({
      where: { assigneeId: userId, status: { not: 'DONE' } },
    });

    const memberships = await this.prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true, lastReadAt: true },
    });

    let unreadMessages = 0;
    if (memberships.length > 0) {
      const counts = await Promise.all(
        memberships.map((m) =>
          this.prisma.chatMessage.count({
            where: {
              channelId: m.channelId,
              createdAt: { gt: m.lastReadAt },
              senderId: { not: userId },
            },
          })
        )
      );
      unreadMessages = counts.reduce((a, b) => a + b, 0);
    }

    return {
      notifications: unreadNotifications,
      tasks: pendingTasks,
      chat: unreadMessages,
    };
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteNotification(id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
