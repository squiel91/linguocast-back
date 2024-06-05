import {
  IsNotEmpty,
  IsString,
  IsIn,
  IsEmail,
  IsOptional,
  IsBooleanString,
  MinLength
} from 'class-validator'


export class AuthenticateUserDto {
  @IsEmail()
  email: string

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string
}

export class UserUpdateDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsNotEmpty()
  @IsString()
  learning: string

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'upper-intermediate', 'advanced'])
  level: string

  @IsNotEmpty()
  @IsBooleanString()
  isProfilePrivate: string

  @IsNotEmpty()
  @IsBooleanString()
  canOthersContact: string
}
