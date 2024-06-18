import { IsBoolean, IsIn, IsNumber, IsOptional } from 'class-validator'
import { EpisodeTemplate } from './episodes.service'

export class EpisodeTemplateQuery {
  @IsOptional()
  @IsIn(['detailed', 'succint'])
  template?: EpisodeTemplate
}

export class EpisodeReproductionDto {
  @IsOptional()
  @IsBoolean()
  hasCompleted?: boolean

  @IsOptional()
  @IsNumber()
  on?: number
}
