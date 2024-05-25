import { Controller, Get } from '@nestjs/common'
import { LanguagesService } from './langauges.service'

@Controller('/api/languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get('/')
  getAllLanguages() {
    return this.languagesService.getAllLanguages()
  }
}
