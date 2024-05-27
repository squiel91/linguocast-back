import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import { join } from 'path'
import { static as staticMiddleware} from 'express'

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true
    })
  )
  app.use(cookieParser());

  app.use(
    '/dynamics',
    staticMiddleware(join(__dirname, '..', 'public', 'dynamics'))
  )

  // // Serve the index.html file for any route that doesn't match an API endpoint or the /api route
  // app.use('/*', (request, repsonse, next) => {
  //   if (request.baseUrl.startsWith('/api')) return next()
  //   repsonse.sendFile(
  //     join(__dirname, '..', '..', 'linguocast-front', 'dist', 'index.html')
  //   )
  // })

  await app.listen(process.env.PORT)
  console.info(`Linguocast server listening @ port ${process.env.PORT}.`)
}
bootstrap()
