import { Module } from '@nestjs/common'
import { ExercisesController } from './exercises.controller'
import { ExercisesService } from './exercises.service'
import { UserModule } from 'src/user/user.module'

@Module({
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
  imports: [UserModule]
})
export class ExercisesModule {}
