// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { registerTcpClient, ServiceName, SERVICE_TCP_PORTS } from '@app/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrderCreatedConsumer } from './order-created.consumer';
import { PaymentResultConsumer } from './payment-result.consumer';

@Module({
  imports: [
    NotificationsModule,
    registerTcpClient(
      'ORDER_SERVICE',
      'ORDER_SERVICE_HOST',
      'ORDER_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.ORDER_SERVICE],
    ),
  ],
  providers: [OrderCreatedConsumer, PaymentResultConsumer],
})
export class ConsumersModule {}
