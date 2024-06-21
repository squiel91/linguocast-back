import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ExercisesService } from './exercises.service'
import {
  ExercisesDto,
  buildExerciseResponseOrThrow
} from './exercises.validations'
import {
  UserIdOrNull,
  UserIdOrThrowUnauthorized
} from 'src/auth/auth.decorators'

@Controller('/api')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post('/exercises/:exerciseId/responses')
  async recordExerciseResponse(
    @UserIdOrThrowUnauthorized() userId: number | null,
    @Param('exerciseId') exerciseId: number,
    @Body('type') type: unknown,
    @Body('response') response: unknown
  ) {
    return await this.exercisesService.recordExerciseResponse(
      userId,
      exerciseId,
      buildExerciseResponseOrThrow(type, response)
    )
  }

  @Post('/exercises')
  saveExercises(
    @UserIdOrThrowUnauthorized() _,
    @Body() exercisesDto: ExercisesDto
  ) {
    return this.exercisesService.saveExercises(
      exercisesDto.episodeId,
      exercisesDto.exercises
    )
  }

  @Get('/exercises/:exerciseId')
  viewExercise(
    @UserIdOrNull() userId: number | null,
    @Param('exerciseId') exerciseId: string
  ) {
    return this.exercisesService.viewExercise(userId, +exerciseId)
  }

  @Get('/creators/exercises')
  listCreatorEpisodeExercises(
    @UserIdOrThrowUnauthorized() userId: number | null,
    @Query('episodeId') episodeId: string
  ) {
    return this.exercisesService.getCreatorEpisodeExercises(userId, +episodeId)
  }

  @Get('/exercises')
  listEpisodeExercises(
    @UserIdOrNull() userId: number | null,
    @Query('episodeId') episodeId: string
  ) {
    return this.exercisesService.getEpisodeExercises(userId, +episodeId)
  }
}
