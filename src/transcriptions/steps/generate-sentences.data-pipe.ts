import { BadRequestException } from '@nestjs/common'
import { Transcript, TranscriptWord } from 'assemblyai'
import { storeStep } from 'src/utils/pipeline.utils'
import { separate } from 'src/utils/text.utils'

export interface Sentence {
  text: string[]
  // start: number
  // end: number
}

export const joinSentences = async (
  originalTranscript: Transcript,
  shouldstoreResult = false
) => {
  console.log('Generating sentences...')
  if (
    !originalTranscript.words ||
    !originalTranscript.text ||
    originalTranscript.words.length === 0 ||
    originalTranscript.text.length === 0
  ) {
    throw new BadRequestException('Transcript with no text')
  }

  const sentences: Sentence[] = []
  // let currentWordIndex = 0
  // console.log({ TOTAL: originalTranscript.words.length })
  // let currentWord: TranscriptWord | null = null

  // while (originalTranscript.words.length > currentWordIndex) {
  //   currentWord = originalTranscript.words[currentWordIndex]
  //   const currentSentencePartialText: string[] = []
  //   const start = currentWord.start

  //   while (
  //     !currentWord.text.includes('。') &&
  //     !currentWord.text.includes('.') &&
  //     !currentWord.text.includes('!') &&
  //     !currentWord.text.includes('！') &&
  //     !currentWord.text.includes('?') &&
  //     !currentWord.text.includes('？')
  //   ) {
  //     currentWordIndex = currentWordIndex + 1
  //     if (originalTranscript.words.length <= currentWordIndex) break
  //     currentWord = originalTranscript.words[currentWordIndex]
  //     console.log({ currentWordIndex })
  //   }

  //   if (originalTranscript.words.length <= currentWordIndex) {
  //     const currentSentence = {
  //       text: currentSentencePartialText,
  //       start,
  //       end: originalTranscript.words[currentWordIndex - 1].end
  //     }

  //     sentences.push(currentSentence)
  //     break
  //   }
  //   // separate the sentence closing symbol
  //   const { before, separator, after } = separate(
  //     currentWord.text,
  //     /[.?!。？！]/
  //   )
  //   [before, separator, after].forEach((value) => {
  //     if (value) currentSentencePartialText.push(value)
  //   })

  //   currentSentencePartialText.push(
  //     currentWord.text.slice(0, currentWord.text.length - 1)
  //   )
  //   currentSentencePartialText.push(
  //     currentWord.text.slice(currentWord.text.length - 1)
  //   )

  //   const currentSentence = {
  //     text: currentSentencePartialText,
  //     start,
  //     end: currentWord.end
  //   }

  //   sentences.push(currentSentence)
  //   currentWordIndex = currentWordIndex + 1
  //   console.log({ currentWordIndex })
  // }

  if (shouldstoreResult) await storeStep(1991, 'generate-senteces', sentences)

  console.log('Finished generating sentences.')
  return sentences
}
