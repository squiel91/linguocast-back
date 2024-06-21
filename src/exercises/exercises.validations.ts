import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator'
import { Exercise } from './exercises.types'
import { BadRequestException } from '@nestjs/common'

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

// Exercise response
export class BaseExerciseResponseDto {
  @IsEnum(ExerciseType)
  type: Exercise['type']
}

export class MultipleChoiceExerciseResponseDto extends BaseExerciseResponseDto {
  @IsNumber()
  selected: number
}

export class SelectMultipleExerciseResponseDto extends BaseExerciseResponseDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  selected: number[]
}

export class FreeResponseExerciseResponseDto extends BaseExerciseResponseDto {
  @IsString()
  @IsNotEmpty()
  response: string
}

const isValidInteger = (value: unknown) => {
  return typeof value === 'number' && value >= 0 && value % 1 === 0
}

export const buildExerciseResponseOrThrow = (
  type: unknown,
  response: unknown
) => {
  if (typeof type !== 'string')
    throw new BadRequestException('Type is not a string')

  switch (type) {
    case ExerciseType.MultipleChoice:
      if (!isValidInteger(response))
        throw new BadRequestException('response should be a whole number.')
      return { type, response: response as number }
    case ExerciseType.SelectMutiple:
      if (
        !Array.isArray(response) ||
        !response.every(v => isValidInteger(v)) ||
        [...new Set(response)].length < response.length
      )
        throw new BadRequestException(
          'response should be an array of unique whole number.'
        )
      return { type, response: response as number[] }
    case ExerciseType.FreeResponse:
      if (
        !(typeof response === 'string') ||
        response.length === 0 ||
        response.length >= 500
      )
        throw new BadRequestException(
          'response should be string between 1 and 500 characters.'
        )
      return { type, response }
    default:
      throw new BadRequestException(`${type} is not a valid exercise type.`)
  }
}
