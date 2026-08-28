import { DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

/**
 * One-liner for a service to register a TCP `ClientProxy` to another service,
 * host/port coming from env with a sensible docker-compose-friendly default.
 * `@Inject(injectionToken)` retrieves the resulting `ClientProxy`.
 */
export function registerTcpClient(
  injectionToken: string,
  hostEnvKey: string,
  portEnvKey: string,
  defaultHost: string,
  defaultPort: number,
): DynamicModule {
  return ClientsModule.registerAsync([
    {
      name: injectionToken,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: Transport.TCP,
        options: {
          host: config.get<string>(hostEnvKey, defaultHost),
          port: config.get<number>(portEnvKey, defaultPort),
        },
      }),
    },
  ]);
}
