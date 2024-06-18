import {
  ConflictException,
  Injectable,
  NotFoundException,
  PreconditionFailedException
} from '@nestjs/common'
import { db } from 'src/db/connection.db'
import { converToSimplfied, converToTraditional, convertNumericToTonalPinyin } from './words.utils'
import { daySinceEpoche } from 'src/utils/date.utils'
import { Difficulty } from './words.constants'

@Injectable()
export class WordsService {
  async searchWords(language: string, q: string) {
    const matchingWords = await db
      .selectFrom('dictionary')
      .innerJoin('languages', 'dictionary.languageId', 'languages.id')
      .select([
        'dictionary.id',
        'languages.name as language',
        'dictionary.word',
        'dictionary.pronunciation',
        'dictionary.definitions as rawTranslations'
      ])
      .where('languages.name', '=', language)
      .where('word', '=', language === 'mandarin' ? converToTraditional(q) : q)
      .limit(20)
      .execute()

    return matchingWords.map(({ rawTranslations, pronunciation, ...rest }) => ({
      ...rest,
      pronunciation:
        language === 'mandarin'
          ? convertNumericToTonalPinyin(pronunciation)
          : pronunciation,
      translations: JSON.parse(rawTranslations)
    }))
  }

  async viewWord(userId: number | null, wordId: number) {
    const userLanguage = await db
      .selectFrom('users')
      .select(['learningLanguageId', 'languageVariant'])
      .where('id', '=', userId)
      .executeTakeFirst()

    const rawWord = await db
      .selectFrom('dictionary')
      .innerJoin('languages', 'dictionary.languageId', 'languages.id')
      .leftJoin(
        // will be empty if the user is not authenticated
        db
          .selectFrom('userWords')
          .selectAll()
          .where('userId', '=', userId)
          .as('givenUserWords'),
        'givenUserWords.wordId',
        'dictionary.id'
      )
      .select([
        'dictionary.id',
        'languages.name as language',
        'image',
        'word',
        'pronunciation',
        'definitions as rawTranslations',
        'givenUserWords.createdAt as userSavedDate'
      ])
      .where('dictionary.id', '=', wordId)
      .executeTakeFirstOrThrow()

    const measureWords = await db
      .selectFrom('measureWords')
      .innerJoin('dictionary', 'dictionary.id', 'measureWords.wordId')
      .select(['dictionary.id', 'dictionary.word', 'dictionary.pronunciation'])
      .where('measureWords.wordId', '=', wordId)
      .execute()

    const { word, rawTranslations, userSavedDate, pronunciation, ...rest } = rawWord
    return {
      ...rest,
      word:
        userLanguage &&
        userLanguage.learningLanguageId === 2 /* mandarin */ &&
        userLanguage.languageVariant === 'simplified'
          ? converToSimplfied(word)
          : word,
      translations: JSON.parse(rawTranslations),
      pronunciation:
        rawWord.language === 'mandarin'
          ? convertNumericToTonalPinyin(pronunciation)
          : pronunciation,
      saved: !!userSavedDate,
      measures: measureWords
    }
  }

  async listUserWords(userId: number) {
    const { learningLanguageId, languageVariant } = await db
      .selectFrom('users')
      .select(['learningLanguageId', 'languageVariant'])
      .where('id', '=', userId)
      .executeTakeFirstOrThrow()

    const rawWords = await db
      .selectFrom('userWords')
      .innerJoin('dictionary', 'dictionary.id', 'userWords.wordId')
      .innerJoin('languages', 'dictionary.languageId', 'languages.id')
      .select([
        'dictionary.id',
        'languages.name as language',
        'image',
        'word',
        'pronunciation',
        'reviewScheduledFor',
        'lastReviewInterval',
        'definitions as rawTranslations',
        'userWords.createdAt as savedAt'
      ])
      .where('userWords.userId', '=', userId)
      .execute()

    return rawWords.map(
      ({ word, rawTranslations, pronunciation, language, ...rest }) => ({
        ...rest,
        word:
          learningLanguageId === 2 /* mandarin */ &&
          languageVariant === 'simplified'
            ? converToSimplfied(word)
            : word,
        language,
        pronunciation:
          language === 'mandarin'
            ? convertNumericToTonalPinyin(pronunciation)
            : pronunciation,
        translations: JSON.parse(rawTranslations)
      })
    )
  }

  async createUserWord(userId: number, wordId: number) {
    if (
      await db
        .selectFrom('userWords')
        .select('wordId')
        .where('userId', '=', userId)
        .where('wordId', '=', wordId)
        .executeTakeFirst()
    ) {
      throw new ConflictException('The user has added the word already')
    }
    const currentDay = daySinceEpoche()
    await db
      .insertInto('userWords')
      .values({
        userId,
        wordId,
        reviewScheduledFor: currentDay + 1,
        lastReviewInterval: 1
      })
      .execute()

    const prevAddedCount: number | null =
      (
        await db
          .selectFrom('dailyActivity')
          .select('dailyActivity.wordsAddedCount')
          .where('dailyActivity.day', '=', currentDay)
          .where('dailyActivity.userId', '=', userId)
          .executeTakeFirst()
      )?.wordsAddedCount ?? null

    if (prevAddedCount) {
      await db
        .updateTable('dailyActivity')
        .set({
          wordsAddedCount: prevAddedCount + 1
        })
        .execute()
    } else {
      await db
        .insertInto('dailyActivity')
        .values({
          userId,
          day: currentDay,
          wordsAddedCount: 1
        })
        .execute()
    }
  }

  async scoreWordReview(
    userId: number,
    wordId: number,
    difficuly: (typeof Difficulty)[number]
  ) {
    const { lastReviewInterval, reviewScheduledFor } = await db
      .selectFrom('userWords')
      .select(['lastReviewInterval', 'reviewScheduledFor'])
      .where('userId', '=', userId)
      .where('wordId', '=', wordId)
      .executeTakeFirstOrThrow()

    const currentDay = daySinceEpoche()
    if (reviewScheduledFor > currentDay)
      throw new PreconditionFailedException('The word is not yet due to review')

    let newReviewInterval
    switch (difficuly) {
      case 'easy':
        newReviewInterval = Math.ceil(lastReviewInterval * 2.5)
        break
      case 'medium':
        newReviewInterval = Math.ceil(lastReviewInterval * 1.5)
        break
      case 'hard':
        newReviewInterval = Math.ceil(lastReviewInterval / 2)
    }

    await db
      .updateTable('userWords')
      .set({
        lastReviewInterval: newReviewInterval,
        reviewScheduledFor: currentDay + newReviewInterval
      })
      .where('userId', '=', userId)
      .where('wordId', '=', wordId)
      .execute()
  }

  async deleteUserWord(userId: number, wordId: number) {
    if (
      !(await db
        .selectFrom('userWords')
        .select('wordId')
        .where('userId', '=', userId)
        .where('wordId', '=', wordId)
        .executeTakeFirst())
    ) {
      throw new NotFoundException('The user has not saved the word')
    }
    await db
      .deleteFrom('userWords')
      .where('userId', '=', userId)
      .where('wordId', '=', wordId)
      .execute()
  }
}
