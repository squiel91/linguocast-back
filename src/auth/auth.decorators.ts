import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator
} from '@nestjs/common'
import { Request } from 'express'
import { verify } from 'jsonwebtoken'

const extractTokenFromHeader = (request: Request): string | undefined => {
  const [type, token] = request.headers.authorization?.split(' ') ?? []
  return type === 'Bearer' ? token : null
}

export const UserIdOrNull = createParamDecorator(
  (_, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    const token = extractTokenFromHeader(request)
    if (!token) return null
    try {
      const { id } = verify(token, process.env.JWT_SECRET) as { id: number }
      return id
    } catch {
      return null
    }
  }
)

export const UserIdOrThrowUnauthorized = createParamDecorator(
  (_, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    const token = extractTokenFromHeader(request)
    if (!token) return new UnauthorizedException()
    try {
      const { id } = verify(token, process.env.JWT_SECRET) as { id: number }
      return id
    } catch {
      return new UnauthorizedException()
    }
  }
)
