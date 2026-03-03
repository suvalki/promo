import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.decorator';
import { AuthService } from './auth.service';
import { AppError } from '@/common/errors/app.error';
import { ErrorCode } from '@/common/errors/error-codes';

interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const token = request.cookies.token;

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw AppError.Unauthorized(ErrorCode.UNAUTHORIZED, 'Token not found');
    }

    const user = await this.authService.getSession(token);
    if (!user) {
      if (isPublic) {
        return true;
      }
      throw AppError.Unauthorized(
        ErrorCode.UNAUTHORIZED,
        'Invalid or expired token',
      );
    }

    request.user = user;

    return true;
  }
}
