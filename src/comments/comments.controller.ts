import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { CommentsService } from './comments.service'
import { CommentCreationDto, QueryListDto } from './comments.validation'
import { UserIdOrThrowUnauthorized } from 'src/auth/auth.decorators'
import { NotificationsService } from 'src/notifications/notifications.service'

@Controller('/api')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}
  @Get('/comments/')
  async listComments(@Query() query: QueryListDto) {
    return await this.commentsService.listCommentForResource(
      query.resourceType,
      +query.resourceId
    )
  }

  @Get('/creators/comments')
  async listCreatorsComments(
    @UserIdOrThrowUnauthorized() userId: number,
    @Query('podcastId') podcastId: string
  ) {
    return await this.commentsService.listPodcastEpisodeComments(
      userId,
      +podcastId
    )
  }

  @Post('/comments')
  async createComment(
    @UserIdOrThrowUnauthorized() userId: number,
    @Body() commentCreationDto: CommentCreationDto
  ) {
    return await this.commentsService.createComment(
      userId,
      commentCreationDto.resourceType,
      commentCreationDto.resourceId,
      commentCreationDto.content
    )
  }

  // TODO add comment remove and edit
}
