import { LANGUAGE, LANGUAGE_VARIANT } from 'src/constants/languages.constants'
import { converToSimplfied, converToTraditional } from 'src/words/words.utils'
import {
  FreeResponseExercise,
  MultipleChoiceExercise,
  RawBaseExercise,
  RawExercise,
  SelectMultipleExercise
} from './exercises.types'
import { ExerciseType } from './exercises.validations'
import { shufflePositions } from 'src/utils/random.utils'

type UserLanguagePreferences = {
  languageId: number
  variant: string
} | null

export const rawExerciseToExerciseDto = (
  rawExercise: RawExercise,
  userLanguagePreferences: UserLanguagePreferences
) => {
  let adjustedRawContent: string | null = null

  if (
    // TODO If the exercise is not asociated to a chinese podcast there there is no point in doing the convertion
    userLanguagePreferences &&
    userLanguagePreferences.languageId === LANGUAGE.mandarin
  ) {
    if (userLanguagePreferences.variant === LANGUAGE_VARIANT.simplified)
      adjustedRawContent = converToSimplfied(rawExercise.rawContent)
    else adjustedRawContent = converToTraditional(rawExercise.rawContent)
  }

  let adjustedContent = JSON.parse(adjustedRawContent ?? rawExercise.rawContent)
  let adjustedFeedback: number | number[] | null = null

  if (adjustedContent.type === ExerciseType.MultipleChoice) {
    const { correctChoice, incorrectChoices, ...selectMultipleRest } =
      adjustedContent as MultipleChoiceExercise
    const choices = [correctChoice, ...incorrectChoices]
    adjustedContent = {
      choices: shufflePositions(rawExercise.id, choices.length).map(
        shuffledPosition => choices[shuffledPosition]
      ),
      ...selectMultipleRest
    }
  }

  if (adjustedContent.type === ExerciseType.SelectMutiple) {
    const { correctChoices, incorrectChoices, ...selectMultipleRest } =
      adjustedContent as SelectMultipleExercise
    const choices = [...correctChoices, ...(incorrectChoices ?? [])]
    adjustedContent = {
      choices: shufflePositions(rawExercise.id, choices.length).map(
        shuffledPosition => choices[shuffledPosition]
      ),
      ...selectMultipleRest
    }
  }

  if (
    [ExerciseType.MultipleChoice, ExerciseType.SelectMutiple].includes(
      adjustedContent.type
    )
  ) {
    adjustedFeedback = JSON.parse(rawExercise.feedback)
  }

  if (adjustedContent.type === ExerciseType.FreeResponse) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { response, ...freeResponseRest } =
      adjustedContent as FreeResponseExercise
    adjustedContent = { ...freeResponseRest }
  }

  return {
    id: rawExercise.id,
    episodeId: rawExercise.episodeId,
    ...adjustedContent,
    start: rawExercise.start,
    duration: rawExercise.duration,
    score: rawExercise.score,
    feedback: adjustedFeedback ?? rawExercise.feedback,
    response: JSON.parse(rawExercise.rawResponse),
    respondedAt: rawExercise.respondedAt,
    updatedAt: rawExercise.updatedAt,
    createdAt: rawExercise.createdAt
  }
}

export const rawExercisesToExercisesDto = (
  rawExercises: RawExercise[],
  userLanguagePreferences: UserLanguagePreferences
) => {
  return rawExercises.map(rawExercise =>
    rawExerciseToExerciseDto(rawExercise, userLanguagePreferences)
  )
}

export const rawBaseExercisesToCreatorExercisesDto = (
  rawExercises: RawBaseExercise[]
) =>
  rawExercises.map(rawExercise => ({
    id: rawExercise.id,
    episodeId: rawExercise.episodeId,
    ...JSON.parse(rawExercise.rawContent),
    start: rawExercise.start,
    duration: rawExercise.duration,
    updatedAt: rawExercise.updatedAt,
    createdAt: rawExercise.createdAt
  }))
