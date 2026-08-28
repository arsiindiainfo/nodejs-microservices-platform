import { Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { Public } from '../decorators/public.decorator';

/**
 * Every service exposes GET /health (liveness) and GET /health/ready
 * (readiness — can it reach its own database/queue) via terminus (§13.2).
 * A concrete controller supplies its own readiness indicators (TypeOrm,
 * Mongoose, Redis...) by overriding `readinessIndicators()`.
 */
export abstract class BaseHealthController {
  protected constructor(protected readonly health: HealthCheckService) {}

  @Public()
  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check(this.readinessIndicators());
  }

  protected abstract readinessIndicators(): HealthIndicatorFunction[];
}
