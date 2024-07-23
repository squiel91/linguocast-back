import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { sql } from 'kysely'
import { Episode } from 'podcast-partytime'
import { AutomationsService } from 'src/transcriptions/automations.service'
import { generateExercises as gptGenerateExercises } from 'src/integrations/open-ai.integrations'
import { convertIfChinese } from 'src/utils/chinese.utils'
import { IUpdateEpisode } from './episodes.types'
import getAudioDurationInSeconds from 'get-audio-duration'

export type EpisodeTemplate = 'detailed' | 'succint'

@Injectable()
export class EpisodesService {
  constructor(private readonly automationsService: AutomationsService) {}

  async viewEpisodeMetrics(userId: number, episode: number) {
    // TODO: this will need a refactor
    return db
      .selectFrom('reproductions')
      .select(['leftOn', 'completedAt', 'updatedAt'])
      .where('episodeId', '=', episode)
      .execute()
  }

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

  async createEpisode(
    userId: number,
    podcastId: number,
    title: string,
    audio: string,
    description: string,
    image: string | null
  ) {
    const creatorId = (
      await db
        .selectFrom('podcasts')
        .select('podcasts.byUserId')
        .where('id', '=', podcastId)
        .executeTakeFirstOrThrow()
    ).byUserId

    if (creatorId !== userId)
      throw new ForbiddenException(
        'Only the creator can add new episodes to their podcasts'
      )

    return await db
      .insertInto('episodes')
      .values({
        podcastId,
        title,
        description,
        duration: await getAudioDurationInSeconds(audio),
        contentUrl: audio,
        image: image,
        isFromRss: 0 // this is the default value, but to be explicit
      })
      .returning('id')
      .executeTakeFirstOrThrow()
  }

  createEpisodesFromFeed(episodes: Episode[], podcastId: number) {
    // TODO: complete the rest of metadata
    db.insertInto('episodes')
      .values(
        episodes
          .slice()
          .sort((a, b) => (new Date(a.pubDate) > new Date(b.pubDate) ? 1 : -1))
          .map(episode => ({
            podcastId,
            sourceId: episode.guid || null,
            title: episode.title,
            image: episode.itunesImage || episode.image || null,
            duration: episode.duration,
            description: episode.description,
            contentUrl: episode.enclosure.url,
            publishedAt: episode.pubDate.toISOString(),
            isFromRss: 1,
            isListed: 1
          }))
      )
      .execute()
  }

  async updateEpisode(
    userId: number,
    episodeId: number,
    {
      title,
      audio,
      image,
      description,
      transcript,
      isListed,
      isPremium,
      isDeleted
    }: IUpdateEpisode
  ) {
    const creatorId = (
      await db
        .selectFrom('episodes')
        .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
        .select('podcasts.byUserId')
        .where('episodes.id', '=', episodeId)
        .where('episodes.isDeleted', '=', 0)
        .executeTakeFirstOrThrow()
    ).byUserId

    if (creatorId !== userId)
      throw new ForbiddenException('Only the creator an update the episode')

    await db
      .updateTable('episodes')
      .set({
        ...(title ? { title } : {}),
        ...(audio ? { audio } : {}),
        ...(image === null || typeof image === 'string' ? { image } : {}),
        ...(description ? { description } : {}),
        ...(transcript === null || typeof transcript === 'string'
          ? { transcript }
          : {}),
        ...(typeof isListed === 'boolean'
          ? { isListed: isListed ? 1 : 0 }
          : {}),
        ...(typeof isPremium === 'boolean'
          ? { isPremium: isPremium ? 1 : 0 }
          : {}),
        ...(typeof isDeleted === 'boolean'
          ? { isDeleted: isDeleted ? 1 : 0 }
          : {})
      })
      .where('id', '=', episodeId)
      .execute()
  }

  async autogenerateTranscript(episodeId: number) {
    const newTranscript =
      await this.automationsService.generateAutomaticTranscript(
        await this.getEpisodeAudioUrl(episodeId)
      )
    if (!newTranscript)
      throw new InternalServerErrorException(
        'Could not auto-generate the transcription.'
      )
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

  async getCreatorsEpisodeById(resquesterId: number, episodeId: number) {
    const rawEpisode = await db
      .selectFrom('episodes')
      .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
      .select([
        'episodes.id',
        'episodes.title',
        'episodes.contentUrl as audio',
        'episodes.description',
        'episodes.transcript',
        'episodes.image',
        'episodes.duration',
        'episodes.isListed',
        'episodes.isPremium',
        'episodes.isFromRss',
        'podcasts.byUserId as creatorId',
        'episodes.podcastId',
        'podcasts.name as podcastName',
        'podcasts.coverImage as podcastImage'
      ])
      .where('episodes.id', '=', episodeId)
      .where('episodes.isDeleted', '=', 0)
      .executeTakeFirst()

    if (!rawEpisode) throw new NotFoundException()
    if (rawEpisode.creatorId !== resquesterId) throw new ForbiddenException()

    const {
      isListed,
      isPremium,
      podcastId,
      podcastName,
      isFromRss,
      podcastImage,
      ...episodeRest
    } = rawEpisode

    return {
      ...episodeRest,
      isListed: !!isListed,
      isPremium: !!isPremium,
      fromRss: !!isFromRss,
      podcast: {
        id: podcastId,
        name: podcastName,
        image: podcastImage
      }
    }
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
        .where('episodes.isListed', '=', 1)
        .where('episodes.isDeleted', '=', 0)
        .executeTakeFirstOrThrow()
    }

    const user = await db
      .selectFrom('users')
      .select(['isPremium', 'learningLanguageId', 'languageVariant'])
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
        'languages.name as targetLanguage',
        'podcasts.byUserId as creatorId'
      ])
      .where('podcasts.id', '=', episode.podcastId)
      .executeTakeFirstOrThrow()

    const { title, description, transcript, ...episodeRest } = episode
    return {
      ...episodeRest,
      title: convertIfChinese(user, title),
      description: convertIfChinese(user, description),
      transcript: convertIfChinese(
        user,
        user?.isPremium ?? false
          ? transcript // for premium users it send the complete transcript
          : transcript?.slice(0, Math.ceil((transcript?.length ?? 0) / 2))
      ),
      podcast
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
        .where('episodes.isListed', '=', 1)
        .where('episodes.isDeleted', '=', 0)
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
        .where('episodes.isListed', '=', 1)
        .where('episodes.isDeleted', '=', 0)
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

  async deleteEpisode(creatorId: number, episodeId: number) {
    const episode = await db
      .selectFrom('episodes')
      .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
      .select('podcasts.byUserId')
      .where('episodes.id', '=', episodeId)
      .where('episodes.isDeleted', '=', 0)
      .where('podcasts.isDeleted', '=', 0)
      .executeTakeFirst()

    if (!episode) throw new NotFoundException()
    if (episode.byUserId !== creatorId) throw new ForbiddenException()

    await db
      .updateTable('episodes')
      .set({ isDeleted: 1 })
      .where('id', '=', episodeId)
      .execute()
  }
}
