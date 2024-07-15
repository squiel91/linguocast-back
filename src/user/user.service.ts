import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { compare } from 'bcrypt'
import { db } from 'src/db/connection.db'
import { generateAuthToken } from 'src/utils/auth.utils'
import { daySinceEpoche } from 'src/utils/date.utils'
import { DailyActivity } from './user.types'
import { sql } from 'kysely'

@Injectable()
export default class UserService {
  async authenticateUser(rawEmail: string, password: string) {
    const email = rawEmail.trim().toLowerCase()

    const user = await db
      .selectFrom('users')
      .select(['id', 'password'])
      .where('email', '=', email)
      .executeTakeFirst()
    const isMatch = await compare(password, user.password)

    if (!isMatch) throw new UnauthorizedException()

    return {
      user: await this.viewUser(user.id),
      token: generateAuthToken(user.id)
    }
  }

  async getUserLearningJourney(userId: number) {
    const today = daySinceEpoche()

    const savedWords: number = (
      await db
        .selectFrom('userWords')
        .select(({ fn }) => [fn<number>('COUNT', ['wordId']).as('count')])
        .where('userId', '=', userId)
        .executeTakeFirstOrThrow()
    ).count

    const dueToReviewWords: number = (
      await db
        .selectFrom('userWords')
        .select(({ fn }) => fn<number>('COUNT', ['wordId']).as('count'))
        .where('userId', '=', userId)
        .where('reviewScheduledFor', '<=', today)
        .executeTakeFirstOrThrow()
    ).count

    const savedPodcasts: number = (
      await db
        .selectFrom('savedPodcasts')
        .select(({ fn }) => fn<number>('COUNT', ['podcastId']).as('count'))
        .where('userId', '=', userId)
        .executeTakeFirstOrThrow()
    ).count

    const comments: number = (
      await db
        .selectFrom('comments')
        .select(({ fn }) => fn<number>('COUNT', ['id']).as('count'))
        .where('userId', '=', userId)
        .executeTakeFirstOrThrow()
    ).count

    const oneWeekAgoDay = today - 6 // 7 days including today
    const dailyActivityRawHistory = await db
      .selectFrom('dailyActivity')
      .select(['day', 'wordsAddedCount', 'wordsReviewedCount'])
      .where('day', '>=', oneWeekAgoDay)
      .execute()

    const activityMap = new Map<number, DailyActivity>()
    dailyActivityRawHistory.forEach(
      ({ day, wordsAddedCount, wordsReviewedCount }) => {
        activityMap.set(day, {
          day,
          added: wordsAddedCount,
          reviewed: wordsReviewedCount
        })
      }
    )

    const wordsWeeklyHistory: DailyActivity[] = []
    for (let day = oneWeekAgoDay; day <= today; day++) {
      if (activityMap.has(day)) {
        wordsWeeklyHistory.push(activityMap.get(day))
      } else {
        wordsWeeklyHistory.push({
          day,
          added: 0,
          reviewed: 0
        })
      }
    }

    const listeningTime = (
      await db
        .selectFrom('reproductions')
        .innerJoin('episodes', 'episodes.id', 'reproductions.episodeId')
        .select(
          sql<number>`
          SUM(
            CASE
              WHEN reproductions.completedAt IS NOT NULL AND episodes.duration IS NOT NULL
              THEN episodes.duration
              ELSE reproductions.leftOn
            END
          )
        `.as('listeningTime')
        )
        .where('reproductions.userId', '=', userId)
        .executeTakeFirstOrThrow()
    ).listeningTime
    const episodesCompleted: number = (
      await db
        .selectFrom('reproductions')
        .select(({ fn }) => fn<number>('COUNT', ['episodeId']).as('count'))
        .where('completedAt', 'is not', null)
        .where('userId', '=', userId)
        .executeTakeFirstOrThrow()
    ).count

    const { correct: correctExercises, total: totalExercises } = await db
      .selectFrom('exerciseResponses')
      .select(({ fn }) => [
        fn<number>('SUM', ['score']).as('correct'),
        fn<number>('COUNT', ['exerciseId']).as('total')
      ])
      .where('userId', '=', userId)
      .executeTakeFirstOrThrow()

    return {
      savedWords,
      dueToReviewWords,
      savedPodcasts,
      comments,
      wordsWeeklyHistory,
      listeningTime,
      episodesCompleted,
      exercises: {
        correct: correctExercises,
        incorrectCount: totalExercises - correctExercises,
        total: totalExercises
      }
    }
  }

