import { Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'

@Injectable()
export class LanguagesService {
  async getAllLanguages() {
    return await db
      .selectFrom('languages')
      .select(['id', 'languages.name'])
      .execute()
  }
}
