import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service'
import { CreateUserDto, AuthenticateUserDto } from './users.validation'

import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { UserIdOr } from 'src/auth/auth.decorators';

export const Cookies = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.cookies?.[data] : request.cookies;
});

@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/profile')
  async getUserProfile(
    @UserIdOr(() => {
      throw new UnauthorizedException()
    })
    userId: number
  ) {
    return await this.usersService.getUserProfile(userId)
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
