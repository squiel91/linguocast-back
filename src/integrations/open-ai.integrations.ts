import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface Props {
  transcript: string
  model?: 'gpt-3.5-turbo-0125' | 'gpt-4o'
  quantity?: number
}

export const generateExercises = async ({
  transcript,
  model = 'gpt-3.5-turbo-0125',
  quantity = 4
}: Props) => {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `This is a chinese learning podcast episode automatically generated transcript (it might contain a few character errors).
  I need to generate 4 multiple choice exercises that test some of the most
  important takeouts. It should be in JSON format with this format:
  [
    {
      "type": "multiple-choice" // always include this type for each object
      "question": "Which is the largest number? ",
      "correctChoice": "44",
      "incorrectChoices": ["23", "2", "21"] // always 3 incorrect choices
    },
    // and ${quantity} more exercise${quantity > 1 ? 's' : ''})
  ]
  
  The questions and answers need to be in Chinese.
  Use a similar vocabulary and level used in the podcast.
  
  Important: Don't just reply a valid JSON list, no other text apart from that. The reply should be a valid json, without any comments and no code formatting.`
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

  console.log(response.usage)
  console.log(response.choices[0].message.content)
  const rawExercise = response.choices[0].message.content
  return JSON.parse(rawExercise)
}
