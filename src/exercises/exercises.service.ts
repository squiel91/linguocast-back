import { Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { Exercise } from './exercises.types'

@Injectable()
export class ExercisesService {
  async getEmbeddedExercisesIdsAndTimingAndCreatedAt(episodeId: number) {
    return await db
      .selectFrom('exercises')
      .select(['id', 'start', 'duration', 'createdAt'])
      .where('episodeId', '=', episodeId)
      .where('start', 'is not', null)
      .execute()
  }

  async saveExercises(episodeId: number, exercises: Exercise[]) {
    await db.transaction().execute(async trx => {
      // delete
      await trx
        .deleteFrom('exercises')
        .where('episodeId', '=', episodeId)
        .where(
          'id',
          'not in',
          exercises.map(({ id }) => id).filter(id => !!id)
        )
        .execute()

      // create new
      const exercisesToCreate = exercises.filter(({ id }) => !id)
      if (exercisesToCreate.length > 0) {
        await trx
          .insertInto('exercises')
          .values(
            exercisesToCreate.map(exercise => {
              const { start, duration, ...rawContent } = exercise
              return {
                episodeId,
                start,
                duration,
                content: JSON.stringify(rawContent)
              }
            })
          )
          .execute()
      }

      // modify existing
      console.log(exercises.filter(({ id }) => !!id))
      for (const exercise of exercises.filter(({ id }) => !!id)) {
        const { start, duration, ...rawContent } = exercise
        await trx
          .updateTable('exercises')
          .set({ content: JSON.stringify(rawContent), start, duration })
          .where('id', '=', exercise.id!)
          .execute()
      }
    })
  }

  async getEpisodeExercises(episodeId: number) {
    const exercises = await db
      .selectFrom('exercises')
      .select(['id', 'content', 'start', 'duration'])
      .where('episodeId', '=', episodeId)
      .execute()
    return exercises.map(
      exercise =>
        ({
          ...JSON.parse(exercise.content),
          id: exercise.id,
          start: exercise.start,
          duration: exercise.duration
        }) as Exercise
    )
  }
}
