import { BadRequestException, Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { NewPodcast } from 'src/db/schema.db';
import { rawMinifiedPodcastsToMinifiedPodcastDtos } from './podcasts.mapper';
import { CommentsService } from 'src/comments/comments.service';
import { parseFeed } from 'podcast-partytime';
import axios from 'axios';
import { parsePodcastRss } from 'src/utils/parsing.utils';

@Injectable()
export class PodcastsService {
  constructor(private readonly commentsService: CommentsService) {}

  async getAllPodcasts() {
    const rawPodcasts = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'podcasts.targetLanguageId', 'languages.id')
      .leftJoin('savedPodcasts', 'podcasts.id', 'savedPodcasts.podcastId')
      .leftJoin('comments', 'podcasts.id', 'comments.podcastId')
      .select(({ fn, val }) => [
        'podcasts.id',
        'podcasts.name',
        fn<string>('SUBSTR', ['description', val(0), val(150)]).as(
          'description'
        ),
        'coverImage',
        'levels as rawLevels',
        'languages.name as targetLanguage',
        fn<number>('COUNT', ['savedPodcasts.podcastId']).as('savedCount'),
        fn<number>('COUNT', ['comments.podcastId']).as('commentsCount')
      ])
      .groupBy('podcasts.id')
      .orderBy('podcasts.id', 'desc')
      .execute()

    return rawMinifiedPodcastsToMinifiedPodcastDtos(rawPodcasts)
  }

  async getPodcastById(podcastId: number, requestedByUserId?: number | null) {
    const rawPodcast = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'podcasts.targetLanguageId', 'languages.id')
      .leftJoin('savedPodcasts', 'podcasts.id', 'savedPodcasts.podcastId')
      .select(({ fn, val }) => [
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
        fn<number>('COUNT', ['savedPodcasts.podcastId']).as('savedCount'),
        'podcasts.createdAt',
        'podcasts.updatedAt'
      ])
      .where('podcasts.id', '=', podcastId)
      .groupBy('podcasts.id')
      .executeTakeFirst()

    const episodes = await db
      .selectFrom('episodes')
      .select([
        'id',
        'title',
        'duration',
        'description',
        'episodes.contentUrl',
        'episodes.image',
        'publishedAt'
      ])
      .where('podcastId', '=', podcastId)
      .orderBy('id', 'desc')
      .limit(4)
      .execute()

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
      isSavedByUser,
      episodes
    }
  }

  async rssAutocomplete(rssUrl: string) {
    try {
      const podcastData = await parsePodcastRss(rssUrl)
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
    },
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

    const podcastId = (
      await db
        .insertInto('podcasts')
        .values({
          ...rest,
          levels: JSON.stringify(levels),
          links: JSON.stringify(links),
          targetLanguageId,
          mediumLanguageId
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id

    if (podcast.rss) {
      const podcastInfo = await parsePodcastRss(podcast.rss)
      // TODO: complete the rest of metadata

      db.insertInto('episodes')
        .values(
          podcastInfo.items
            .sort((a, b) =>
              new Date(a.pubDate) > new Date(b.pubDate) ? 1 : -1
            )
            .map((episode) => ({
              podcastId,
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

  async getCommentsForPodcast(podcastId: number) {
    return await this.commentsService.getCommentsForPodcast(podcastId)
  }

  async createComment(podcastId: number, userId: number, message: string) {
    return await this.commentsService.createComment(podcastId, userId, message)
  }
}
