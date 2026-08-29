// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

/**
 * Every service imports this with the same JWT_ACCESS_SECRET so it can
 * independently verify a token's signature without ever calling auth-service
 * to ask (§6.3) — symmetric HS256 is the honest choice for a single-org
 * portfolio deployment where every service is trusted to hold the secret.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
            '15m',
          ) as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'],
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtCommonModule {}
