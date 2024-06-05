import {
  Body,
  Controller,
  Get,
  HttpStatus,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import UserService from './user.service'
import { UserIdOrThrowUnauthorized } from 'src/auth/auth.decorators'
import { AuthenticateUserDto, UserUpdateDto } from './user.validations'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'

@Controller('/api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/authenticate')
  async authenticateUser(@Body() authenticateUserDto: AuthenticateUserDto) {
    return await this.userService.authenticateUser(
      authenticateUserDto.email,
      authenticateUserDto.password
    )
  }

  @Get('/')
  viewUser(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.viewUser(userId)
  }

  @Patch('/')
  @UseInterceptors(
    FileInterceptor('avatarFile', {
      storage: diskStorage({
        destination: './public/dynamics/users/avatars',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`),
      })
    })
  )
  updateUser(
    @UserIdOrThrowUnauthorized() userId: number,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|svg)$/ })
        .addMaxSizeValidator({ maxSize: 1000 * 1024 * 3 }) // 3 mb
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false
        })
    )
    avatarFile: Express.Multer.File | undefined,
    @Body() userUpdateDto: UserUpdateDto
  ) {
    return this.userService.editUser(
      userId,
      userUpdateDto.name,
      userUpdateDto.email,
      userUpdateDto.learning,
      userUpdateDto.level,
      userUpdateDto.isProfilePrivate === 'true' ? true : false,
      userUpdateDto.canOthersContact === 'true' ? true : false,
      avatarFile?.filename
    )
  }

  @Get('/feed')
  getUserFeed(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.getUserFeed(userId)
  }

  @Get('/podcast-subscriptions')
  listUserPodcastSubscriptions(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.listUserPodcastSubscriptions(userId)
  }

  @Get('/new-episodes')
  listSubscribedButNotListenedEpisodes (
    @UserIdOrThrowUnauthorized() userId: number
  ) {
    return this.userService.listSubscribedButNotListenedEpisodes(userId)
  }

  @Get('/recommended-podcasts')
  listNotSubscribedPoscasts(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.recommendedPodcasts(userId)
  }

  @Get('/latest-episode-comments')
  listLatestEpisodeComments(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.listLatestEpisodeComments(userId)
  }

  @Get('/listening-episodes')
  listListenedButNotCompletedEpisodes (
    @UserIdOrThrowUnauthorized() userId: number
  ) {
    return this.userService.listListenedButNotCompletedEpisodes(userId)
  }
}
