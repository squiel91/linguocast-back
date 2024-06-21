import {
  BadRequestException,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { sql } from 'kysely'
import { Episode } from 'podcast-partytime'
import { AutomationsService } from 'src/transcriptions/automations.service'
import { sify } from 'chinese-conv'
import { generateExercises as gptGenerateExercises } from 'src/integrations/open-ai.integrations'
import { escape } from 'querystring'
import { converToTraditional, converToSimplfied } from 'src/words/words.utils'
import { convertIfChinese } from 'src/utils/chinese.utils'

export type EpisodeTemplate = 'detailed' | 'succint'

@Injectable()
export class EpisodesService {
  constructor(private readonly automationsService: AutomationsService) {}

  async listTinyPodcastEpisodes(podcastId: number) {
    const episodes = await db
      .selectFrom('episodes')
      .innerJoin('podcasts', 'episodes.podcastId', 'podcasts.id')
      .select(({ fn }) => [
        'episodes.id',
        'episodes.title',
        'podcasts.name as podcastName',
        fn<string | null>('IFNULL', [
          'episodes.image',
          'podcasts.coverImage'
        ]).as('image')
      ])
      .where('episodes.podcastId', '=', podcastId)
      .execute()
    return episodes
  }

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

  async updateTranscript(
    episodeId: number,
    autogenerate: boolean,
    transcript?: string
  ) {
    let newTranscript: string
    if (!transcript && autogenerate) {
      newTranscript = await this.automationsService.generateAutomaticTranscript(
        await this.getEpisodeAudioUrl(episodeId)
      )
      if (!newTranscript)
        throw new InternalServerErrorException(
          'Could not auto-generate the transcription.'
        )
    } else {
      newTranscript = transcript
    }
    await db
      .updateTable('episodes')
      .set({ transcript: newTranscript })
      .where('id', '=', episodeId)
      .execute()
    return { transcript: newTranscript }
  }

  async generateExercises(episodeId: number) {
    const transcript = (
      await db
        .selectFrom('episodes')
        .select('transcript')
        .where('id', '=', episodeId)
        .executeTakeFirst()
    )?.transcript
    if (!transcript)
      throw new BadRequestException('The episode does not have a transcript.')
    const exercises = await gptGenerateExercises({
      transcript
    })
    return exercises
  }

  async getEpisodeById(
    episodeId: number,
    userId: number | null,
    template: EpisodeTemplate
  ) {
    if (template === 'succint') {
      return await db
        .selectFrom('episodes')
        .innerJoin('podcasts', 'episodes.podcastId', 'podcasts.id')
        .select(({ fn }) => [
          'episodes.id',
          'episodes.title',
          'podcasts.name as podcastName',
          fn<string | null>('IFNULL', [
            'episodes.image',
            'podcasts.coverImage'
          ]).as('image')
        ])
        .where('episodes.id', '=', episodeId)
        .executeTakeFirstOrThrow()
    }

    const userLanguage = await db
      .selectFrom('users')
      .select(['learningLanguageId', 'languageVariant'])
      .where('id', '=', userId)
      .executeTakeFirst()

    const episode = await this.episodeBaseQuery(userId)
      .where('episodes.id', '=', episodeId)
      .executeTakeFirstOrThrow()

    const podcast = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'languages.id', 'podcasts.targetLanguageId')
      .select([
        'podcasts.id',
        'podcasts.name',
        'coverImage',
        'languages.name as targetLanguage'
      ])
      .where('podcasts.id', '=', episode.podcastId)
      .executeTakeFirstOrThrow()

    const { title, description, transcript, ...episodeRest } = episode
    return {
      ...episodeRest,
      title: convertIfChinese(userLanguage, title),
      description: convertIfChinese(userLanguage, description),
      transcript: convertIfChinese(userLanguage, transcript),
      belongsTo: podcast
    }
  }

  async getPodcastEpisodes(
    podcastId: number,
    userId?: number,
    fromEpisodeId?: number,
    size = 5
  ) {
    return await (
      fromEpisodeId
        ? this.episodeBaseQuery(userId).where('episodes.id', '<', fromEpisodeId)
        : this.episodeBaseQuery(userId)
    )
      .where('podcastId', '=', podcastId)
      .orderBy('episodes.id', 'desc')
      .limit(size)
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
          'episodes.id',
          'podcastId',
          'title',
          'duration',
          'description',
          'transcript',
          'episodes.contentUrl',
          'episodes.image',
          'publishedAt',
          sql<number>`(SELECT COUNT(*) FROM comments WHERE resourceType = 'episodes' AND resourceId = episodes.id)`.as(
            'commentsCount'
          ),
          'userReproductions.leftOn',
          'userReproductions.completedAt'
        ])
    } else {
      return db
        .selectFrom('episodes')
        .select([
          'episodes.id',
          'podcastId',
          'title',
          'duration',
          'description',
          'transcript',
          'episodes.contentUrl',
          'episodes.image',
          'publishedAt',
          sql<number>`(SELECT COUNT(*) FROM comments WHERE resourceType = 'episodes' AND resourceId = episodes.id)`.as(
            'commentsCount'
          )
        ])
    }
  }

  private async getEpisodeAudioUrl(episodeId: number) {
    return (
      await db
        .selectFrom('episodes')
        .select('contentUrl')
        .where('id', '=', episodeId)
        .executeTakeFirstOrThrow()
    ).contentUrl
  }
}
