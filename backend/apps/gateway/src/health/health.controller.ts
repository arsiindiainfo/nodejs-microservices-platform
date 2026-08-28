import { Controller } from '@nestjs/common';
import { HealthCheckService, HealthIndicatorFunction } from '@nestjs/terminus';
import { BaseHealthController } from '@app/common';

/** The Gateway has no database of its own — readiness mirrors liveness (§13.2). */
@Controller('health')
export class HealthController extends BaseHealthController {
  constructor(health: HealthCheckService) {
    super(health);
  }

  protected readinessIndicators(): HealthIndicatorFunction[] {
    return [];
  }
}
