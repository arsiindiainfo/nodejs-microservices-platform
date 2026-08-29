// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller } from '@nestjs/common';
import { HealthCheckService, HealthIndicatorFunction } from '@nestjs/terminus';
import { BaseHealthController, RedisHealthIndicator } from '@app/common';

@Controller('health')
export class HealthController extends BaseHealthController {
  constructor(
    health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
  ) {
    super(health);
  }

  protected readinessIndicators(): HealthIndicatorFunction[] {
    return [() => this.redis.isHealthy('redis')];
  }
}
