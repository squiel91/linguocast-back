import { db } from 'src/db/connection.db'

export const storeTranscriptCache = async (
  audioUrl: string,
  result: unknown
) => {
  console.log(`Caching transcription...`)
  await db
    .insertInto('transcriptCache')
    .values({
      audioUrl,
      result: JSON.stringify(result)
    })
    .execute()
  console.log(`Transcription cached.`)
  return result
}
