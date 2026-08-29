// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorFunction,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { BaseHealthController } from '@app/common';

@Controller('health')
export class HealthController extends BaseHealthController {
  constructor(
    health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {
    super(health);
  }

  protected readinessIndicators(): HealthIndicatorFunction[] {
    return [() => this.mongoose.pingCheck('mongo')];
  }
}