  getUserLanguagePreferences(userId: number | null) {
    return userId
      ? db
          .selectFrom('users')
          .select([
            'learningLanguageId as languageId',
            'languageVariant as variant',
            'level'
          ])
          .where('id', '=', userId)
          .executeTakeFirstOrThrow()
      : null
  }
  async viewUser(userId: number) {
    return await db
      .selectFrom('users')
      .leftJoin('languages', 'users.learningLanguageId', 'languages.id')
      .select([
        'users.id',
        'users.name',
        'email',
        'users.avatar',
        'users.createdAt',
        'isPremium',
        'isCreator',
        'isAdmin',
        'isProfilePrivate',
        'canOthersContact',
        'languages.name as learning',
        'level'
      ])
      .where('users.id', '=', userId)
      .executeTakeFirstOrThrow()
  }

  async editUser(
    userId?: number,
    name?: string,
    email?: string,
    learningLanguageName?: string,
    level?: string,
    isPrivateProfile?: boolean,
    canOthersContact?: boolean,
    avatar?: string | null,
    isCreator?: boolean
  ) {
    // check if learningLanguageId is valid
    let learningLanguageId: number | null = null
    if (learningLanguageName) {
      const learningLanguage = await db
        .selectFrom('languages')
        .select('id')
        .where('languages.name', '=', learningLanguageName)
        .executeTakeFirst()

      if (!learningLanguage) {
        throw new BadRequestException('Learning language not found')
      }

      learningLanguageId = learningLanguage.id
    }

    await db
      .updateTable('users')
      .where('id', '=', userId)
      .set({
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(learningLanguageId ? { learningLanguageId } : {}),
        ...(level ? { level } : {}),
        ...(isPrivateProfile
          ? { isProfilePrivate: isPrivateProfile ? 1 : 0 }
          : {}),
        ...(canOthersContact
          ? { canOthersContact: canOthersContact ? 1 : 0 }
          : {}),
        ...(isCreator ? { isCreator: isCreator ? 1 : 0 } : {}),
        ...(avatar === null || typeof avatar === 'string'
          ? { avatar: avatar }
          : {})
      })
      .execute()

    return await this.viewUser(userId)
  }

  async getUserFeed(userId: number) {
    return {
      newEpisodes: await this.listSubscribedButNotListenedEpisodes(userId),
      subscribedPodcasts: await this.listUserPodcastSubscriptions(userId),
      listeningEpisodes: await this.listListenedButNotCompletedEpisodes(userId),
      latestEpisodeComments: await this.listLatestEpisodeComments(userId),
      recommendedPodcasts: await this.recommendedPodcasts(userId)
    }
  }

  async listUserPodcastSubscriptions(userId: number) {
    return await db
      .selectFrom('savedPodcasts')
      .where('savedPodcasts.userId', '=', userId)
      .innerJoin('podcasts', 'podcasts.id', 'savedPodcasts.podcastId')
      .select(['id', 'name', 'coverImage'])
      .orderBy('savedPodcasts.createdAt', 'desc')
      .execute()
  }

