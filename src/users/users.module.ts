import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UserModule } from 'src/user/user.module'

@Module({
  imports: [UserModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
