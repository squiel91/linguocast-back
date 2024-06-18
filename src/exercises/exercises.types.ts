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