  async listSubscribedButNotListenedEpisodes(userId: number) {
    return await db
      .selectFrom('savedPodcasts')
      .innerJoin('podcasts', 'savedPodcasts.podcastId', 'podcasts.id')
      .innerJoin('episodes', 'episodes.podcastId', 'podcasts.id')
      .leftJoin(
        db
          .selectFrom('reproductions')
          .select(['episodeId', 'completedAt', 'leftOn'])
          .where('reproductions.userId', '=', userId)
          .as('userReproductions'),
        'userReproductions.episodeId',
        'episodes.id'
      )
      .where('savedPodcasts.userId', '=', userId)
      .where('userReproductions.completedAt', 'is', null)
      .where('userReproductions.leftOn', 'is', null)
      .select([
        'episodes.id',
        'episodes.title',
        'episodes.image',
        'podcasts.name as podcastName',
        'podcasts.coverImage as podcastImage',
        'episodes.publishedAt',
        'episodes.duration'
      ])
      .orderBy('episodes.publishedAt', 'desc')
      .limit(12)
      .execute()
  }

  async listListenedButNotCompletedEpisodes(userId: number) {
    return await db
      .selectFrom('reproductions')
      .where('reproductions.userId', '=', userId)
      .where('reproductions.completedAt', 'is', null)
      .innerJoin('episodes', 'episodes.id', 'reproductions.episodeId')
      .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
      .select([
        'episodes.id',
        'episodes.title',
        'episodes.image',
        'podcasts.name as podcastName',
        'podcasts.coverImage as podcastImage',
        'episodes.publishedAt',
        'episodes.duration',
        'reproductions.leftOn'
      ])
      .orderBy('reproductions.updatedAt', 'desc')
      .limit(12)
      .execute()
  }
  async listLatestEpisodeComments(userId: number) {
    const { learningLanguageId } = await db
      .selectFrom('users')
      .where('users.id', '=', userId)
      .select('users.learningLanguageId')
      .executeTakeFirstOrThrow()

    return await db
      .selectFrom('comments')
      .innerJoin('episodes', 'episodes.id', 'comments.resourceId')
      .innerJoin('podcasts', 'episodes.podcastId', 'podcasts.id')
      .innerJoin('users', 'users.id', 'comments.userId')
      .leftJoin(
        db
          .selectFrom('savedPodcasts')
          .select(['savedPodcasts.podcastId', 'savedPodcasts.createdAt'])
          .where('savedPodcasts.userId', '=', userId)
          .as('userSavedPodcasts'),
        'userSavedPodcasts.podcastId',
        'podcasts.id'
      )
      .where('comments.resourceType', '=', 'episodes')
      .where('podcasts.targetLanguageId', '=', learningLanguageId)
      .select([
        'comments.id as id',
        'comments.content',
        'comments.userId as authorId',
        'users.name as authorName',
        'users.avatar as authorAvatar',
        'episodes.id as episodeId',
        'episodes.title as episodeTitle',
        'episodes.image as episodeImage',
        'podcasts.id as podcastId',
        'podcasts.name as podcastName',
        'podcasts.coverImage as podcastImage',
        'comments.createdAt',
        'comments.updatedAt'
      ])
      .orderBy(['userSavedPodcasts.createdAt desc', 'comments.createdAt desc'])
      .limit(8)
      .execute()
  }

  async recommendedPodcasts(userId: number) {
    const { learningLanguageId } = await db
      .selectFrom('users')
      .where('users.id', '=', userId)
      .select('users.learningLanguageId')
      .executeTakeFirstOrThrow()

    return await db
      .selectFrom('podcasts')
      .leftJoin(
        db
          .selectFrom('savedPodcasts')
          .select(['savedPodcasts.podcastId', 'savedPodcasts.createdAt'])
          .where('savedPodcasts.userId', '=', userId)
          .as('userSavedPodcasts'),
        'userSavedPodcasts.podcastId',
        'podcasts.id'
      )
      .where('podcasts.targetLanguageId', '=', learningLanguageId)
      .where('userSavedPodcasts.createdAt', 'is', null) // the user is not following the porcast
      .select(['id', 'name', 'coverImage'])
      .limit(12)
      .execute()
  }
}
