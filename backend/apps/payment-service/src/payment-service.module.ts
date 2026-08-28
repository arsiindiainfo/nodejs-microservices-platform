import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CorrelationIdMiddleware,
  GLOBAL_HTTP_PROVIDERS,
  JwtCommonModule,
} from '@app/common';
import { ConsumersModule } from './consumers/consumers.module';
import { envSchema } from './env.schema';
import { HealthModule } from './health/health.module';
import { OutboxModule } from './outbox/outbox.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: 'apps/payment-service/.env',
    }),
    JwtCommonModule,
    HealthModule,
    PaymentsModule,
    OutboxModule,
    ConsumersModule,
  ],
  providers: [...GLOBAL_HTTP_PROVIDERS],
})
export class PaymentServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
