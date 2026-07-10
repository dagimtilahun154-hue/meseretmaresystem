import { Controller, Get, Post, Query, Body, Req } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthUser } from '../common/types/auth-user';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  getComments(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string
  ) {
    return this.commentsService.getComments(entityType, entityId);
  }

  @Post()
  addComment(
    @Req() request: { user: AuthUser },
    @Body() payload: { entityType: string; entityId: string; content: string }
  ) {
    return this.commentsService.addComment(request.user.id, payload);
  }
}
