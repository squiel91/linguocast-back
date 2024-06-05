import { Controller, Post } from '@nestjs/common'
import { TranscriptionsService } from './transcriptions.service'

@Controller('/api/transcriptions')
export class TranscriptionsController {
  constructor(private readonly transcriptionsService: TranscriptionsService) {}

  @Post('/generate')
  generateTranscription() {
    return this.transcriptionsService.processTranscription()
  }
}
