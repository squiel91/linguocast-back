import {
  IsNotEmpty,
  IsString,
  IsIn,
  IsEmail,
  IsOptional,
  MinLength,
  IsBoolean
} from 'class-validator'
import { IsStringOrNull } from 'src/episodes/episodes.validations'

export class AuthenticateUserDto {
  @IsEmail()
  email: string

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string
}

export class UserUpdateDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  learning?: string

  @IsOptional()
  @IsStringOrNull()
  variant?: string | null

  @IsOptional()
  @IsStringOrNull()
  avatar?: string | null

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'upper-intermediate', 'advanced'])
  level?: string

  @IsOptional()
  @IsBoolean()
  isProfilePrivate?: boolean

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean

  @IsOptional()
  @IsBoolean()
  canOthersContact?: boolean

  @IsOptional()
  @IsBoolean()
  isCreator?: boolean
}
