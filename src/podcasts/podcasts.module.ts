import { Module } from '@nestjs/common'
import { PodcastsService } from './podcasts.service'
import { PodcastsController } from './podcasts.controller'
import { CommentsModule } from 'src/comments/comments.module'
import { EpisodesModule } from 'src/episodes/episodes.module'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [CommentsModule, EpisodesModule, ScheduleModule.forRoot()],
  controllers: [PodcastsController],
  providers: [PodcastsService]
})
export class PodcastsModule {}
