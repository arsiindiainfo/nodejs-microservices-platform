// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthIndicator, RedisModule } from '@app/common';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
