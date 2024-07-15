import { BadRequestException, Injectable } from '@nestjs/common'
import { db } from 'src/db/connection.db'
import {
  Exercise,
  ExerciseResponse,
  FreeResponseExercise,
  MultipleChoiceExercise,
  SelectMultipleExercise
} from './exercises.types'
import {
  rawBaseExercisesToCreatorExercisesDto,
  rawExerciseToExerciseDto,
  rawExercisesToExercisesDto
} from './exercises.mapper'
import UserService from 'src/user/user.service'
import { ExerciseType } from './exercises.validations'
import { getFreeResponseExercisesCorrection } from 'src/integrations/open-ai.integrations'
import { Level } from 'src/types/general.types'
import { LANGUAGE } from 'src/constants/languages.constants'
import { shufflePositions } from 'src/utils/random.utils'

@Injectable()
export class ExercisesService {
  constructor(private readonly userService: UserService) {}

  async viewExercise(userId: number | null, exerciseId: number) {
    const rawExercise = await this.baseExerciseQuery(userId)
      .where('id', '=', exerciseId)
      .executeTakeFirstOrThrow()

    return rawExerciseToExerciseDto(
      rawExercise,
      await this.userService.getUserLanguagePreferences(userId)
    )
  }

  async getEpisodeExercises(userId: number | null, episodeId: number) {
    const rawExercises = await this.baseExerciseQuery(userId)
      .where('episodeId', '=', episodeId)
      .execute()

    return rawExercisesToExercisesDto(
      rawExercises,
      await this.userService.getUserLanguagePreferences(userId)
    )
  }

  async listExerciseResponses(exerciseId: number) {
    const rawResponses = await db
      .selectFrom('exerciseResponses')
      .innerJoin('users', 'users.id', 'exerciseResponses.userId')
      .select([
        'exerciseResponses.score',
        'exerciseResponses.response as rawResponse',
        'exerciseResponses.feedback as rawFeedback',
        'exerciseResponses.createdAt',
        'exerciseResponses.userId',
        'users.name as userName',
        'users.avatar as userAvatar'
      ])
      .where('exerciseId', '=', exerciseId)
      .execute()

    return Promise.all(
      rawResponses.map(async ({ rawResponse, rawFeedback, ...rest }) => {
        // here the response is based on the suffled transformation. We have to unshuffle.
        let processedResponse = JSON.parse(rawResponse)

        const exercise = JSON.parse(
          (
            await db
              .selectFrom('exercises')
              .select('exercises.content')
              .where('exercises.id', '=', exerciseId)
              .executeTakeFirstOrThrow()
          ).content
        ) as Exercise

        console.log({ exercise })
        if (
          exercise.type === 'multiple-choice' ||
          exercise.type === 'select-multiple'
        ) {
          const shuffledOptions = shufflePositions(
            exerciseId,
            exercise.type === 'multiple-choice'
              ? exercise.incorrectChoices.length + 1
              : exercise.incorrectChoices.length +
                  exercise.correctChoices.length
          )
          if (exercise.type === 'multiple-choice') {
            processedResponse = shuffledOptions[processedResponse as number]
          }
          if (exercise.type === 'select-multiple') {
            console.log({ processedResponse })
            processedResponse = (processedResponse as number[]).map(
              responseIndex => shuffledOptions[responseIndex]
            )
          }
        }
        return {
          response: processedResponse,
          feedback: JSON.parse(rawFeedback),
          ...rest
        }
    }))
  }

  async getCreatorEpisodeExercises(userId: number, episodeId: number) {
    const rawExercises = await db
      .selectFrom('exercises')
      .leftJoin(
        db
          .selectFrom('exerciseResponses')
          .select(({ fn }) => [
            'exerciseId',
            fn<number>('SUM', ['score']).as('correctCount'),
            fn<number>('COUNT', ['userId']).as('rawResponsesCount')
          ])
          .groupBy('exerciseId')
          .as('userExerciseResponsesCount'),
        'exercises.id',
        'userExerciseResponsesCount.exerciseId'
      )
      .select(({ fn, val }) => [
        'exercises.id',
        'exercises.episodeId',
        'exercises.content as rawContent',
        'exercises.start',
        'exercises.duration',
        'exercises.updatedAt',
        'userExerciseResponsesCount.correctCount',
        fn<number>('IFNULL', [
          'userExerciseResponsesCount.rawResponsesCount',
          val(0)
        ]).as('responsesCount'),
        'exercises.createdAt'
      ])
      .where('episodeId', '=', episodeId)
      .execute()

    return rawBaseExercisesToCreatorExercisesDto(rawExercises)
  }

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
      const exerciseIdsToDelete = (
        await trx
          .selectFrom('exercises')
          .select('id')
          .where('episodeId', '=', episodeId)
          .where(
            'id',
            'not in',
            exercises.map(({ id }) => id).filter(id => !!id)
          )
          .execute()
      ).map(({ id }) => id)

      await trx
        .deleteFrom('exerciseResponses')
        .where('exerciseId', 'in', exerciseIdsToDelete)
        .execute()

      await trx
        .deleteFrom('exercises')
        .where('episodeId', '=', episodeId)
        .where('id', 'in', exerciseIdsToDelete)
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

