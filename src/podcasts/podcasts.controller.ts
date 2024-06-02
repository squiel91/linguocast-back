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
  UnauthorizedException,
  Query
} from '@nestjs/common'
import { PodcastsService } from './podcasts.service'

import { promises as fs } from 'fs'
import { AuthGuard } from 'src/auth/auth.guard'
import { PodcastCreationDto } from './podcasts.validation'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { UserIdOr } from 'src/auth/auth.decorators'
import { CommentCreationDto } from 'src/comments/comments.validation'
import { saveImageFromUrl } from 'src/utils/file.utils'

@Controller('/api/podcasts')
export class PodcastsController {
  constructor(private readonly podcastsService: PodcastsService) {}

  @Get('/')
  async findPodcasts() {
    return await this.podcastsService.getAllPodcasts()
  }

  @Post('/rss')
  async rssAutocomplete(@Body('rss') rss: string) {
    return await this.podcastsService.rssAutocomplete(rss)
  }

  @Get('/:podcastId')
  async getPodcast(
    @Param('podcastId') podcastId: number,
    @UserIdOr(() => null) userId: number | null
  ) {
    return await this.podcastsService.getPodcastById(podcastId, userId)
  }

  @Get('/:podcastId/episodes')
  async getPodcastEpisodes(
    @UserIdOr(() => null) userId: number | null,
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

  @Post('/')
  @UseGuards(AuthGuard) // TODO: check if this is necessary
  @UseInterceptors(
    FileInterceptor('coverImageFile', {
      storage: diskStorage({
        destination: './public/dynamics/podcasts/covers',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`),
      })
    })
  )
  async createPodcast(
    @UserIdOr(() => {
      throw new UnauthorizedException()
    })
    userId: number,
    @Body() createPodcastDto: PodcastCreationDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|svg)$/ })
        .addMaxSizeValidator({ maxSize: 1000 * 1024 * 3 }) // 3 mb
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false
        })
    )
    coverImageFile: Express.Multer.File | undefined,
  ) {
    let coverImageName: string | null = null
    if (createPodcastDto.coverImageUrl) {
      // const mimeToExt = {
      //   'image/jpeg': 'jpg',
      //   'image/jpg': 'jpg',
      //   'image/png': 'png',
      //   'image/gif': 'gif',
      //   'image/svg+xml': 'svg',
      //   'image/webp': 'webp'
      // }

      // const response = await axios.get(createPodcastDto.coverImageUrl, {
      //   responseType: 'blob'
      // })

      // const contentType = response.headers['content-type']

      // const extension = mimeToExt[contentType] || 'bin' // Default to 'bin' if not found

      const hell = createPodcastDto.coverImageUrl.split('/')
      const extension = extname(hell[hell.length - 1])
      coverImageName = `${Date.now()}.${extension}`

      // const file = new File([response.data], fileName, {
      //   type: response.data.type
      // })

      // Define the directory and file path
      const publicDir = join(
        __dirname,
        '..',
        '..',
        'public',
        'dynamics',
        'podcasts',
        'covers'
      )
      const filePath = join(publicDir, coverImageName)

      await fs.mkdir(publicDir, { recursive: true })
      await saveImageFromUrl(createPodcastDto.coverImageUrl, filePath)
    }

    return await this.podcastsService.createPodcast({
      name: createPodcastDto.name,
      description: createPodcastDto.description,
      coverImage: coverImageFile?.filename || coverImageName,
      links: createPodcastDto.links,
      levels: createPodcastDto.levels,
      rss: createPodcastDto.rss,
      targetLanguage: createPodcastDto.targetLanguage,
      mediumLanguage: createPodcastDto.mediumLanguage,
      episodeCount: createPodcastDto.episodeCount,
      isActive: createPodcastDto.isActive ? 1 : 0,
      since: createPodcastDto.since,
      hasVideo: createPodcastDto.hasVideo ? 1 : 0,
      avarageEpisodeMinutesDuration:
        createPodcastDto.avarageEpisodeMinutesDuration,
      hasTranscript: createPodcastDto.hasTranscript ? 1 : 0,
      uploadedByUserId: userId
    })
  }

  @Post('/:podcastId/update')
  @HttpCode(HttpStatus.ACCEPTED)
  async updatePodcastFromRss(@Param('podcastId') podcastId: number) {
    await this.podcastsService.updatePodcastFromRss(podcastId)
  }

  @Post('/:podcastId/saves')
  @HttpCode(HttpStatus.CREATED)
  async savePodcast(
    @UserIdOr(() => {
      throw new UnauthorizedException()
    })
    userId: number,
    @Param('podcastId') podcastId: number
  ) {
    await this.podcastsService.savePodcast(userId, podcastId)
  }

  @Delete('/:podcastId/saves')
  @HttpCode(HttpStatus.CREATED)
  async removeSavedPodcast(
    @UserIdOr(() => {
      throw new UnauthorizedException()
    })
    userId: number,
    @Param('podcastId') podcastId: number
  ) {
    await this.podcastsService.removeSavedPodcast(userId, podcastId)
  }

  @Get('/:podcastId/comments')
  async listComments(@Param('podcastId') podcastId: number) {
    return await this.podcastsService.getCommentsForPodcast(podcastId)
  }

  @Post('/:podcastId/comments')
  async createComment(
    @UserIdOr(() => {
      throw new UnauthorizedException()
    })
    userId: number,
    @Param('podcastId') podcastId: number,
    @Body() commentCreationDto: CommentCreationDto
  ) {
    return await this.podcastsService.createComment(
      podcastId,
      userId,
      commentCreationDto.message
    )
  }

  // TODO add comment remove and edit
}
