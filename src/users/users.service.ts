import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { hash } from 'bcrypt'
import { generateAuthToken } from 'src/utils/auth.utils'
import UserService from 'src/user/user.service'
import {
  NotificationChannels,
  NotificationsService
} from 'src/notifications/notifications.service'

@Injectable()
export class UsersService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly userService: UserService
) {}

  async getUserName(email: string) {
    return await db
      .selectFrom('users')
      .select('name')
      .where('users.email', '=', email.trim().toLowerCase())
      .executeTakeFirst()
  }

  async viewUser(userId: number) {
    const user = await db
      .selectFrom('users')
      .leftJoin('languages', 'users.learningLanguageId', 'languages.id')
      .select([
        'users.id',
        'users.name',
        'users.avatar',
        'users.createdAt',
        'isProfilePrivate',
        'canOthersContact',
        'languages.name as learning',
        'level'
      ])
      .where('users.id', '=', userId)
      .executeTakeFirst()

    if (!user) {
      throw new NotFoundException('The user you are looking does not exist.')
    }

    if (user.isProfilePrivate) {
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        isProfilePrivate: user.isProfilePrivate,
      }
    }
    return user
  }
  async createUser(
    rawEmail: string,
    name: string,
    learning: string,
    variant: string | null,
    level: string,
    password: string,
    isCreator: boolean
  ) {
    const email = rawEmail.trim().toLowerCase()

    const checkAlreadyExistingEmail = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', email)
      .executeTakeFirst()

    if (checkAlreadyExistingEmail) {
      throw new ConflictException('Email already in use.')
    }

    const languageId = (
      await db
        .selectFrom('languages')
        .select('id')
        .where('name', '=', learning)
        .executeTakeFirstOrThrow()
    ).id

    const saltOrRounds = 10
    const paswordHash = await hash(password, saltOrRounds)

    const userId = (
      await db
        .insertInto('users')
        .values({
          email,
          name,
          learningLanguageId: languageId,
          languageVariant: variant,
          level,
          password: paswordHash,
          isCreator: isCreator ? 1 : 0
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id

    // Notifications
    if (isCreator) {
      this.notificationsService.sendNotification(
        NotificationChannels.CREATOR_SIGNUP,
        `[${name}](https://linguocast.com/users/${userId}) (${email}) just signed-up for ${learning + (variant ? '/' + variant : '')}`
      )
    } else {
      this.notificationsService.sendNotification(
        NotificationChannels.LEARNER_SIGNUP,
        `[${name}](https://linguocast.com/users/${userId}) (${email}) just signed-up for ${level} ${learning + (variant ? '/' + variant : '')}`
      )
    }

    return {
      user: await this.userService.viewUser(userId),
      token: generateAuthToken(userId)
    }
  }
}
