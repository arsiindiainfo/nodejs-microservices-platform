// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { registerTcpClient, ServiceName, SERVICE_TCP_PORTS } from '@app/common';
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';

@Module({
  imports: [
    registerTcpClient(
      'AUTH_SERVICE',
      'AUTH_SERVICE_HOST',
      'AUTH_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.AUTH_SERVICE],
    ),
    registerTcpClient(
      'USER_SERVICE',
      'USER_SERVICE_HOST',
      'USER_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.USER_SERVICE],
    ),
  ],
  controllers: [AuthController, UsersController],
})
export class AuthModule {}
