import { Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { Embedded } from './embeddeds.dto'
import { converToSimplfied, converToTraditional } from 'src/words/words.utils'
import { ExercisesService } from 'src/exercises/exercises.service'

@Injectable()
export class EmbeddedsService {
  constructor(private readonly exercisesService: ExercisesService) {}

  async storeEmbeddeds(episodeId: number, embeddeds: Embedded[]) {
    await db.transaction().execute(async trx => {
      const embeddedsToModify = embeddeds.filter(({ id }) => !!id)
      const embeddedsToCreate = embeddeds.filter(({ id }) => !id)

      // delete
      await trx
        .deleteFrom('embeddeds')
        .where('episodeId', '=', episodeId)
        .where(
          'id',
          'not in',
          embeddedsToModify.map(({ id }) => id)
        )
        .execute()

      // create new
      if (embeddedsToCreate.length > 0) {
        await trx
          .insertInto('embeddeds')
          .values(
            embeddedsToCreate.map(({ start, duration, type, ...rest }) => ({
              episodeId,
              type,
              start,
              duration,
              content: JSON.stringify(rest)
            }))
          )
          .execute()
      }

      // modify existing
      for (const { id, start, duration, type, ...rest } of embeddedsToModify) {
        await trx
          .updateTable('embeddeds')
          .set({
            type,
            start,
            duration,
            content: JSON.stringify(rest)
          })
          .where('id', '=', id)
          .execute()
      }
    })
  }

  async listEpisodeEmbeddeds(userId: number | null, episodeId: number) {
    const userLanguage = await db
      .selectFrom('users')
      .select(['learningLanguageId', 'languageVariant'])
      .where('id', '=', userId)
      .executeTakeFirst()

    const rawEmbeddeds = await db
      .selectFrom('embeddeds')
      .select(['id', 'type', 'content', 'start', 'duration', 'createdAt'])
      .where('episodeId', '=', episodeId)
      .execute()

    const exercisesEmbeddeds = (
      await this.exercisesService.getEmbeddedExercisesIdsAndTimingAndCreatedAt(
        episodeId
      )
    ).map(({ id: exerciseId, ...rest }) => ({
      type: 'exercise',
      content: JSON.stringify({ exerciseId }),
      ...rest
    }))

    console.log({ exercisesEmbeddeds })

    return [...rawEmbeddeds, ...exercisesEmbeddeds].map(
      ({ content: rawcontent, type, ...rest }) => {
        const content = JSON.parse(rawcontent)
        if (userLanguage && userLanguage.learningLanguageId === 2) {
          if (type === 'note') {
            if (userLanguage.languageVariant === 'simplified')
              content.content = converToSimplfied(content.content)
            else content.content = converToTraditional(content.content)
          }
        }
        return {
          ...rest,
          ...content,
          type
        }
      }
    )
  }
}
