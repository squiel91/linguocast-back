import { Injectable } from '@nestjs/common'
import { joinSentences } from './data-pipe/generate-sentences.data-pipe'
import { transcribe } from './data-pipe/transcribe.data-pipe'
import { restoreStep } from 'src/utils/pipeline.utils'
import { Transcript } from 'assemblyai'

@Injectable()
export class TranscriptionsService {
  async processTranscription() {
    return await joinSentences(
      await restoreStep<Transcript>(1991, 'transcribe'),
      true
    )
    // return await joinSentences(await transcribe('1min.mp3', true), true)
  }
}
