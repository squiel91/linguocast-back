import { Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { NewPodcast } from 'src/db/schema.db';
import { rawMinifiedPodcastsToMinifiedPodcastDtos } from './podcasts.mapper';

@Injectable()
export class PodcastsService {
  async getAllPodcasts() {
    const rawPodcasts = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'podcasts.targetLanguageId', 'languages.id')
      .leftJoin('savedPodcasts', 'podcasts.id', 'savedPodcasts.podcastId')
      .select(({ fn, val }) => [
        'podcasts.id',
        'podcasts.name',
        fn<string>('SUBSTR', ['description', val(0), val(150)]).as(
          'description',
        ),
        'coverImage',
        'levels as rawLevels',
        'languages.name as targetLanguage',
        fn<number>('COUNT', ['savedPodcasts.podcastId']).as('savedCount')
      ])
      .groupBy('podcasts.id')
      .orderBy('podcasts.id', 'desc')
      .execute();

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
        'description',
        'coverImage',
        'links as rawLinks',
        'levels as rawLevels',
        'languages.name as targetLanguage',
        'mediumLanguageId',
        'episodeCount',
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
      mediumLanguage,
      isSavedByUser
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
    console.log(podcast)
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

    return podcastId
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
