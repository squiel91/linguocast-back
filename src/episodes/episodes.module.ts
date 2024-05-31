import { Module } from '@nestjs/common'
import { EpisodesController } from './episodes.controller'
import { EpisodesService } from './episodes.service'

@Module({
  imports: [],
  controllers: [EpisodesController],
  providers: [EpisodesService],
  exports: [EpisodesService]
})
export class EpisodesModule {}
