import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthUser } from '../common/types/auth-user';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('channels')
  getChannels(@Req() request: { user: AuthUser }) {
    return this.chatService.getChannels(request.user.id);
  }

  @Get('channels/:channelId/messages')
  getChannelMessages(@Param('channelId') channelId: string) {
    return this.chatService.getChannelMessages(channelId);
  }

  @Post('channels')
  createChannel(
    @Body() payload: { name?: string; type: string; memberIds: string[] },
    @Req() request: { user: AuthUser }
  ) {
    const memberIds = payload.memberIds || [];
    if (!memberIds.includes(request.user.id)) {
      memberIds.push(request.user.id);
    }
    return this.chatService.createChannel({ ...payload, memberIds });
  }

  @Post('dm')
  findOrCreateDM(
    @Body() payload: { withUserId: string },
    @Req() request: { user: AuthUser }
  ) {
    return this.chatService.findOrCreateDMChannel(request.user.id, payload.withUserId);
  }

  @Post('channels/:channelId/read')
  markChannelAsRead(
    @Param('channelId') channelId: string,
    @Req() request: { user: AuthUser }
  ) {
    return this.chatService.markChannelAsRead(channelId, request.user.id);
  }
}
