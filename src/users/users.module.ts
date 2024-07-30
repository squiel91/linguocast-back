import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UserModule } from 'src/user/user.module'
import { NotificationsModule } from 'src/notifications/notifications.module'

@Module({
  imports: [UserModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
