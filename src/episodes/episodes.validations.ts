import { IsBoolean, IsNumber, IsOptional } from 'class-validator'

export class EpisodeReproductionDto {
  @IsOptional()
  @IsBoolean()
  hasCompleted?: boolean

  @IsOptional()
  @IsNumber()
  on?: number
}
