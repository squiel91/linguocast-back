import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { AuthGuard } from './auth/auth.guard'
import { extname } from 'path'
import { diskStorage } from 'multer'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('/api')
export class AppController {
  @Post('/temporal-images')
  @UseGuards(AuthGuard) // TODO: check if this is necessary
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './public/dynamics/temp',
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
    return `/dynamics/temp/${temporalImage.filename}`
  }
}
