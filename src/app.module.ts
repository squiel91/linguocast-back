import { Module } from '@nestjs/common'
import { LanguagesModule } from './languages/languages.module'
import { UsersModule } from './users/users.module'
import { ConfigModule } from '@nestjs/config'
import { PodcastsModule } from './podcasts/podcasts.module'
import { join } from 'path'
import { ServeStaticModule } from '@nestjs/serve-static'
import { EpisodesModule } from './episodes/episodes.module'
import { UserModule } from './user/user.module'
import { CommentsModule } from './comments/comments.module'
import { ExercisesModule } from './exercises/exercises.module'
import { EmbeddedsModule } from './embededds/embeddeds.module'
import { AppController } from './app.controller'
import { WordsModule } from './words/words.module'

@Module({
  imports: [
    ConfigModule.forRoot(),
    LanguagesModule,
    UsersModule,
    EpisodesModule,
    PodcastsModule,
    CommentsModule,
    ExercisesModule,
    EmbeddedsModule,
    UserModule,
    WordsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'linguocast-front', 'dist'),
      exclude: ['/api', '/dynamics']
    })
  ],
  controllers: [AppController]
})
export class AppModule {}
