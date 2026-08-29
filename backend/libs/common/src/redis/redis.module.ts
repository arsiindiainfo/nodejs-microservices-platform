// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Global self-hosted Redis client — refresh tokens (auth-service), rate
 * limiting (Gateway), notification/read-model caches, etc. (§9).
 * Import once via `RedisModule` in any app that needs `@Inject(REDIS_CLIENT)`.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
