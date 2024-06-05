import { db } from 'src/db/connection.db'

export const storeStep = async (
  episodeId: number,
  stage: string,
  result: unknown
) => {
  await db
    .insertInto('episodePipeline')
    .values({
      episodeId,
      stage,
      result: JSON.stringify(result)
    })
    .execute()
  return result
} 

export const restoreStep = async <T>(episodeId: number, stage: string) => {
  const serializedResult = await db
    .selectFrom('episodePipeline')
    .select('result')
    .where('episodeId', '=', episodeId)
    .where('stage', '=', stage)
    .orderBy('id', 'desc')
    .executeTakeFirstOrThrow()
  return JSON.parse(serializedResult.result) as T
}
