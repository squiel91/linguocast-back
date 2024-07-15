import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { NewPodcast } from 'src/db/schema.db'
import { rawMinifiedPodcastsToMinifiedPodcastDtos } from './podcasts.mapper'

import { parsePodcastRss } from 'src/utils/parsing.utils'
import { EpisodesService } from 'src/episodes/episodes.service'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Episode } from 'podcast-partytime'
import { linkSync } from 'fs'
import { NotificationChannels, NotificationsService } from 'src/notifications/notifications.service'

@Injectable()
export class PodcastsService {
  constructor(
    private readonly episodesService: EpisodesService,
    private readonly notificationsService: NotificationsService
  ) {}

  private readonly logger = new Logger(PodcastsService.name)

  @Cron(CronExpression.EVERY_WEEK)
  async updateAllPodcasts() {
    const podcastIdsWithRssFeed = (
      await db
        .selectFrom('podcasts')
        .select(['id'])
        .where('rss', 'is not', null)
        .execute()
    ).map(({ id }) => id)

    for (const podcastId of podcastIdsWithRssFeed) {
      await this.updatePodcastFromRss(podcastId)
    }
  }
  async getAllPodcasts() {
    const rawPodcasts = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'podcasts.targetLanguageId', 'languages.id')
      .leftJoin('savedPodcasts', 'podcasts.id', 'savedPodcasts.podcastId')
      .leftJoin(
        db
          .selectFrom('comments')
          .select(['id', 'resourceType', 'resourceId'])
          .where('comments.resourceType', '=', 'podcasts')
          .as('givenPodcastComments'),
        'podcasts.id',
        'givenPodcastComments.resourceId'
      )
      .select(({ fn, val }) => [
        'podcasts.id',
        'podcasts.name',
        fn<string>('SUBSTR', ['description', val(0), val(150)]).as(
          'description'
        ),
        'coverImage',
        'levels as rawLevels',
        'languages.name as targetLanguage',
        fn<number>('COUNT', [fn('DISTINCT', ['savedPodcasts.userId'])]).as(
          'savedCount'
        ),
        fn<number>('COUNT', [fn('DISTINCT', ['givenPodcastComments.id'])]).as(
          'commentsCount'
        )
      ])
      .where('isDeleted', '=', 0)
      .where('isListed', '=', 1 )
      .groupBy('podcasts.id')
      .orderBy('podcasts.id', 'desc')
      .execute()

