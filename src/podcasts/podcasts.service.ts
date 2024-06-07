import {
  BadRequestException,
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

@Injectable()
export class PodcastsService {
  constructor(private readonly episodesService: EpisodesService) {}

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

    console.log(`Updating all podcasts`, podcastIdsWithRssFeed)
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
      .select(({ fn, val, eb }) => [
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
      .groupBy('podcasts.id')
      .orderBy('podcasts.id', 'desc')
      .execute()

    return rawMinifiedPodcastsToMinifiedPodcastDtos(rawPodcasts)
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

  async getPodcastById(podcastId: number, requestedByUserId?: number | null) {
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
        'uploadedByUserId',
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
    if (requestedByUserId) {
      isSavedByUser = (await db
        .selectFrom('savedPodcasts')
        .selectAll()
        .where('podcastId', '=', podcastId)
        .where('userId', '=', requestedByUserId)
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

  async rssAutocomplete(rssUrl: string) {
    try {
      const { podcast: podcastData } = await parsePodcastRss(rssUrl)
      return {
        name: podcastData.title || null,
        description: podcastData.description || null,
        link: podcastData.link || null,
        coverImage: podcastData.image?.url || podcastData.itunesImage || null,
        targetLanguage: podcastData.language || null
      }
    } catch (error) {
      console.error(error)
      throw new BadRequestException()
    }
  }

  async createPodcast(
    podcast: Omit<
      NewPodcast,
      'levels' | 'links' | 'targetLanguageId' | 'mediumLanguageId'
    > & {
      levels: string[]
      links: string[]
      targetLanguage: string
      mediumLanguage: string | null
    }
  ) {
    const { levels, links, targetLanguage, mediumLanguage, ...rest } = podcast

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

    const {
      podcast: remotePodcast,
      eTag,
      lastModified
    } = (await podcast.rss)
      ? await parsePodcastRss(podcast.rss)
      : { podcast: null, eTag: null, lastModified: null }

    const podcastId = (
      await db
        .insertInto('podcasts')
        .values({
          ...rest,
          levels: JSON.stringify(levels),
          links: JSON.stringify(links),
          targetLanguageId,
          mediumLanguageId,
          eTag,
          lastModified
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id

    if (remotePodcast) {
      await this.episodesService.createEpisodesFromFeed(
        remotePodcast.items,
        podcastId
      )
    }

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

  async removeSavedPodcast(userId: number, podcastId: number) {
    db.deleteFrom('savedPodcasts')
      .where('userId', '=', userId)
      .where('podcastId', '=', podcastId)
      .execute()
  }
}
