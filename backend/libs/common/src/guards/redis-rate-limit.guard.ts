import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { RateLimitedException } from '../exceptions/domain.exceptions';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Sliding-window rate limiter backed by a Redis sorted set — one member per
 * request, scored by timestamp, trimmed to the window on every check (§9).
 * Keyed by authenticated user id where available, falling back to IP for
 * unauthenticated routes like /auth/login.
 */
@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly windowMs: number;
  private readonly limit: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.windowMs = config.get<number>('RATE_LIMIT_WINDOW_MS', 60_000);
    this.limit = config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const identifier = request.user?.sub ?? request.ip ?? 'unknown';
    const key = `ratelimit:${identifier}`;
    const now = Date.now();

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, now - this.windowMs);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, this.windowMs);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    if (count > this.limit) {
      throw new RateLimitedException();
    }
    return true;
  }
}
