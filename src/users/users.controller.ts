import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './users.validation'

import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const Cookies = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.cookies?.[data] : request.cookies;
});

@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/:userId')
  async viewUser(@Param('userId') userId: number) {
    return await this.usersService.viewUser(userId)
  }

  @Post('/')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.createUser(
      createUserDto.email,
      createUserDto.name,
      createUserDto.learning,
      createUserDto.password
    )
  }
}
