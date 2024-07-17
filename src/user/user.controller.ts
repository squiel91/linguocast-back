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

@Controller('/api/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly podcastsService: PodcastsService
  ) {}

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

  @Post('/avatars')
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

  @Patch('/')
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
      userUpdateDto.canOthersContact,
      userUpdateDto.avatar,
      userUpdateDto.isCreator
    )
  }

  @Get('/feed')
  getUserFeed(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.getUserFeed(userId)
  }

  @Get('/podcasts/:podcastId')
  getUserPodcastById(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('podcastId') podcastId: number
  ) {
    return this.podcastsService.getUserPodcastsById(userId, podcastId)
  }

  @Get('/podcasts')
  getUserPodcasts(@UserIdOrThrowUnauthorized() userId: number) {
    return this.podcastsService.getUserPodcasts(userId)
  }

  @Get('/podcasts/:podcastId/episodes')
  getUserEpisodes(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('podcastId') podcastId: number
  ) {
    return this.podcastsService.getUserPodcastEpisodes(userId, podcastId)
  }

  @Get('/journey')
  getUserLearningJourney(@UserIdOrThrowUnauthorized() userId: number) {
    return this.userService.getUserLearningJourney(userId)
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
