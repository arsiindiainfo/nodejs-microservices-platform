import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  CorrelationIdMiddleware,
  GLOBAL_HTTP_PROVIDERS,
  JwtCommonModule,
  RedisModule,
  RedisRateLimitGuard,
} from '@app/common';
import { AboutController } from './about/about.controller';
import { AuthModule } from './auth/auth.module';
import { envSchema } from './env.schema';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    RedisModule,
    JwtCommonModule,
    HealthModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    NotificationsModule,
  ],
  controllers: [AboutController],
  providers: [
    ...GLOBAL_HTTP_PROVIDERS,
    { provide: APP_GUARD, useClass: RedisRateLimitGuard },
  ],
})
export class GatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
