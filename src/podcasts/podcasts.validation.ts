import { 
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
  IsIn,
  IsUrl
} from 'class-validator'
import { IsStringOrNull } from 'src/episodes/episodes.validations'

export class PodcastSuggestionDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsString()
  targetLanguage: string

  @IsOptional()
  @IsString()
  mediumLanguage: string | null

  @IsOptional()
  @IsString()
  rss: string

  @IsArray()
  @IsIn(['beginner', 'intermediate', 'upper-intermediate', 'advanced'], {
    each: true
  })
  @ArrayMinSize(1)
  levels: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[]
}

export class PodcastCreationDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  image: string

  @IsNotEmpty()
  @IsString()
  description: string

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  links: string[] | null

  @IsNotEmpty()
  @IsString()
  targetLanguage: string

  @IsOptional()
  @IsString()
  mediumLanguage: string | null

  @IsArray()
  @IsIn(['beginner', 'intermediate', 'upper-intermediate', 'advanced'], {
    each: true
  })
  @ArrayMinSize(1)
  levels: string[]
}

export class PodcastUpdateDto {
  @IsOptional()
  @IsString()
  name: string

  @IsOptional()
  @IsStringOrNull()
  image: string | null

  @IsOptional()
  @IsString()
  description: string

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  links: string[] | null

  @IsOptional()
  @IsString()
  targetLanguage: string | null

  @IsOptional()
  @IsString()
  mediumLanguage: string | null

  @IsOptional()
  @IsBoolean()
  isListed: boolean | null

  @IsOptional()
  @IsArray()
  @IsIn(['beginner', 'intermediate', 'upper-intermediate', 'advanced'], {
    each: true
  })
  @ArrayMinSize(1)
  levels: string[]
}

export class PodcastRssCreationDto {
  @IsNotEmpty()
  @IsString()
  rss: string

  @IsNotEmpty()
  @IsString()
  targetLanguage: string

  @IsOptional()
  @IsString()
  mediumLanguage: string | null

  @IsArray()
  @IsIn(['beginner', 'intermediate', 'upper-intermediate', 'advanced'], {
    each: true
  })
  @ArrayMinSize(1)
  levels: string[]
}
