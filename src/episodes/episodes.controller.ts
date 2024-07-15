import {
  Body,
  Controller,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  UploadedFiles,
  UseGuards,
  Delete
} from '@nestjs/common'
import { EpisodeCreationDto, EpisodeReproductionDto, EpisodeUpdateDto } from './episodes.validations'
import {
  UserIdOrNull,
  UserIdOrThrowUnauthorized
} from 'src/auth/auth.decorators'
import { EpisodesService } from './episodes.service'
import { EpisodeTemplateQuery } from './episodes.validations'
import { diskStorage } from 'multer'
import { FileInterceptor } from '@nestjs/platform-express'
import { extname } from 'path'
import { AuthGuard } from 'src/auth/auth.guard'

@Controller('/api')
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Get('/episodes')
  async listTinyPodcastEpisodes(@Query('podcastId') podcastId: string) {
    return this.episodesService.listTinyPodcastEpisodes(+podcastId)
  }

  @Get('/episodes/:episodeId/metrics')
  viewExerciseMetrics(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('episodeId') episodeId: number
  ) {
    return this.episodesService.viewEpisodeMetrics(userId, +episodeId)
  }

  @Post('/episodes/audios')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: './public/dynamics/episodes/audios',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`)
      })
    })
  )
  saveEpisodeAudio(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(mp3|mpeg|wav|ogg|aa)$/ })
        .addMaxSizeValidator({ maxSize: 1000 * 1024 * 50 }) // 50 mb
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        })
    )
    audio: Express.Multer.File
  ) {
    return `/dynamics/episodes/audios/${audio.filename}`
  }

  @Post('/episodes/images')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './public/dynamics/episodes/images',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`)
      })
    })
  )
  saveEpisodeImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 1000 * 1024 * 3 }) // 3 mb
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        })
    )
    image: Express.Multer.File
  ) {
    return `/dynamics/episodes/images/${image.filename}`
  }

  @Post('/episodes')
  async createEpisode(
    @UserIdOrThrowUnauthorized() userId: number,
    @Body() createEpisodeDto: EpisodeCreationDto
  ) {
    return await this.episodesService.createEpisode(
      userId,
      +createEpisodeDto.podcastId,
      createEpisodeDto.title,
      createEpisodeDto.audio,
      createEpisodeDto.description,
      createEpisodeDto.image
    )
  }

  @Patch('/creators/episodes/:episodeId')
  async updateEpisode(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('episodeId') episodeId: string,
    @Body() updateEpisodeDto: EpisodeUpdateDto
  ) {
    await this.episodesService.updateEpisode(userId, +episodeId, {
      title: updateEpisodeDto.title,
      audio: updateEpisodeDto.audio,
      image: updateEpisodeDto.image,
      description: updateEpisodeDto.description,
      transcript: updateEpisodeDto.transcript,
      isListed: updateEpisodeDto.isListed,
      isPremium: updateEpisodeDto.isPremium,
      isDeleted: updateEpisodeDto.isDeleted
    })
  }

  @Get('/creators/episodes/:episodeId')
  async getCreatorEpisodeById(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('episodeId') episodeId: number
  ) {
    return this.episodesService.getCreatorsEpisodeById(userId, episodeId)
  }

  @Get('/episodes/:episodeId')
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

  @Patch('/episodes/:episodeId/transcript') // deprecated
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

  @Post('/episodes/:episodeId/generate-exercises')
  async generateExercises(
    @UserIdOrThrowUnauthorized() _,
    @Param('episodeId') episodeId: number
  ) {
    return this.episodesService.generateExercises(episodeId)
  }

  @Post('/episodes/:episodeId/reproductions')
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

  @Delete('/creators/episodes/:epsiodeId')
  async deletePodcast(
    @UserIdOrThrowUnauthorized() creatorId: number,
    @Param('epsiodeId') epsiodeId: string
  ) {
    await this.episodesService.deleteEpisode(creatorId, +epsiodeId)
  }
}
