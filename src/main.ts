import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'

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
  
  await app.listen(process.env.PORT)
  console.info(`Linguocast server listening @ port ${process.env.PORT}.`)
}
bootstrap()
