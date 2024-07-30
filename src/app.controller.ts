import { Controller, Get, Res } from '@nestjs/common'
import { AppService } from './app.service'
import { Response } from 'express'
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('/')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/sitemap.xml')
  getSitmap(@Res() res: Response) {
    return this.appService.getSitemap(res)
  }

  @Get('/robots.txt')
  getRobots(@Res() res: Response) {
    const robotsFile = readFileSync(join(process.cwd(), 'robots.txt'), 'utf8')
    res.type('text/plain')
    res.send(robotsFile)
  }
}
