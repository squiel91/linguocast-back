import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator'
import { Exercise } from './exercises.types'

export enum ExerciseType {
  MultipleChoice = 'multiple-choice',
  SelectMutiple = 'select-multiple',
  FreeResponse = 'free-response'
}


class BaseExerciseDto {
  @IsOptional()
  @IsNumber()
  id?: number

  @IsOptional()
  @IsNumber()
  start: number

  @IsOptional()
  @IsNumber()
  duration: number
}

export class MultipleChoiceExerciseDto extends BaseExerciseDto {
  @IsEnum(ExerciseType)
  type: ExerciseType.MultipleChoice

  @IsString()
  question: string

  @IsString()
  correctChoice: string

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  incorrectChoices: string[]
}

export class SelectMultipleExerciseDto extends BaseExerciseDto {
  @IsEnum(ExerciseType)
  type: ExerciseType.SelectMutiple

  @IsString()
  question: string

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  correctChoices: string[]

  @IsArray()
  @IsString({ each: true })
  incorrectChoices: string[]
}

export class FreeResponseExerciseDto extends BaseExerciseDto {
  @IsEnum(ExerciseType)
  type: ExerciseType.FreeResponse

  @IsString()
  question: string

  @IsString()
  response: string
}

export class ExercisesDto {
  @IsNumber()
  episodeId: number

  @ValidateNested({ each: true })
  @Type(() => BaseExerciseDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: MultipleChoiceExerciseDto, name: ExerciseType.MultipleChoice },
        { value: SelectMultipleExerciseDto, name: ExerciseType.SelectMutiple },
        { value: FreeResponseExerciseDto, name: ExerciseType.FreeResponse }
      ]
    },
    keepDiscriminatorProperty: true
  })
  exercises: Exercise[]
}