  baseExerciseQuery(userId: number | null) {
    return db
      .selectFrom('exercises')
      .leftJoin(
        db
          .selectFrom('exerciseResponses')
          .selectAll()
          .where('exerciseResponses.userId', '=', userId)
          .as('userExerciseResponses'),
        'exercises.id',
        'userExerciseResponses.exerciseId'
      )
      .select([
        'exercises.id',
        'exercises.episodeId',
        'exercises.content as rawContent',
        'exercises.start',
        'exercises.duration',
        'exercises.updatedAt',
        'exercises.createdAt',
        'userExerciseResponses.response as rawResponse',
        'userExerciseResponses.score',
        'userExerciseResponses.feedback',
        'userExerciseResponses.createdAt as respondedAt'
      ])
  }

  async recordExerciseResponse(
    userId: number,
    exerciseId: number,
    exerciseResponse: ExerciseResponse
  ) {
    const { type, response: userResponse } = exerciseResponse

    let score: number
    let feedback: unknown = null
    switch (type) {
      case ExerciseType.MultipleChoice:
        const { rawContent: multipleChoiceRawContent } = await db
          .selectFrom('exercises')
          .select('exercises.content as rawContent')
          .where('exercises.id', '=', exerciseId)
          .executeTakeFirstOrThrow()

        const multipleChoiceExercise = JSON.parse(
          multipleChoiceRawContent
        ) as MultipleChoiceExercise
        // runtime check
        if (multipleChoiceExercise.type !== 'multiple-choice') {
          throw new BadRequestException(
            `The exercise type ('select-multiple') does not match the response exericise type (${multipleChoiceExercise.type}).`
          )
        }

        const multipleChoiceShuffledOptions = shufflePositions(
          exerciseId,
          multipleChoiceExercise.incorrectChoices.length + 1
        )
        const correctOptionIndex = multipleChoiceShuffledOptions.findIndex(
          v => v === 0
        )
        if (correctOptionIndex === userResponse) {
          score = 1
        } else {
          score = 0
          feedback = correctOptionIndex
        }
        break
      case ExerciseType.SelectMutiple:
        const { rawContent: selectMultipleRawContent } = await db
          .selectFrom('exercises')
          .select('exercises.content as rawContent')
          .where('exercises.id', '=', exerciseId)
          .executeTakeFirstOrThrow()

        const selectMultipleExercise = JSON.parse(
          selectMultipleRawContent
        ) as SelectMultipleExercise
        // runtime check
        if (selectMultipleExercise.type !== 'select-multiple') {
          throw new BadRequestException(
            `The exercise type ('select-multiple') does not match the response exericise type (${selectMultipleExercise.type}).`
          )
        }

        const selectMultipleShuffledOptions = shufflePositions(
          selectMultipleExercise.id,
          selectMultipleExercise.correctChoices.length +
            selectMultipleExercise.incorrectChoices.length
        )
        if (
          selectMultipleExercise.correctChoices.length ===
            userResponse.length &&
          // means that it is exactely the same because was validated that does not repeat
          userResponse.every(
            index =>
              selectMultipleShuffledOptions[index] <
              selectMultipleExercise.correctChoices.length
          )
        ) {
          score = 1
        } else {
          // there is a correct answer not selected.
          score = 0
          feedback = selectMultipleExercise.correctChoices.map((_, index) =>
            selectMultipleShuffledOptions.findIndex(i => i === index)
          )
        }
        break
      case ExerciseType.FreeResponse:
        const {
          podcastLanguage,
          podcastLanguageId,
          rawPodcastLevels,
          rawContent: freeResponseRawContent
        } = await db
          .selectFrom('exercises')
          .innerJoin('episodes', 'episodes.id', 'exercises.episodeId')
          .innerJoin('podcasts', 'podcasts.id', 'episodes.podcastId')
          .innerJoin('languages', 'languages.id', 'podcasts.targetLanguageId')
          .select([
            'exercises.content as rawContent',
            'languages.name as podcastLanguage',
            'languages.id as podcastLanguageId',
            'podcasts.levels as rawPodcastLevels'
          ])
          .where('exercises.id', '=', exerciseId)
          .executeTakeFirstOrThrow()

        const freeResponseExercise = JSON.parse(
          freeResponseRawContent
        ) as FreeResponseExercise
        const podcastLevels = JSON.parse(rawPodcastLevels) as Level[]
        // runtime check
        if (freeResponseExercise.type !== 'free-response') {
          throw new BadRequestException(
            `The exercise type ('free-response') does not match the response exericise type (${freeResponseExercise.type}).`
          )
        }

        const {
          languageId: userLanguageId,
          variant: userVariant,
          level: userLevel
        } = (await this.userService.getUserLanguagePreferences(userId))!

        let level: Level
        let language: string

        if (podcastLanguageId === userLanguageId) {
          if (podcastLevels.includes(userLevel as Level)) {
            level = userLevel as Level
            // return the closest one
          } else {
            level = podcastLevels[0] // draw a random level
          }

          if (podcastLanguageId === LANGUAGE.mandarin) {
            language = `mandaring chinese (${userVariant} writing)`
          } else {
            language = podcastLanguage
          }
        }

        const { isCorrect, feedback: automaticfeedback } =
          await getFreeResponseExercisesCorrection(
            freeResponseExercise.question,
            freeResponseExercise.response,
            userResponse,
            language,
            level
          )
        score = isCorrect ? 1 : 0
        feedback = automaticfeedback
        break
      default:
        throw new BadRequestException(`${type} is not a  valid exercise type.`)
    }

    await db
      .insertInto('exerciseResponses')
      .values({
        userId,
        exerciseId,
        response: JSON.stringify(userResponse),
        score,
        feedback: JSON.stringify(feedback)
      })
      .execute()

    return { score, feedback }
  }
}
