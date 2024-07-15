import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common'
import { WordsService } from './words.service'
import {
  UserIdOrNull,
  UserIdOrThrowUnauthorized
} from 'src/auth/auth.decorators'
import { RateWordReviewDto, SearchWordsDto } from './words.validation'

@Controller('/api')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get('/words')
  searchWords(
    @UserIdOrNull() userId: number | null,
    @Query() searchWordsDto: SearchWordsDto
  ) {
    return this.wordsService.searchWords(
      userId,
      searchWordsDto.language,
      searchWordsDto.q
    )
  }

  @Get('/words/:wordId')
  viewWord(
    @UserIdOrNull() userId: number | null,
    @Param('wordId') wordId: string
  ) {
    return this.wordsService.viewWord(userId, +wordId)
  }

  @Get('/user/words')
  listUserWord(@UserIdOrNull() userId: number) {
    return this.wordsService.listUserWords(userId)
  }

  @Patch('/user/words/:wordId')
  scoreWordReview(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('wordId') wordId: string,
    @Body() rateWordReviewDto: RateWordReviewDto
  ) {
    return this.wordsService.scoreWordReview(
      userId,
      +wordId,
      rateWordReviewDto.difficulty
    )
  }

  @Post('/user/words/:wordId')
  @HttpCode(HttpStatus.ACCEPTED)
  addUserWord(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('wordId') wordId: string
  ) {
    return this.wordsService.createUserWord(userId, +wordId)
  }

  @Delete('/user/words/:wordId')
  @HttpCode(HttpStatus.ACCEPTED)
  deleteUserWord(
    @UserIdOrThrowUnauthorized() userId: number,
    @Param('wordId') wordId: string
  ) {
    return this.wordsService.deleteUserWord(userId, +wordId)
  }
}
