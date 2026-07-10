import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async getTasks(userId: string) {
    return this.prisma.task.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
      },
      include: {
        creator: {
          select: { id: true, displayName: true, username: true, department: true },
        },
        assignee: {
          select: { id: true, displayName: true, username: true, department: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createTask(userId: string, payload: { title: string; description?: string; priority?: string; dueDate?: string; assigneeId: string }) {
    return this.prisma.task.create({
      data: {
        title: payload.title,
        description: payload.description,
        status: 'TODO',
        priority: payload.priority || 'MEDIUM',
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        creatorId: userId,
        assigneeId: payload.assigneeId,
      },
      include: {
        creator: {
          select: { id: true, displayName: true, username: true },
        },
        assignee: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });
  }

  async updateTask(id: string, payload: { title?: string; description?: string; status?: string; priority?: string; dueDate?: string; assigneeId?: string }) {
    const data: any = { ...payload };
    if (payload.dueDate !== undefined) {
      data.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
    }
    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, displayName: true, username: true },
        },
        assignee: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });
  }

  async deleteTask(id: string) {
    return this.prisma.task.delete({
      where: { id },
    });
  }
}
