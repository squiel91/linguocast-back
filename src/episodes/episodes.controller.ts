import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from '@nestjs/common'
import { EpisodeReproductionDto } from './episodes.validations'
import {
  UserIdOrNull,
  UserIdOrThrowUnauthorized
} from 'src/auth/auth.decorators'
import { EpisodesService } from './episodes.service'

@Controller('/api/episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Get('/:episodeId')
  async getEpisodeById(
    @UserIdOrNull() userId: number,
    @Param('episodeId') episodeId: number
  ) {
    return this.episodesService.getEpisodeById(episodeId, userId)
  }

  @Post('/:episodeId/reproductions')
  @HttpCode(HttpStatus.ACCEPTED)
  updateReproduction(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('episodeId') episodeId: number,
    @Body() episodeReproductionDto: EpisodeReproductionDto
  ) {
    return this.episodesService.updateReproduction(
      userId,
      episodeId,
      episodeReproductionDto.on,
      episodeReproductionDto.hasCompleted
    )
  }
}
