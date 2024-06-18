import { IsIn, IsString } from 'class-validator'
import { Difficulty } from './words.constants'

export class SearchWordsDto {
  @IsString()
  language: string

  @IsString()
  q: string
}

export class RateWordReviewDto {
  @IsIn(Difficulty)
  difficulty: (typeof Difficulty)[number]
}
