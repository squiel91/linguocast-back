import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import UserService from './user.service'
import { PodcastsModule } from 'src/podcasts/podcasts.module'
import { NotificationsModule } from 'src/notifications/notifications.module'

@Module({
  imports: [PodcastsModule, NotificationsModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
