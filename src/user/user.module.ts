import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import UserService from './user.service'
import { PodcastsModule } from 'src/podcasts/podcasts.module'

@Module({
  imports: [PodcastsModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
