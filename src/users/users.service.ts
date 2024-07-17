import { ConflictException, Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { hash } from 'bcrypt'
import { generateAuthToken } from 'src/utils/auth.utils'
import UserService from 'src/user/user.service'

@Injectable()
export class UsersService {
  constructor(private readonly userService: UserService) {}

  async getUserName(email: string) {
    return await db
      .selectFrom('users')
      .select('name')
      .where('users.email', '=', email.trim().toLowerCase())
      .executeTakeFirst()
  }

  async viewUser(userId: number) {
    const userInfo = await db
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
      .executeTakeFirstOrThrow()

    if (userInfo.isProfilePrivate) {
      return {
        id: userInfo.id,
        name: userInfo.name,
        avatar: userInfo.avatar,
        isProfilePrivate: userInfo.isProfilePrivate,
      }
    }
    return userInfo
  }
  async createUser(
    rawEmail: string,
    name: string,
    learning: string,
    variant: string | null,
    level: string,
    password: string
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
          password: paswordHash
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id
    return {
      user: await this.userService.viewUser(userId),
      token: generateAuthToken(userId)
    }
  }
}
