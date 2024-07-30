import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength
} from 'class-validator'
import { IsStringOrNull } from 'src/episodes/episodes.validations'

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsEmail()
  email: string

  @IsNotEmpty()
  @IsString()
  learning: string

  @IsNotEmpty()
  @IsString()
  level: string

  @IsOptional()
  @IsStringOrNull()
  variant?: string

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string

  @IsBoolean()
  isCreator: boolean
}