    return rawMinifiedPodcastsToMinifiedPodcastDtos(rawPodcasts)
  }

  async getUserPodcasts(userId: number) {
    const userPodcastIds = (
      await db
        .selectFrom('podcasts')
        .select('id')
        .where('byUserId', '=', userId)
        .where('isDeleted', '=', 0)
        .orderBy('podcasts.id', 'desc')
        .execute()
    ).map(({ id }) => id)
    return Promise.all(
      userPodcastIds.map(userPodcastId =>
        this.getUserPodcastsById(userId, userPodcastId)
      )
    )
  }

  async getUserPodcastEpisodes(userId: number, podcastId: number) {
    console.log({ userId, podcastId })
    const userEpisodes = await db
      .selectFrom('episodes')
      .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
      .leftJoin(
        db
          .selectFrom('reproductions')
          .select(({ fn }) => [
            fn<number>('COUNT', ['reproductions.userId']).as('count'),
            'reproductions.episodeId'
          ])
          .groupBy('reproductions.episodeId')
          .as('episodeReproductionsCount'),
        'episodes.id',
        'episodeReproductionsCount.episodeId'
      )
      .leftJoin(
        db
          .selectFrom('comments')
          .select(({ fn }) => [
            fn<number>('COUNT', ['comments.id']).as('count'),
            'comments.resourceId'
          ])
          .where('comments.resourceType', '=', 'episode')
          .groupBy('comments.resourceId')
          .as('episodeCommentsCount'),
        'episodes.id',
        'episodeCommentsCount.resourceId'
      )
      .leftJoin(
        db
          .selectFrom('embeddeds')
          .select(({ fn }) => [
            fn<number>('COUNT', ['embeddeds.id']).as('count'),
            'embeddeds.episodeId'
          ])
          .groupBy('embeddeds.episodeId')
          .as('episodeEmbeddedsCount'),
        'episodes.id',
        'episodeEmbeddedsCount.episodeId'
      )
      .leftJoin(
        db
          .selectFrom('exercises')
          .select(({ fn }) => [
            fn<number>('COUNT', ['exercises.id']).as('count'),
            'exercises.episodeId'
          ])
          .groupBy('exercises.episodeId')
          .as('episodeExercisesCount'),
        'episodes.id',
        'episodeExercisesCount.episodeId'
      )
      .select(({ fn, val }) => [
        'episodes.id',
        'episodes.podcastId',
        'podcasts.name as podcastName',
        'podcasts.coverImage as podcastImage',
        'episodes.title',
        fn<number>('IFNULL', ['episodeReproductionsCount.count', val(0)]).as(
          'reproductionsCount'
        ),
        fn<number>('IFNULL', ['episodeCommentsCount.count', val(0)]).as(
          'commentsCount'
        ),
        fn<number>('IFNULL', ['episodeEmbeddedsCount.count', val(0)]).as(
          'embeddedCount'
        ),
        fn<number>('IFNULL', ['episodeExercisesCount.count', val(0)]).as(
          'exercisesCount'
        ),
        'episodes.image',
        'episodes.publishedAt',
        'episodes.duration',
        'episodes.description',
        'episodes.transcript',
        'episodes.contentUrl',
        'episodes.isListed',
        'episodes.createdAt',
        'episodes.updatedAt'
      ])
      .where('podcasts.byUserId', '=', +userId)
      .where('podcasts.id', '=', +podcastId)
      .where('episodes.isDeleted', '=', 0)
      .orderBy('episodes.id', 'desc')
      .limit(10)
      .execute()

    return userEpisodes
  }

  async getUserPodcastsById(userId: number, podcastId: number) {
    console.log({ userId, podcastId })
    const rawPodcast = await db
      .selectFrom('podcasts')
      .select([
        'id',
        'name',
        'description',
        'rss',
        'links as rawLinks',
        'isListed as rawIsListed',
        'coverImage',
        'levels as rawLevels',
        'targetLanguageId',
        'mediumLanguageId',
        'updatedAt',
        'createdAt'
      ])
      .where('id', '=', podcastId)
      .where('byUserId', '=', userId)
      .orderBy('id', 'desc')
      .executeTakeFirstOrThrow()

    const languages = await db
      .selectFrom('languages')
      .select(['id', 'name'])
      .where('id', 'in', [
        rawPodcast.targetLanguageId,
        rawPodcast.mediumLanguageId
      ])
      .execute()

    const episodesCount = (
      await db
        .selectFrom('episodes')
        .select(({ fn }) => fn<number>('COUNT', ['id']).as('count'))
        .where('podcastId', '=', podcastId)
        .where('isDeleted', '=', 0)
        .executeTakeFirstOrThrow()
    ).count

    const followersCount = (
      await db
        .selectFrom('savedPodcasts')
        .select(({ fn }) => fn<number>('COUNT', ['userId']).as('count'))
        .where('podcastId', '=', podcastId)
        .executeTakeFirstOrThrow()
    ).count

    const reviewsCount = (
      await db
        .selectFrom('comments')
        .select(({ fn }) => fn<number>('COUNT', ['id']).as('count'))
        .where('comments.resourceType', '=', 'podcast')
        .where('comments.resourceId', '=', podcastId)
        .executeTakeFirstOrThrow()
    ).count

    const commentsCount = (
      await db
        .selectFrom('comments')
        .leftJoin('episodes', 'episodes.id', 'comments.resourceId')
        .select(({ fn }) => fn<number>('COUNT', ['comments.id']).as('count'))
        .where('comments.resourceType', '=', 'episode')
        .where('episodes.podcastId', '=', podcastId)
        .where('episodes.isDeleted', '=', 0)
        .executeTakeFirstOrThrow()
    ).count

    const uniqueReproductions = (
      await db
        .selectFrom('reproductions')
        .leftJoin('episodes', 'reproductions.episodeId', 'episodes.id')
        .select(({ fn }) =>
          fn<number>('COUNT', [
            fn<number[]>('DISTINCT', ['reproductions.userId'])
          ]).as('count')
        )
        .where('episodes.podcastId', '=', podcastId)
        .where('episodes.isDeleted', '=', 0)
        .executeTakeFirstOrThrow()
    ).count

    const {
      rawLevels,
      rawLinks,
      coverImage,
      targetLanguageId,
      mediumLanguageId,
      rawIsListed,
      ...podcastRest
    } = rawPodcast
    return {
      ...podcastRest,
      image: coverImage,
      levels: JSON.parse(rawLevels),
      links: JSON.parse(rawLinks),
      targetLanguage: languages.find(l => l.id === targetLanguageId)!.name,
      mediumLanguage: languages.find(l => l.id === mediumLanguageId)!.name,
      episodesCount,
      followersCount,
      isListed: rawIsListed === 1,
      reviewsCount,
      commentsCount,
      uniqueReproductions
    }
  }

  async updatePodcast(
    creatorId: number,
    podcastId: number,
    name?: string,
    targetLanguage?: string,
    mediumLanguage?: string,
    description?: string,
    levels?: string[],
    links?: string[],
    image?: string | null,
    isListed?: boolean
  ) {
    const podcast = await db
      .selectFrom('podcasts')
      .select('byUserId')
      .where('id', '=', podcastId)
      .executeTakeFirst()

    if (!podcast) throw new NotFoundException()
    if (podcast.byUserId !== creatorId) throw new ForbiddenException()

    let targetLanguageId: number | null = null
    if (targetLanguage) {
      targetLanguageId = (
        await db
          .selectFrom('languages')
          .select('id')
          .where('name', '=', targetLanguage)
          .executeTakeFirstOrThrow()
      ).id
    }

    let mediumLanguageId: number | null = null
    if (mediumLanguage) {
      mediumLanguageId = (
        await db
          .selectFrom('languages')
          .select('id')
          .where('name', '=', mediumLanguage)
          .executeTakeFirstOrThrow()
      ).id
    }

    console.log({ isListed })
    await db
      .updateTable('podcasts')
      .set({
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
        ...(levels ? { levels: JSON.stringify(levels) } : {}),
        ...(links ? { links: JSON.stringify(links) } : {}),
        ...(image === null || typeof image === 'string'
          ? { coverImage: image }
          : {}),
        ...(targetLanguageId ? { targetLanguageId } : {}),
        ...(mediumLanguageId ? { mediumLanguageId } : {}),
        ...(typeof isListed === 'boolean' ? { isListed: isListed ? 1 : 0 } : {})
      })
      .where('id', '=', podcastId)
      .executeTakeFirstOrThrow()

    return await this.getPodcastById(podcastId)
  }

  async updatePodcastFromRss(podcastId: number) {
    // TODO there should be one option to update the shows info
    // TODO have an option to update the episodes info

    // Right now it just adds new podcasts
    const podcastData = await db
      .selectFrom('podcasts')
      .select(['rss', 'eTag', 'lastModified'])
      .where('id', '=', podcastId)
      .executeTakeFirst()

    if (!podcastData) throw new NotFoundException('Podcast not found')
    const { rss, eTag, lastModified } = podcastData

    if (!rss) throw new BadRequestException('The podcast do not have RSS')

    const { isUpToDate, ...rest } = await parsePodcastRss(rss, {
      lastModified,
      eTag
    })

    if (isUpToDate) return

    const {
      podcast: { items: remoteEpisodes },
      eTag: updatedETag,
      lastModified: updatedLastModified
    } = rest

    // TODO I assume there is a guid, but is actually not required. Make the comparation more robust (https://www.xn--8ws00zhy3a.com/blog/2006/08/rss-dup-detection)
    const localEpisodesSourceIds = (
      await db
        .selectFrom('episodes')
        .select('sourceId')
        .where('podcastId', '=', podcastId)
        .execute()
    ).map(({ sourceId }) => sourceId)

    await this.episodesService.createEpisodesFromFeed(
      remoteEpisodes.filter(
        ({ guid }) => !localEpisodesSourceIds.includes(guid)
      ),
      podcastId
    )

    // save the updated last modified and/or etag
    if (!updatedLastModified && !updatedETag) return
    await db
      .updateTable('podcasts')
      .set({
        lastModified: updatedLastModified,
        eTag: updatedETag
      })
      .where('id', '=', podcastId)
      .execute()
  }

  async getPodcastMetrics(userId: number, podcastId: number) {
    // TODO: this will become bigger with time. Need to calculate in the back.
    const reproductions = await db
      .selectFrom('reproductions')
      .innerJoin('episodes', 'episodes.id', 'reproductions.episodeId')
      .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
      .select([
        'reproductions.leftOn',
        'reproductions.completedAt',
        'reproductions.updatedAt',
        'reproductions.userId',
        'episodes.id as episodeId'
      ])
      .where('podcasts.id', '=', podcastId)
      .where('podcasts.isDeleted', '=', 0)
      .where('episodes.isDeleted', '=', 0)
      .execute()

    const episodes = await db
      .selectFrom('episodes')
      .where('id', 'in', [...new Set(reproductions.map(r => r.episodeId))])
      .select(['id', 'title', 'image', 'duration'])
      .execute()

    return {
      reproductions,
      episodes
    }
  }

  async getPodcastById(podcastId: number, userId?: number | null) {
    const rawPodcast = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'podcasts.targetLanguageId', 'languages.id')
      .leftJoin('savedPodcasts', 'podcasts.id', 'savedPodcasts.podcastId')
      .leftJoin(
        db
          .selectFrom('comments')
          .select(['id', 'resourceType', 'resourceId'])
          .where('comments.resourceType', '=', 'podcasts')
          .where('comments.resourceId', '=', podcastId)
          .as('givenPodcastComments'),
        'podcasts.id',
        'givenPodcastComments.resourceId'
      )
      .select(({ fn }) => [
        'podcasts.id',
        'podcasts.name',
        'podcasts.description',
        'coverImage',
        'links as rawLinks',
        'levels as rawLevels',
        'languages.name as targetLanguage',
        'mediumLanguageId',
        'isActive',
        'since',
        'hasVideo',
        'avarageEpisodeMinutesDuration',
        'hasTranscript',
        'isTranscriptFree',
        'byUserId as creatorId',
        fn<number>('COUNT', [fn('DISTINCT', ['savedPodcasts.userId'])]).as(
          'savedCount'
        ),
        fn<number>('COUNT', [fn('DISTINCT', ['givenPodcastComments.id'])]).as(
          'commentsCount'
        ),
        'podcasts.createdAt',
        'podcasts.updatedAt'
      ])
      .where('podcasts.id', '=', podcastId)
      .groupBy('podcasts.id')
      .executeTakeFirst()

    const episodesCount = await db
      .selectFrom('episodes')
      .select(({ fn }) => [
        fn<number>('COUNT', ['episodes.id']).as('episodesCount')
      ])
      .where('podcastId', '=', podcastId)
      .executeTakeFirstOrThrow()

    const {
      rawLevels,
      rawLinks,
      mediumLanguageId,
      ...podcastWithoutLevelsAndLinksAndMediumLanguageId
    } = rawPodcast

    let mediumLanguage: null | string = null
    if (mediumLanguageId) {
      mediumLanguage = (
        await db
          .selectFrom('languages')
          .select('languages.name')
          .where('id', '=', rawPodcast.mediumLanguageId)
          .executeTakeFirst()
      ).name
    }

    let isSavedByUser: boolean | undefined
    if (userId) {
      isSavedByUser = (await db
        .selectFrom('savedPodcasts')
        .selectAll()
        .where('podcastId', '=', podcastId)
        .where('userId', '=', userId)
        .executeTakeFirst())
        ? true
        : false
    }

    return {
      ...podcastWithoutLevelsAndLinksAndMediumLanguageId,
      links: JSON.parse(rawLinks),
      levels: JSON.parse(rawLevels),
      episodesCount: episodesCount.episodesCount,
      mediumLanguage,
      isSavedByUser
    }
  }

  async getPodcastEpisodes(
    podcastId: number,
    userId: number | null,
    fromEpisodeId?: number,
    size: number = 5
  ) {
    const episodes = await this.episodesService.getPodcastEpisodes(
      podcastId,
      userId,
      fromEpisodeId,
      size
    )
    const microPodcast = await db
      .selectFrom('podcasts')
      .select(['id', 'name', 'coverImage'])
      .where('id', '=', podcastId)
      .executeTakeFirstOrThrow()

    return episodes.map(episode => ({
      ...episode,
      belongsTo: microPodcast
    }))
  }

  async createPodcastFromRss(
    creatorId: number,
    rss: string,
    targetLanguage: string,
    mediumLanguage: string,
    levels: string[]
  ) {
    try {
      const {
        podcast: { title: name, description, image, link, items: episodes },
        eTag,
        lastModified
      } = await parsePodcastRss(rss)
      const { id: createdPodcastId } = await this.createPodcast(
        creatorId,
        rss,
        name,
        targetLanguage,
        mediumLanguage,
        description,
        levels,
        [],
        image?.url ?? null,
        episodes,
        eTag ?? null,
        lastModified ?? null
      )
      await this.episodesService.createEpisodesFromFeed(
        episodes,
        createdPodcastId
      )
      return { id: createdPodcastId }
    } catch (error) {
      console.error(error)
      throw new BadRequestException()
    }
  }

  async suggestPodcast(
    userId: number | null,
    name: string,
    targetLanguage: string,
    mediumLanguage: string | null,
    rss: string | null,
    levels: string[],
    links: string[] | null
  ) {
    await this.notificationsService.sendNotification(
      NotificationChannels.SUGGESTED_PODCAST,
      `**Name: ${name}**\n` +
        `Target language: ${targetLanguage}\n` +
        `Medium language: ${mediumLanguage}\n` +
        (rss ? `RSS feed: ${rss}\n` : '') +
        `Levels: ${levels.join(', ')}\n` +
        (links && links.length > 0 ? `Links: ${links.join(', ')}\n` : '') +
        (userId ? `Sugested by user ID=${userId}` : '')
    )
  }

  async createPodcast(
    creatorId: number,
    rss: string | null,
    name: string,
    targetLanguage: string,
    mediumLanguage: string,
    description: string,
    levels: string[],
    links: string[],
    image?: string | null,
    episodes?: Episode[],
    eTag?: string,
    lastModified?: string
  ) {
    const targetLanguageId = (
      await db
        .selectFrom('languages')
        .select('id')
        .where('name', '=', targetLanguage)
        .executeTakeFirstOrThrow()
    ).id

    let mediumLanguageId: number | null = null
    if (mediumLanguage) {
      mediumLanguageId = (
        await db
          .selectFrom('languages')
          .select('id')
          .where('name', '=', mediumLanguage)
          .executeTakeFirstOrThrow()
      ).id
    }

    const podcastId = (
      await db
        .insertInto('podcasts')
        .values({
          rss,
          name,
          description,
          levels: JSON.stringify(levels),
          links: JSON.stringify(links),
          coverImage: image,
          targetLanguageId,
          mediumLanguageId,
          byUserId: creatorId,
          eTag,
          lastModified
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id

    if (episodes && episodes.length > 0) {
      await this.episodesService.createEpisodesFromFeed(episodes, podcastId)
    }

    await this.notificationsService.sendNotification(
      NotificationChannels.CREATED_PODCAST,
      `**New ${targetLanguage} podcast: [${name}](https://linguocast.com/creators/podcasts/${podcastId}/overview)**`
    )

    return await this.getPodcastById(podcastId)
  }

  async savePodcast(userId: number, podcastId: number) {
    if (
      !(await db
        .selectFrom('savedPodcasts')
        .selectAll()
        .where('podcastId', '=', podcastId)
        .where('userId', '=', userId)
        .executeTakeFirst())
    )
      await db
        .insertInto('savedPodcasts')
        .values({ userId, podcastId })
        .execute()
  }

  async creatorsPodcastMetrics(userId: number, podcastId: number) {
    //
  }

  async removeSavedPodcast(userId: number, podcastId: number) {
    db.deleteFrom('savedPodcasts')
      .where('userId', '=', userId)
      .where('podcastId', '=', podcastId)
      .execute()
  }

  async deletePodcast(creatorId: number, podcastId: number) {
    const podcast = await db
      .selectFrom('podcasts')
      .select('byUserId')
      .where('id', '=', podcastId)
      .where('isDeleted', '=', 0)
      .executeTakeFirst()

    if (!podcast) throw new NotFoundException()
    if (podcast.byUserId !== creatorId) throw new ForbiddenException()

    await db
      .updateTable('podcasts')
      .set({ isDeleted: 1 })
      .where('id', '=', podcastId)
      .execute()
  }
}
