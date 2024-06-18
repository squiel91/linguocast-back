import { BadRequestException, Injectable } from '@nestjs/common'
import { transcribe } from './steps/transcribe/transcribe.steps.automations'
import { extname } from 'path'

@Injectable()
export class AutomationsService {
  async generateAutomaticTranscript(audioUrl: string) {
    console.log('Hiii 2')

    if (extname(audioUrl) !== '.mp3')
      throw new BadRequestException('Only mp3 format supported.')
    const transcript = await transcribe(audioUrl)
    console.log({ transcript })
    return transcript.words
      .map(({ start, end, text }) => `${start / 1000}\t${end / 1000}\t${text}`)
      .join('\n')
  }
}
