import { Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { sql } from 'kysely'
import { Episode } from 'podcast-partytime'

@Injectable()
export class EpisodesService {
  createEpisodesFromFeed(episodes: Episode[], podcastId: number) {
    // TODO: complete the rest of metadata
    db.insertInto('episodes')
      .values(
        episodes
          .slice()
          .sort((a, b) => (new Date(a.pubDate) > new Date(b.pubDate) ? 1 : -1))
          .map((episode) => ({
            podcastId,
            sourceId: episode.guid || null,
            title: episode.title,
            image: episode.itunesImage || episode.image || null,
            duration: episode.duration,
            description: episode.description,
            contentUrl: episode.enclosure.url,
            publishedAt: episode.pubDate.toISOString()
          }))
      )
      .execute()
  }

  async getEpisodeById(episodeId: number, userId?: number) {
    const episode = await this.episodeBaseQuery(userId)
      .where('episodes.id', '=', episodeId)
      .executeTakeFirstOrThrow()
    return {
      ...episode,
      belongsTo: await db
        .selectFrom('podcasts')
        .select(['id', 'name', 'coverImage'])
        .where('id', '=', episode.podcastId)
        .executeTakeFirstOrThrow()
    }
  }

  async getPodcastEpisodes(podcastId: number, userId?: number) {
    return await this.episodeBaseQuery(userId)
      .where('podcastId', '=', podcastId)
      .orderBy('id', 'desc')
      .limit(5)
      .execute()
  }

  async updateReproduction(
    userId: number,
    episodeId: number,
    leftOn?: number,
    hasCompleted?: boolean
  ) {
    if (
      await db
        .selectFrom('reproductions')
        .select('userId')
        .where('userId', '=', userId)
        .where('episodeId', '=', episodeId)
        .executeTakeFirst()
    ) {
      await db
        .updateTable('reproductions')
        .set({
          ...(leftOn ? { leftOn } : {}),
          ...(hasCompleted ? { completedAt: sql`CURRENT_TIMESTAMP` } : {})
        })
        .where('userId', '=', userId)
        .where('episodeId', '=', episodeId)
        .execute()
    } else {
      await db
        .insertInto('reproductions')
        .values({
          userId,
          episodeId,
          leftOn,
          completedAt: hasCompleted ? sql`CURRENT_TIMESTAMP` : null
        })
        .execute()
    }
  }

  private episodeBaseQuery(userId?: number) {
    if (userId) {
      return db
        .selectFrom('episodes')
        .leftJoin(
          db
            .selectFrom('reproductions')
            .selectAll()
            .where('userId', '=', userId)
            .as('userReproductions'),
          'userReproductions.episodeId',
          'episodes.id'
        )
        .select([
          'id',
          'podcastId',
          'title',
          'duration',
          'description',
          'episodes.contentUrl',
          'episodes.image',
          'publishedAt',
          'userReproductions.leftOn',
          'userReproductions.completedAt'
        ])
    } else {
      return db
        .selectFrom('episodes')
        .select([
          'id',
          'podcastId',
          'title',
          'duration',
          'description',
          'episodes.contentUrl',
          'episodes.image',
          'publishedAt'
        ])
    }
  }
}
