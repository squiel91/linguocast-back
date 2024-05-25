import { Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { NewPodcast } from 'src/db/schema.db';
import { rawMinifiedPodcastToMinifiedPodcastDto, rawMinifiedPodcastsToMinifiedPodcastDtos } from './podcasts.mapper';

@Injectable()
export class PodcastsService {
  async getAllPodcasts() {
    const rawPodcasts = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'podcasts.targetLanguageId', 'languages.id')
      .select(({ fn, val }) => [
        'podcasts.id',
        'podcasts.name',
        fn<string>('SUBSTR', ['description', val(0), val(150)]).as(
          'description',
        ),
        'coverImage',
        'levels as rawLevels',
        'languages.name as targetLanguage'
      ])
      .orderBy('podcasts.id', 'desc')
      .execute();

    return rawMinifiedPodcastsToMinifiedPodcastDtos(rawPodcasts)
  }
  
  async getPodcastById(podcastId: number) {
    const rawPodcast = await db
      .selectFrom('podcasts')
      .innerJoin('languages', 'podcasts.targetLanguageId', 'languages.id')
      .select([
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
        'podcasts.createdAt',
        'podcasts.updatedAt'
      ])
      .where('podcasts.id', '=', podcastId)
      .executeTakeFirst();

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

    return {
      ...podcastWithoutLevelsAndLinksAndMediumLanguageId,
      links: JSON.parse(rawLinks),
      levels: JSON.parse(rawLevels),
      mediumLanguage
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

    console.log({ targetLanguageId, mediumLanguageId })

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
}
