import { Injectable } from '@nestjs/common';
import { db } from 'src/db/connection.db';

export type ResourceType = 'podcasts' | 'episodes'

@Injectable()
export class CommentsService {
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

    return await this.getCommentById(commentId)
  }
}
