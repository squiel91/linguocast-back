import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service'
import { CreateUserDto, AuthenticateUserDto } from './users.validation'

import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const Cookies = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.cookies?.[data] : request.cookies;
});

@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/profile')
  async getUserProfile(@Headers('Authorization') token: string) {
    return await this.usersService.getUserProfile(token)
  }

  @Post('/authenticate')
  async authenticateUser(@Body() authenticateUserDto: AuthenticateUserDto) {
    return await this.usersService.authenticateUser(
      authenticateUserDto.email,
      authenticateUserDto.password
    )
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.createUser(
      createUserDto.email,
      createUserDto.name,
      createUserDto.password
    )
  }
}
