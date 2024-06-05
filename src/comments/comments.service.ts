import { Injectable } from '@nestjs/common';
import { db } from 'src/db/connection.db';

@Injectable()
export class CommentsService {
  private baseCommentQuery() {
    return db
      .selectFrom('comments')
      .innerJoin('users', 'comments.userId', 'users.id')
      .select([
        'comments.id',
        'comment as message',
        'comments.createdAt',
        'comments.updatedAt',
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

  async getCommentsForPodcast(podcastId: number) {
    return await this.baseCommentQuery()
      .where('comments.podcastId', '=', podcastId)
      .execute()
  }

  async createComment(podcastId: number, userId: number, message: string) {
    const { id: commentId } = await db
      .insertInto('comments')
      .values({
        podcastId,
        userId,
        comment: message // TODO: change column name to message
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    return await this.getCommentById(commentId)
  }
}
