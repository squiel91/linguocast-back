import { converToSimplfied, converToTraditional } from 'src/words/words.utils'

export const convertIfChinese = (
  userLanguage: { learningLanguageId: number; languageVariant: string } | null,
  text: string
) => {
  if (!text) return text
  if (!userLanguage || userLanguage.learningLanguageId !== 2)  return text
  if (userLanguage.languageVariant === 'simplified')
    return converToSimplfied(text)
  return converToTraditional(text)
}
