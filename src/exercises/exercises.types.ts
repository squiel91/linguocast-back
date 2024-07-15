interface BaseExercise {
  id?: number // if present, it means to update the resource
  start?: number // seconds
  duration?: number
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'multiple-choice'
  question: string
  correctChoice: string
  incorrectChoices: string[]
}

export interface SelectMultipleExercise extends BaseExercise {
  type: 'select-multiple'
  question: string
  correctChoices: string[]
  incorrectChoices: string[]
}

export interface FreeResponseExercise extends BaseExercise {
  type: 'free-response'
  question: string
  response: string
}

export type Exercise =
  | MultipleChoiceExercise
  | SelectMultipleExercise
  | FreeResponseExercise

export interface RawBaseExercise {
  id: number
  episodeId: number
  rawContent: string
  start: number | null
  duration: number | null
  updatedAt: Date
  createdAt: Date
}

export interface RawCreatorExercise extends RawBaseExercise {
  responsesCount: number
  correctCount: number
}

export interface RawExercise extends RawBaseExercise {
  rawResponse: string | null
  score: number | null
  feedback: string | null
  respondedAt: Date | null
}

// Exercise response
interface MultipleChoiceExerciseResponse {
  type: 'multiple-choice'
  response: number
}
interface SelectMultipleExerciseResponse {
  type: 'select-multiple'
  response: number[]
}

interface FreeResponseExerciseResponse {
  type: 'free-response'
  response: string
}

export type ExerciseResponse =
  | MultipleChoiceExerciseResponse
  | SelectMultipleExerciseResponse
  | FreeResponseExerciseResponse
