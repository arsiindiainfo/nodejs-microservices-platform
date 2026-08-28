import { Module } from '@nestjs/common';
import {
  RedisModule,
  registerTcpClient,
  ServiceName,
  SERVICE_TCP_PORTS,
} from '@app/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    RedisModule,
    registerTcpClient(
      'USER_SERVICE',
      'USER_SERVICE_HOST',
      'USER_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.USER_SERVICE],
    ),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
