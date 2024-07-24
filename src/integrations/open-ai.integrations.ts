import { InternalServerErrorException, UnprocessableEntityException } from '@nestjs/common'
import OpenAI from 'openai'
import { transcript } from 'podcast-partytime/dist/parser/phase/phase-1'
import { Level } from 'src/types/general.types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const getFreeResponseExercisesCorrection = async (
  question: string,
  responseModel: string,
  userResponse: string,
  language: string,
  level: Level,
  model = 'gpt-4o-mini'
) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a language teacher. Correct the following ${level.toUpperCase()} ${language} learner's response to the question:
"${question}"

The expected response, in a broad sense, is:
"${responseModel}"

Provide your corrections in a valid JSON format without any extra comments or code formatting:
{
    "isCorrect": boolean,
    "feedback": string
}

- isCorrect: true if the response somehow addresses the model answer despite some errors, be permissive, not to strict. It should be false if there are major grammar issues or it doesn't address the main part.
- feedback: Briefly explain why the response is correct or how it can be improved. Give feedback in ${language} language.`
      },
      { role: 'user', content: [{ type: 'text', text: userResponse }] }
    ],
    temperature: 1,
    max_tokens: 500,
    top_p: 1,
    n: 1, // number of choices
    frequency_penalty: 0,
    presence_penalty: 0
  })

  const rawCorrection = response.choices[0].message.content

  const formatException = new InternalServerErrorException(
    'The model failed to return a properly formed correction.'
  )
  try {
    const { isCorrect, feedback } = JSON.parse(rawCorrection)
    if (typeof isCorrect !== 'boolean' || !feedback) throw formatException
    return { isCorrect, feedback }
  } catch (error) {
    throw formatException
  }
}

interface Props {
  transcript: string
  model?: 'gpt-3.5-turbo-0125' | 'gpt-4o' | 'gpt-4o-mini'
  quantity?: number
}

export const generateExercises = async ({
  transcript: rawTimeAnnotatedTranscript,
  model = 'gpt-4o-mini'
}: Props) => {
  if (!rawTimeAnnotatedTranscript)
    throw new UnprocessableEntityException(
      'There is not an available transcript.'
    )
  const transcript = rawTimeAnnotatedTranscript
    .split('\n')
    .map(rawTimeAnnotatedWord => {
      if (rawTimeAnnotatedWord.trim() === '') return '\n'
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [start, end, text] = rawTimeAnnotatedWord.split('\t')
      return text
    })
    .join('')

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `This is a Chinese learning podcast episode's automatically generated transcript (it might contain a few character errors).

Generate 5 exercises in JSON format, using similar vocabulary and level as the podcast.
Try to evaluate the main episode takeaways and what is mentioned related to the main topic.  
The format should be:

[
  {
    "type": "multiple-choice",
    "question": "QUESTION IN CHINESE",
    "correctChoice": "CORRECT ANSWER",
    "incorrectChoices": ["WRONG ANSWER 1", "WRONG ANSWER 2", "WRONG ANSWER 3"]
  }, (2 of this type)
  {
    "type": "select-multiple",
    "question": "QUESTION IN CHINESE",
    "correctChoices": ["CORRECT ANSWER 1", "CORRECT ANSWER 2"],
    "incorrectChoices": ["WRONG ANSWER 1", "WRONG ANSWER 2"]
  }, (2 of this type)
  {
    "type": "free-response",
    "question": "QUESTION IN CHINESE",
    "response": "MODEL RESPONSE IN CHINESE"
  } (1 of this type)
]

The response should be a valid JSON list with no comments or code formatting.`
      },
      { role: 'user', content: [{ type: 'text', text: transcript }] }
    ],
    temperature: 1,
    max_tokens: 4096,
    top_p: 1,
    n: 1, // number of choices
    frequency_penalty: 0,
    presence_penalty: 0
  })

  const rawExercise = response.choices[0].message.content
  return JSON.parse(rawExercise)
}
