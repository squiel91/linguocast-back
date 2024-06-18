import { Module } from '@nestjs/common'
import { EpisodesController } from './episodes.controller'
import { EpisodesService } from './episodes.service'
import { AutomationsModule } from 'src/transcriptions/automations.module'

@Module({
  imports: [AutomationsModule],
  controllers: [EpisodesController],
  providers: [EpisodesService],
  exports: [EpisodesService]
})
export class EpisodesModule {}
