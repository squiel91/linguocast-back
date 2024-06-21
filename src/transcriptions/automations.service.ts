import { BadRequestException, Injectable } from '@nestjs/common'
import { transcribe } from './steps/transcribe/transcribe.steps.automations'
import { extname } from 'path'

@Injectable()
export class AutomationsService {
  async generateAutomaticTranscript(audioUrl: string) {
    if (extname(audioUrl) !== '.mp3')
      throw new BadRequestException('Only mp3 format supported.')
    const transcript = await transcribe(audioUrl)
    return transcript.words
      .map(({ start, end, text }) => `${start / 1000}\t${end / 1000}\t${text}`)
      .join('\n')
  }
}
