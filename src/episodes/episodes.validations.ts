import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator'
import { EpisodeTemplate } from './episodes.service'
import { AnyARecord } from 'dns'

@ValidatorConstraint({ async: false })
class IsStringOrNullConstraint implements ValidatorConstraintInterface {
  validate(value: AnyARecord) {
    return typeof value === 'string' || value === null
  }

  defaultMessage() {
    return 'Value must be a string or null'
  }
}

export function IsStringOrNull(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStringOrNullConstraint,
    })
  }
}

export class EpisodeTemplateQuery {
  @IsOptional()
  @IsIn(['detailed', 'succint'])
  template?: EpisodeTemplate
}

export class EpisodeCreationDto {
  @IsNotEmpty()
  @IsNumber()
  podcastId: string

  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @IsString()
  audio: string

  @IsOptional()
  @IsStringOrNull()
  image?: string | null

  @IsNotEmpty()
  @IsString()
  description: string
}

export class EpisodeUpdateDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  audio?: string

  @IsOptional()
  @IsStringOrNull()
  image?: string | null

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  transcript?: string

  @IsOptional()
  @IsBoolean()
  isListed?: boolean

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean
}

export class EpisodeReproductionDto {
  @IsOptional()
  @IsBoolean()
  hasCompleted?: boolean

  @IsOptional()
  @IsNumber()
  on?: number
}
