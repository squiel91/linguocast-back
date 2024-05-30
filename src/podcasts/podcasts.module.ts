import { Module } from '@nestjs/common'
import { PodcastsService } from './podcasts.service'
import { PodcastsController } from './podcasts.controller'
import { CommentsModule } from 'src/comments/comments.module'

@Module({
  imports: [CommentsModule],
  controllers: [PodcastsController],
  providers: [PodcastsService],
})
export class PodcastsModule {}
