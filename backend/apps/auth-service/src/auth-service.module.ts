import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CorrelationIdMiddleware,
  GLOBAL_HTTP_PROVIDERS,
  JwtCommonModule,
} from '@app/common';
import { AuthModule } from './auth/auth.module';
import { envSchema } from './env.schema';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: 'apps/auth-service/.env',
    }),
    JwtCommonModule,
    HealthModule,
    AuthModule,
  ],
  providers: [...GLOBAL_HTTP_PROVIDERS],
})
export class AuthServiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
