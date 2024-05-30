import { IsNotEmpty, IsString } from 'class-validator'

export class CommentCreationDto {
  @IsNotEmpty()
  @IsString()
  message: string
}
