import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getComments(entityType: string, entityId: string) {
    return this.prisma.comment.findMany({
      where: { entityType, entityId },
      include: {
        author: {
          select: { id: true, displayName: true, username: true, department: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(userId: string, payload: { entityType: string; entityId: string; content: string }) {
    const comment = await this.prisma.comment.create({
      data: {
        entityType: payload.entityType,
        entityId: payload.entityId,
        content: payload.content,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, displayName: true, username: true, department: true },
        },
      },
    });

    // Optionally create a notification for the Eod owner, Request creator, or Task assignee
    if (payload.entityType === 'EOD') {
      const eod = await this.prisma.eodReport.findUnique({
        where: { id: payload.entityId },
      });
      if (eod && eod.submittedById !== userId) {
        await this.prisma.notification.create({
          data: {
            userId: eod.submittedById,
            type: 'EOD_COMMENT',
            title: 'New Comment on EOD Report',
            content: `A manager commented on your EOD report for ${eod.date}`,
            link: `/inbox`,
          },
        });
      }
    } else if (payload.entityType === 'TASK') {
      const task = await this.prisma.task.findUnique({
        where: { id: payload.entityId },
      });
      if (task) {
        const notifyUser = userId === task.assigneeId ? task.creatorId : task.assigneeId;
        await this.prisma.notification.create({
          data: {
            userId: notifyUser,
            type: 'TASK_UPDATED',
            title: 'New Comment on Task',
            content: `There is a new comment on the task: "${task.title}"`,
            link: `/inbox`,
          },
        });
      }
    }

    return comment;
  }
}
