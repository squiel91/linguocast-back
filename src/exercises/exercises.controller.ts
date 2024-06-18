import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ExercisesService } from './exercises.service'
import { ExercisesDto } from './exercises.validations'
import { UserIdOrThrowUnauthorized } from 'src/auth/auth.decorators'

@Controller('/api/exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post('/')
  saveExercises(
    @UserIdOrThrowUnauthorized() _,
    @Body() exercisesDto: ExercisesDto
  ) {
    return this.exercisesService.saveExercises(
      exercisesDto.episodeId,
      exercisesDto.exercises
    )
  }

  @Get('/')
  listEpisodeExercises(@Query('episodeId') rawEpisodeId: string) {
    const episodeId = +rawEpisodeId
    return this.exercisesService.getEpisodeExercises(episodeId)
  }
}
