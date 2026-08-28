import { Logger, Type, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { PinoLoggerService } from '../logging/pino-logger.service';

/**
 * Shared bootstrap for every internal service (§4): HTTP for /health +
 * /health/ready, TCP for MessagePattern handlers, both behind the same
 * ValidationPipe and GlobalExceptionFilter. The Gateway (HTTP-only, no TCP
 * server of its own) has its own bootstrap in apps/gateway/src/main.ts.
 */
export async function bootstrapMicroservice(
  serviceName: string,
  module: Type<unknown>,
): Promise<void> {
  const app = await NestFactory.create(module, { bufferLogs: true });
  app.useLogger(new PinoLoggerService(serviceName));

  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const tcpPort = config.get<number>('TCP_PORT', 4000);
  const httpPort = config.get<number>('PORT', 3000);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: tcpPort },
  });

  await app.startAllMicroservices();
  await app.listen(httpPort);

  new Logger('Bootstrap').log(
    `${serviceName} ready — HTTP :${httpPort}, TCP :${tcpPort}`,
  );
}
