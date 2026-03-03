import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { ExecutionContext, Injectable, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '@/common/errors/app.error';
import { ErrorCode } from '@/common/errors/error-codes';
import { RedisKeys } from '@/datasources/redis/redis-keys';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const user = request.user as { id?: string } | undefined;

    if (user?.id) {
      return Promise.resolve(RedisKeys.RateLimit.user(user.id));
    }

    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    return Promise.resolve(RedisKeys.RateLimit.ip(ip));
  }

  protected override throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    void context;
    void throttlerLimitDetail;

    throw new AppError(
      ErrorCode.RATE_LIMITED,
      undefined,
      undefined,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
