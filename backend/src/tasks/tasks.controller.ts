import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AuthUser } from '../common/types/auth-user';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  getTasks(@Req() request: { user: AuthUser }) {
    return this.tasksService.getTasks(request.user.id);
  }

  @Post()
  createTask(@Req() request: { user: AuthUser }, @Body() payload: { title: string; description?: string; priority?: string; dueDate?: string; assigneeId: string }) {
    return this.tasksService.createTask(request.user.id, payload);
  }

  @Put(':id')
  updateTask(@Param('id') id: string, @Body() payload: { title?: string; description?: string; status?: string; priority?: string; dueDate?: string; assigneeId?: string }) {
    return this.tasksService.updateTask(id, payload);
  }

  @Delete(':id')
  deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }
}
