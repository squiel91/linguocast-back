import { AssemblyAI } from 'assemblyai'
import { storeStep } from 'src/utils/pipeline.utils'

export const transcribe = async (fileName, shouldstoreResult = false) => {
  const client = new AssemblyAI({
    apiKey: process.env.ASSAMBLY_AI_API_KEY
  })

  const audioUrl = 'https://linguocast.com/1min.mp3'
  // const audioPath = join(__dirname, '..', 'data', fileName)

  const transcript = await client.transcripts.create({
    audio_url: audioUrl,
    language_code: 'zh',
    speech_model: 'best'
  })
  console.log({ transcript })

  if (shouldstoreResult) await storeStep(1991, 'transcribe', transcript)
  return transcript
}
