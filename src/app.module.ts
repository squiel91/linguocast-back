import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { LanguagesModule } from './languages/languages.module'
import { UsersModule } from './users/users.module'
import { ConfigModule } from '@nestjs/config'
import { PodcastsModule } from './podcasts/podcasts.module'
import { join } from 'path'
import { ServeStaticModule } from '@nestjs/serve-static'
import { EpisodesModule } from './episodes/episodes.module'
import { TranscriptionsModule } from './transcriptions/transcriptions.module'
import { UserModule } from './user/user.module'

@Module({
  imports: [
    ConfigModule.forRoot(),
    LanguagesModule,
    UsersModule,
    EpisodesModule,
    PodcastsModule,
    TranscriptionsModule,
    UserModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'linguocast-front', 'dist'),
      exclude: ['/api', '/dynamics']
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
