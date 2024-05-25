import { Injectable, UnauthorizedException } from '@nestjs/common';
import { db } from 'src/db/connection.db'
import { hash, compare } from 'bcrypt'
import { sign, verify } from 'jsonwebtoken'

const generateAuthToken = (userId: number) =>
  sign({ id: userId }, process.env.JWT_SECRET);

const decodeAuthToken = (token: string) => {
  try {
    return verify(token, process.env.JWT_SECRET) as { id: number };
  } catch (error) {
    return null
  }
}

@Injectable()
export class UsersService {
  async createUser(email: string, name: string, password: string) {
    // TODO: validate email is not already in the database

    const saltOrRounds = 10
    const paswordHash = await hash(password, saltOrRounds)

    const userId = (
      await db
        .insertInto('users')
        .values({ email, name, password: paswordHash })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id
    return {
      user: await this.getUserProfile(userId),
      token: generateAuthToken(userId)
    }
  }

  async getUserProfile(tokenOrUserId: string | number) {
    let userId: number
    if (typeof tokenOrUserId === 'number') {
      userId = tokenOrUserId
    } else {
      const payload = decodeAuthToken(tokenOrUserId)
      if (!payload) throw new UnauthorizedException()
      userId = payload.id
    }

    return await db
      .selectFrom('users')
      .select(['id', 'name'])
      .where('id', '=', userId)
      .executeTakeFirstOrThrow()
  }

  async authenticateUser(email: string, password: string) {
    const user = await db
      .selectFrom('users')
      .select(['id', 'password'])
      .where('email', '=', email)
      .executeTakeFirst();
    const isMatch = await compare(password, user.password);

    if (!isMatch) throw new UnauthorizedException();

    return {
      user: await this.getUserProfile(user.id),
      token: generateAuthToken(user.id)
    }
  }
}
