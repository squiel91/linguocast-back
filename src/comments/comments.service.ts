import { Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import {
  NotificationChannels,
  NotificationsService
} from 'src/notifications/notifications.service'

export type ResourceType = 'podcasts' | 'episodes'

@Injectable()
export class CommentsService {
  constructor(private readonly notificationsService: NotificationsService) {}

  private baseCommentQuery() {
    return db
      .selectFrom('comments')
      .innerJoin('users', 'comments.userId', 'users.id')
      .select([
        'comments.id',
        'content',
        'comments.createdAt',
        'comments.updatedAt',
        'responseTo',
        'users.id as authorId',
        'users.avatar as authorAvatar',
        'users.name as authorName'
      ])
  }

  async getCommentById(commentId: number) {
    return await this.baseCommentQuery()
      .where('comments.id', '=', commentId)
      .executeTakeFirstOrThrow()
  }

  async listPodcastEpisodeComments(userId: number, podcastId: number) {
    return (
      await db
        .selectFrom('comments')
        .innerJoin('episodes', 'episodes.id', 'comments.resourceId')
        .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
        .innerJoin('users', 'comments.userId', 'users.id')
        .select([
          'comments.id',
          'content',
          'comments.createdAt',
          'comments.updatedAt',
          'responseTo',
          'episodes.id as episodeId',
          'episodes.title as episodeTitle',
          'episodes.image as episodeImage',
          'users.id as authorId',
          'users.avatar as authorAvatar',
          'users.name as authorName'
        ])
        .where('comments.resourceType', '=', 'episodes')
        .where('episodes.podcastId', '=', podcastId)
        .where('episodes.isDeleted', '=', 0)
        .where('podcasts.isDeleted', '=', 0)
        .where('podcasts.byUserId', '=', userId)
        .execute()
    ).map(
      ({
        episodeId,
        episodeTitle,
        episodeImage,
        authorId,
        authorName,
        authorAvatar,
        ...rest
      }) => ({
        ...rest,
        episode: {
          id: episodeId,
          title: episodeTitle,
          image: episodeImage
        },
        author: {
          id: authorId,
          name: authorName,
          avatar: authorAvatar
        }
      })
    )
  }

  async listCommentForResource(resourceType: ResourceType, resourceId: number) {
    return await this.baseCommentQuery()
      .where('comments.resourceType', '=', resourceType)
      .where('comments.resourceId', '=', resourceId)
      .execute()
  }

  async createComment(
    userId: number,
    resourceType: ResourceType,
    resourceId: number,
    content: string
  ) {
    const { id: commentId } = await db
      .insertInto('comments')
      .values({
        resourceType,
        resourceId,
        userId,
        content
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    switch (resourceType) {
      case 'episodes':
        await this.notificationsService.sendNotification(
          NotificationChannels.NEW_COMMENT,
          `**New epsiode comment**\n> ${content}\n[Episode link](https://linguocast.com/episodes/${resourceId})`
        )
        break
      case 'podcasts':
        await this.notificationsService.sendNotification(
          NotificationChannels.NEW_COMMENT,
          `**New podcast review**\n> ${content}\n[Podcast link](https://linguocast.com/podcasts/${resourceId})`
        )
    }

    return await this.getCommentById(commentId)
  }
}
