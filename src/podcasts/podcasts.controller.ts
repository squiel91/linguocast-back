import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseFilePipeBuilder,
  HttpStatus,
  Param,
  HttpCode,
  Delete,
  Patch,
  Query
} from '@nestjs/common'
import { PodcastsService } from './podcasts.service'

import { promises as fs } from 'fs'
import { AuthGuard } from 'src/auth/auth.guard'
import {
  PodcastCreationDto,
  PodcastRssCreationDto,
  PodcastSuggestionDto,
  PodcastUpdateDto
} from './podcasts.validation'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import {
  UserIdOrNull,
  UserIdOrThrowUnauthorized
} from 'src/auth/auth.decorators'

@Controller('/api')
export class PodcastsController {
  constructor(private readonly podcastsService: PodcastsService) {}

  @Get('/podcasts')
  async findPodcasts() {
    return await this.podcastsService.getAllPodcasts()
  }

  @Post('/creators/podcasts/rss')
  async createPodcastFromRss(
    @UserIdOrThrowUnauthorized() creatorId: number,
    @Body() podcastRssCreationDto: PodcastRssCreationDto
  ) {
    return await this.podcastsService.createPodcastFromRss(
      creatorId,
      podcastRssCreationDto.rss,
      podcastRssCreationDto.targetLanguage,
      podcastRssCreationDto.mediumLanguage,
      podcastRssCreationDto.levels
    )
  }

  @Get('/podcasts/:podcastId')
  async getPodcast(
    @Param('podcastId') podcastId: number,
    @UserIdOrNull() userId: number | null
  ) {
    return await this.podcastsService.getPodcastById(podcastId, userId)
  }

  @Get('/creators/podcasts/:podcastId/metrics')
  async getPodcastMetrics(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('podcastId') podcastId: number
  ) {
    return await this.podcastsService.getPodcastMetrics(userId, podcastId)
  }

  @Get('/podcasts/:podcastId/episodes')
  async getPodcastEpisodes(
    @UserIdOrNull() userId: number | null,
    @Param('podcastId') podcastId: number,
    @Query('from') fromEpisodeId?: number,
    @Query('size') size?: number
  ) {
    return await this.podcastsService.getPodcastEpisodes(
      podcastId,
      userId,
      fromEpisodeId,
      size
    )
  }

  @Post('/creators/podcasts/images')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './public/dynamics/podcasts/images',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`)
      })
    })
  )
  savePodcastImage(
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
    return `/dynamics/podcasts/images/${image.filename}`
  }

  @Post('/creators/podcasts/suggestions')
  async suggestPodcast(
    @UserIdOrNull() userId: number,
    @Body() podcastSuggestionDto: PodcastSuggestionDto
  ) {
    return await this.podcastsService.suggestPodcast(
      userId,
      podcastSuggestionDto.name,
      podcastSuggestionDto.targetLanguage,
      podcastSuggestionDto.mediumLanguage ?? null,
      podcastSuggestionDto.rss ?? null,
      podcastSuggestionDto.levels,
      podcastSuggestionDto.links
    )
  }

  @Post('/creators/podcasts')
  async createPodcast(
    @UserIdOrThrowUnauthorized() userId: number,
    @Body() createPodcastDto: PodcastCreationDto
  ) {
    // let coverImageName: string | null = null
    // if (createPodcastDto.coverImageUrl) {
    //   const url = new URL(createPodcastDto.coverImageUrl)
    //   const pathname = url.pathname
    //   const lastUrlPart = pathname.split('/')
    //   const extension = extname(lastUrlPart[lastUrlPart.length - 1])
    //   coverImageName = `${Date.now()}${extension}`

    //   const publicDir = join(
    //     __dirname,
    //     '..',
    //     '..',
    //     'public',
    //     'dynamics',
    //     'podcasts',
    //     'covers'
    //   )
    //   const filePath = join(publicDir, coverImageName)

    //   await fs.mkdir(publicDir, { recursive: true })
    //   await saveImageFromUrl(createPodcastDto.coverImageUrl, filePath)
    // }

    return await this.podcastsService.createPodcast(
      userId,
      null,
      createPodcastDto.name,
      createPodcastDto.targetLanguage,
      createPodcastDto.mediumLanguage,
      createPodcastDto.description,
      createPodcastDto.levels,
      createPodcastDto.links,
      createPodcastDto.image ?? null
    )
  }

  @Patch('/creators/podcasts/:podcastId')
  async updatePodcast(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('podcastId') podcastId: string,
    @Body() createUpdateDto: PodcastUpdateDto
  ) {
    await this.podcastsService.updatePodcast(
      userId,
      +podcastId,
      createUpdateDto.name,
      createUpdateDto.targetLanguage,
      createUpdateDto.mediumLanguage,
      createUpdateDto.description,
      createUpdateDto.levels,
      createUpdateDto.links,
      createUpdateDto.image,
      createUpdateDto.isListed
    )
  }

  @Post('/podcasts/:podcastId/update')
  @HttpCode(HttpStatus.ACCEPTED)
  async updatePodcastFromRss(@Param('podcastId') podcastId: number) {
    await this.podcastsService.updatePodcastFromRss(podcastId)
  }

  @Post('/podcasts/:podcastId/saves')
  @HttpCode(HttpStatus.CREATED)
  async savePodcast(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('podcastId') podcastId: number
  ) {
    await this.podcastsService.savePodcast(userId, podcastId)
  }

  @Delete('/podcasts/:podcastId/saves')
  @HttpCode(HttpStatus.CREATED)
  async removeSavedPodcast(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('podcastId') podcastId: number
  ) {
    await this.podcastsService.removeSavedPodcast(userId, podcastId)
  }

  @Get('/creators/podcasts/:podcastId/metrics')
  async creatorsPodcastMetrics(
    @UserIdOrThrowUnauthorized() creatorId: number,
    @Param('podcastId') podcastId: number
  ) {
    await this.podcastsService.creatorsPodcastMetrics(creatorId, +podcastId)
  }

  @Delete('/creators/podcasts/:podcastId')
  async deletePodcast(
    @UserIdOrThrowUnauthorized() creatorId: number,
    @Param('podcastId') podcastId: number
  ) {
    await this.podcastsService.deletePodcast(creatorId, +podcastId)
  }
}
