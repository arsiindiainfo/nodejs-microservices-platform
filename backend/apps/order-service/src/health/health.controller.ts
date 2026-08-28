import { Controller } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorFunction,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { BaseHealthController } from '@app/common';

@Controller('health')
export class HealthController extends BaseHealthController {
  constructor(
    health: HealthCheckService,
    private readonly typeOrm: TypeOrmHealthIndicator,
  ) {
    super(health);
  }

  protected readinessIndicators(): HealthIndicatorFunction[] {
    return [() => this.typeOrm.pingCheck('mssql')];
  }
}
