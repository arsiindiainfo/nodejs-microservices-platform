import { Module } from '@nestjs/common';
import { registerTcpClient, ServiceName, SERVICE_TCP_PORTS } from '@app/common';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    registerTcpClient(
      'NOTIFICATION_SERVICE',
      'NOTIFICATION_SERVICE_HOST',
      'NOTIFICATION_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.NOTIFICATION_SERVICE],
    ),
  ],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
