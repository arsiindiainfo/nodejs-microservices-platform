import { Module } from '@nestjs/common';
import { registerTcpClient, ServiceName, SERVICE_TCP_PORTS } from '@app/common';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    registerTcpClient(
      'ORDER_SERVICE',
      'ORDER_SERVICE_HOST',
      'ORDER_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.ORDER_SERVICE],
    ),
    registerTcpClient(
      'PAYMENT_SERVICE',
      'PAYMENT_SERVICE_HOST',
      'PAYMENT_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.PAYMENT_SERVICE],
    ),
  ],
  controllers: [OrdersController],
})
export class OrdersModule {}
