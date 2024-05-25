import {
  Controller,
  Get,
  Request,
  Post,
  UseGuards,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseFilePipeBuilder,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { PodcastsService } from './podcasts.service'

import { AuthGuard } from 'src/auth/auth.guard'
import { PodcastCreationDto } from './podcasts.validation'
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('/api/podcasts')
export class PodcastsController {
  constructor(private readonly podcastsService: PodcastsService) {}

  @Get('/')
  async findPodcasts(
  ) {
    return await this.podcastsService.getAllPodcasts()
  }

  @Get('/:podcastId')
  async getPodcastById(@Param('podcastId') podcastId: number) {
    return await this.podcastsService.getPodcastById(podcastId)
  }

  @Post('/')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('coverImage', {
      storage: diskStorage({
        destination: './public/dynamics/podcasts/covers',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`),
      })
    })
  )
  async createPodcast(
    @Body() createPodcastDto: PodcastCreationDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: 'jpeg' })
        .addMaxSizeValidator({ maxSize: 1000000 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false, // This makes the file optional
        })
    )
    coverImage: Express.Multer.File,
    @Request() req
  ) {
    console.log({ coverImage })
    return await this.podcastsService.createPodcast({
      name: createPodcastDto.name,
      description: createPodcastDto.description,
      coverImage: coverImage.filename,
      links: createPodcastDto.links,
      levels: createPodcastDto.levels,
      targetLanguage: createPodcastDto.targetLanguage,
      mediumLanguage: createPodcastDto.mediumLanguage,
      episodeCount: createPodcastDto.episodeCount,
      isActive: createPodcastDto.isActive ? 1 : 0,
      since: createPodcastDto.since,
      hasVideo: createPodcastDto.hasVideo ? 1 : 0,
      avarageEpisodeMinutesDuration:
        createPodcastDto.avarageEpisodeMinutesDuration,
      hasTranscript: createPodcastDto.hasTranscript ? 1 : 0,
      uploadedByUserId: req.userId as number
    })
  }
}
