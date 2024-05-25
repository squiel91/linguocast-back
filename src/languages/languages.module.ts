import { Module } from '@nestjs/common'
import { LanguagesController } from './languages.controller'
import { LanguagesService } from './langauges.service'

@Module({
  imports: [],
  controllers: [LanguagesController],
  providers: [LanguagesService],
})
export class LanguagesModule {}
