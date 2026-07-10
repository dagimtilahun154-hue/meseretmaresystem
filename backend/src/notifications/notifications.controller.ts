import { Controller, Get, Post, Put, Delete, Param, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthUser } from '../common/types/auth-user';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@Req() request: { user: AuthUser }) {
    return this.notificationsService.getNotifications(request.user.id);
  }

  @Get('counts')
  getCounts(@Req() request: { user: AuthUser }) {
    return this.notificationsService.getCounts(request.user.id);
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  markAllAsRead(@Req() request: { user: AuthUser }) {
    return this.notificationsService.markAllAsRead(request.user.id);
  }

  @Delete(':id')
  deleteNotification(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(id);
  }
}
