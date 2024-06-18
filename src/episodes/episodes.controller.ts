import {
  Body,
  Controller,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query
} from '@nestjs/common'
import { EpisodeReproductionDto } from './episodes.validations'
import {
  UserIdOrNull,
  UserIdOrThrowUnauthorized
} from 'src/auth/auth.decorators'
import { EpisodesService } from './episodes.service'
import { EpisodeTemplateQuery } from './episodes.validations'

@Controller('/api/episodes')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Get('/')
  async listTinyPodcastEpisodes(@Query('podcastId') podcastId: string) {
    return this.episodesService.listTinyPodcastEpisodes(+podcastId)
  }

  @Get('/:episodeId')
  async getEpisodeById(
    @UserIdOrNull() userId: number | null,
    @Param('episodeId') episodeId: number,
    @Query() episodeTemplateQuery: EpisodeTemplateQuery
  ) {
    return this.episodesService.getEpisodeById(
      episodeId,
      userId,
      episodeTemplateQuery.template ?? 'detailed'
    )
  }

  @Patch('/:episodeId/transcript')
  async updateEpisodeTranscript(
    @UserIdOrThrowUnauthorized() _,
    @Param('episodeId') episodeId: number,
    @Body('autogenerate') autogenerate?: boolean,
    @Body('transcript') transcript?: string
  ) {
    return this.episodesService.updateTranscript(
      episodeId,
      autogenerate ?? false,
      transcript
    )
  }

  @Post('/:episodeId/generate-exercises')
  async generateExercises(
    @UserIdOrThrowUnauthorized() _,
    @Param('episodeId') episodeId: number
  ) {
    return this.episodesService.generateExercises(episodeId)
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
