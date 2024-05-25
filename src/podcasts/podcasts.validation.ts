import { 
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsIn,
  IsUrl
} from 'class-validator'

export class PodcastCreationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMinSize(1)
  links: string[] | null;

  @IsNotEmpty()
  @IsString()
  targetLanguage: string;

  @IsOptional()
  @IsString()
  mediumLanguage: string | null;

  @IsArray()
  @IsIn(['beginner', 'intermediate', 'upper-intermediate', 'advanced'], {
    each: true,
  })
  @ArrayMinSize(1)
  levels: string[];

  @IsOptional()
  @IsInt()
  episodeCount: number | null;

  @IsOptional()
  @IsBoolean()
  isActive: boolean | null;

  @IsOptional()
  @IsDateString()
  since: string | null;

  @IsOptional()
  @IsBoolean()
  hasVideo: boolean | null;

  @IsOptional()
  @IsNumber()
  avarageEpisodeMinutesDuration: number | null;

  @IsOptional()
  @IsBoolean()
  hasTranscript: boolean | null;

  @IsOptional()
  @IsBoolean()
  isTranscriptFree: boolean | null;
}
