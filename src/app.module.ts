import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { LanguagesModule } from './languages/languages.module'
import { UsersModule } from './users/users.module'
import { ConfigModule } from '@nestjs/config'
import { PodcastsModule } from './podcasts/podcasts.module'
import { join } from 'path'
import { ServeStaticModule } from '@nestjs/serve-static'

@Module({
  imports: [
    ConfigModule.forRoot(),
    LanguagesModule,
    UsersModule,
    PodcastsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
