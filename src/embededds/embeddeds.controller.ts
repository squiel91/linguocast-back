import { EmbeddedsService } from './embeddeds.service'
import { UserIdOrNull, UserIdOrThrowUnauthorized } from 'src/auth/auth.decorators'
import { EmbeddedsDto } from './embeddeds.validations'
import {
  Body,
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { extname } from 'path'
import { diskStorage } from 'multer'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('/api/embeddeds')
export class EmbeddedsController {
  constructor(private readonly embeddedsService: EmbeddedsService) {}

  @Post('/')
  storeEmbeddeds(
    @UserIdOrThrowUnauthorized() _,
    @Body() embeddedsDto: EmbeddedsDto
  ) {
    return this.embeddedsService.storeEmbeddeds(
      embeddedsDto.episodeId,
      embeddedsDto.embeddeds
    )
  }

  @Get('/')
  listEmbeddeds(
    @UserIdOrNull() userId: number | null,
    @Query('episodeId') rawEpisodeId: string
  ) {
    return this.embeddedsService.listEpisodeEmbeddeds(userId, +rawEpisodeId)
  }

  @Post('/images')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './public/dynamics/embeddeds',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`)
      })
    })
  )
  saveTemporalImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|svg)$/ })
        .addMaxSizeValidator({ maxSize: 1000 * 1024 * 3 }) // 3 mb
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
        })
    )
    temporalImage: Express.Multer.File
  ) {
    return `/dynamics/embeddeds/${temporalImage.filename}`
  }
}
