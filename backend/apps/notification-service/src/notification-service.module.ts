// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CorrelationIdMiddleware,
  GLOBAL_HTTP_PROVIDERS,
  JwtCommonModule,
} from '@app/common';
import { ConsumersModule } from './consumers/consumers.module';
import { envSchema } from './env.schema';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: 'apps/notification-service/.env',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    JwtCommonModule,
    HealthModule,
    NotificationsModule,
    ConsumersModule,
  ],
  providers: [...GLOBAL_HTTP_PROVIDERS],
})
export class NotificationServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
