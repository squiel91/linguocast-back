import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString
} from 'class-validator'
import { ResourceType } from './comments.service'

export class CommentCreationDto {
  @IsIn(['podcasts', 'episodes'])
  resourceType: ResourceType

  @IsNumber()
  resourceId: number

  @IsNotEmpty()
  @IsString()
  content: string

  @IsOptional()
  @IsNumber()
  responseTo?: number
}

export class QueryListDto {
  @IsIn(['podcasts', 'episodes'])
  resourceType: ResourceType

  @IsNumberString()
  resourceId: string
}
