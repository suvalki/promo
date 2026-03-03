import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisLockService {
  private redlock: Redlock;

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
    this.redlock = new Redlock([redisClient], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });
  }

  async acquire(lockKey: string, ttl: number = 5000): Promise<Lock> {
    return this.redlock.acquire([lockKey], ttl);
  }
}
