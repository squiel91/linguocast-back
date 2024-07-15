import { Module } from '@nestjs/common'
import { PodcastsService } from './podcasts.service'
import { PodcastsController } from './podcasts.controller'
import { CommentsModule } from 'src/comments/comments.module'
import { EpisodesModule } from 'src/episodes/episodes.module'
import { ScheduleModule } from '@nestjs/schedule'
import { NotificationsModule } from 'src/notifications/notifications.module'

@Module({
  imports: [
    CommentsModule,
    EpisodesModule,
    ScheduleModule.forRoot(),
    NotificationsModule
  ],
  controllers: [PodcastsController],
  providers: [PodcastsService],
  exports: [PodcastsService]
})
export class PodcastsModule {}
