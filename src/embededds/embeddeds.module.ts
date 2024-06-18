import { Module } from '@nestjs/common'
import { EmbeddedsController } from './embeddeds.controller'
import { EmbeddedsService } from './embeddeds.service'
import { ExercisesModule } from 'src/exercises/exercises.module'

@Module({
  controllers: [EmbeddedsController],
  providers: [EmbeddedsService],
  imports: [ExercisesModule]
})
export class EmbeddedsModule {}
