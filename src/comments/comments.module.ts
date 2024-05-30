import { Module } from '@nestjs/common'
import { CommentsService } from './comments.service';

@Module({
  imports: [],
  controllers: [],
  providers: [CommentsService],
  exports: [CommentsService]
})
export class CommentsModule {}
