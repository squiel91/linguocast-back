import { Module } from '@nestjs/common'
import { TranscriptionsController } from './transcriptions.controller'
import { TranscriptionsService } from './transcriptions.service'

@Module({
  imports: [],
  controllers: [TranscriptionsController],
  providers: [TranscriptionsService],
})
export class TranscriptionsModule {}
