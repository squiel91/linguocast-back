import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UnauthorizedException } from '@nestjs/common'
import { EpisodeReproductionDto } from './episodes.validations'
import { UserIdOr } from 'src/auth/auth.decorators'
import { EpisodesService } from './episodes.service'

@Controller('/api/episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Get('/:episodeId')
  async getEpisodeById(
    @UserIdOr(() => null) userId: number,
    @Param('episodeId') episodeId: number
  ) {
    return this.episodesService.getEpisodeById(episodeId, userId)
  }

  @Post('/:episodeId/reproductions')
  @HttpCode(HttpStatus.ACCEPTED)
  updateReproduction(
    @UserIdOr(() => {
      throw new UnauthorizedException()
    })
    userId: number,
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
