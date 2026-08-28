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
import { OrdersModule } from './orders/orders.module';
import { OutboxModule } from './outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    JwtCommonModule,
    HealthModule,
    OrdersModule,
    OutboxModule,
    ConsumersModule,
  ],
  providers: [...GLOBAL_HTTP_PROVIDERS],
})
export class OrderServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
