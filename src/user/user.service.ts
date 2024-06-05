import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { compare } from 'bcrypt'
import { db } from 'src/db/connection.db'
import { generateAuthToken } from 'src/utils/auth.utils'

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
        'isProfilePrivate',
        'canOthersContact',
        'languages.name as learning',
        'level'
      ])
      .where('users.id', '=', userId)
      .executeTakeFirstOrThrow()
  }

  async editUser(
    userId: number,
    name: string,
    email: string,
    learningLanguageName: string,
    level: string,
    iPrivateProfile: boolean,
    canOthersContact: boolean,
    avatarFileName
  ) {
    // check if learningLanguageId is valid
    const learningLanguage = await db
      .selectFrom('languages')
      .select('id')
      .where('languages.name', '=', learningLanguageName)
      .executeTakeFirst()
    if (!learningLanguage) {
      throw new BadRequestException('Learning language not found')
    }
    const { id: learningLanguageId } = learningLanguage

    await db
      .updateTable('users')
      .where('id', '=', userId)
      .set({
        name,
        email,
        learningLanguageId,
        level,
        isProfilePrivate: iPrivateProfile ? 1 : 0,
        canOthersContact: canOthersContact ? 1 : 0,
        ...(avatarFileName ? { avatar: avatarFileName } : {})
      })
      .execute()

    return await this.viewUser(userId)
  }

  async getUserFeed(userId: number) {
    return {
      newEpisodes: await this.listSubscribedButNotListenedEpisodes(userId),
      subscribedPodcasts: await this.listUserPodcastSubscriptions(userId),
      listeningEpisodes: await this.listListenedButNotCompletedEpisodes(userId),
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
  //   // I will start with following episodes, then I complement with podcast's comments in the same language that the user is studing
  //   const { learningLanguageId } = await db
  //     .selectFrom('users')
  //     .where('users.id', '=', userId)
  //     .select('users.learningLanguageId')
  //     .executeTakeFirstOrThrow()

  //   return await db
  //     .selectFrom('comments')
  //     .selectFrom('savedPodcasts')
  //     .where('savedPodcasts.userId', '=', userId)
  //     .innerJoin('podcasts', 'podcasts.id', 'savedPodcasts.podcastId')
  //     .select(['id', 'name', 'coverImage'])
  //     .orderBy('savedPodcasts.createdAt', 'desc')
  //     .execute()
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
