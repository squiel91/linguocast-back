import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
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
import { PodcastsService } from 'src/podcasts/podcasts.service'

@Controller('/api')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly podcastsService: PodcastsService
  ) {}

  @Post('/user/authenticate')
  async authenticateUser(@Body() authenticateUserDto: AuthenticateUserDto) {
    return await this.userService.authenticateUser(
      authenticateUserDto.email,
      authenticateUserDto.password
    )
  }

  @Get('/user/')
  viewUser(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.viewUser(userId)
  }

  @Post('/user/avatars')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './public/dynamics/users/avatars',
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}${extname(file.originalname)}`)
      })
    })
  )
  saveAvatarImage(
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
    return `/dynamics/users/avatars/${image.filename}`
  }

  @Patch('/user/')
  updateUser(
    @UserIdOrThrowUnauthorized() userId: number,
    @Body() userUpdateDto: UserUpdateDto
  ) {
    return this.userService.editUser(
      userId,
      userUpdateDto.name,
      userUpdateDto.email,
      userUpdateDto.learning,
      userUpdateDto.variant,
      userUpdateDto.level,
      userUpdateDto.isProfilePrivate,
      userUpdateDto.isPremium,
      userUpdateDto.canOthersContact,
      userUpdateDto.avatar,
      userUpdateDto.isCreator
    )
  }

  @Get('/user/feed')
  getUserFeed(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.getUserFeed(userId)
  }

  @Get('/creators/podcasts/:podcastId')
  getUserPodcastById(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('podcastId') podcastId: number
  ) {
    return this.podcastsService.getUserPodcastsById(userId, podcastId)
  }

  @Get('/creators/podcasts')
  getUserPodcasts(@UserIdOrThrowUnauthorized() userId: number) {
    return this.podcastsService.getUserPodcasts(userId)
  }

  @Get('/user/journey')
  getUserLearningJourney(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.getUserLearningJourney(userId)
  }

  @Get('/user/podcast-subscriptions')
  listUserPodcastSubscriptions(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.listUserPodcastSubscriptions(userId)
  }

  @Get('/user/new-episodes')
  listSubscribedButNotListenedEpisodes (
    @UserIdOrThrowUnauthorized() userId: number
  ) {
    return this.userService.listSubscribedButNotListenedEpisodes(userId)
  }

  @Get('/user/recommended-podcasts')
  listNotSubscribedPoscasts(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.recommendedPodcasts(userId)
  }

  @Get('/user/latest-episode-comments')
  listLatestEpisodeComments(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.listLatestEpisodeComments(userId)
  }

  @Get('/user/listening-episodes')
  listListenedButNotCompletedEpisodes (
    @UserIdOrThrowUnauthorized() userId: number
  ) {
    return this.userService.listListenedButNotCompletedEpisodes(userId)
  }
}
