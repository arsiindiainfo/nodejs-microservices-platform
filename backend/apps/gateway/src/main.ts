// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import {
  GlobalExceptionFilter,
  PinoLoggerService,
  ResponseEnvelopeInterceptor,
} from '@app/common';
import { GatewayModule } from './gateway.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(GatewayModule, { bufferLogs: true });
  app.useLogger(new PinoLoggerService('gateway'));

  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DemoTech Commerce API')
    .setDescription(
      "Enterprise API Gateway + Microservices Demo — the platform's single public API contract (§27).",
    )
    .setVersion('1.0')
    .setContact('Arsi India Info', 'https://arsiindiainfo.com', '')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(
    `gateway ready — HTTP :${port}, docs at /api/docs`,
  );
}

void bootstrap();
