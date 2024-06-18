import { AssemblyAI, Transcript } from 'assemblyai'
import { db } from 'src/db/connection.db'
import { storeTranscriptCache } from './utils.transcribe.steps.automations'

export const transcribe = async (
  audioUrl: string,
  shouldCache = true
): Promise<Transcript> => {
  let transcriptionResponse: Transcript
  console.log('Hiiii')

  if (shouldCache) {
    const cachedTranscriptionResult = await db
      .selectFrom('transcriptCache')
      .select('result')
      .where('audioUrl', '=', audioUrl)
      .executeTakeFirst()
    if (cachedTranscriptionResult) {
      const cachedTranscription = JSON.parse(
        cachedTranscriptionResult.result
      ) as Transcript

      console.log(`Transcript for ${audioUrl} restored from cache.`)
      transcriptionResponse = cachedTranscription
    }
  }

  if (!transcriptionResponse) {
    const client = new AssemblyAI({
      apiKey: process.env.ASSAMBLY_AI_API_KEY
    })
    console.log(`Auto-generating transcript for ${audioUrl}...`)
    const response = await client.transcripts.create({
      audio_url: audioUrl,
      language_code: 'zh', // TODO: adjust the language to the episode
      speech_model: 'best'
    })
    console.log(`Auto-generating completed.`)
    if (shouldCache) await storeTranscriptCache(audioUrl, response)
  }

  return transcriptionResponse
}
