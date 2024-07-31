import { Module } from '@nestjs/common'
import { EpisodesController } from './episodes.controller'
import { EpisodesService } from './episodes.service'
import { AutomationsModule } from 'src/transcriptions/automations.module'
import { NotificationsModule } from 'src/notifications/notifications.module'

@Module({
  imports: [AutomationsModule, NotificationsModule],
  controllers: [EpisodesController],
  providers: [EpisodesService],
  exports: [EpisodesService]
})
export class EpisodesModule {}
