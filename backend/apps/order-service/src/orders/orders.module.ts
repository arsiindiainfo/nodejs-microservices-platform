// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { registerTcpClient, ServiceName, SERVICE_TCP_PORTS } from '@app/common';
import { DatabaseModule } from '../database/database.module';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    DatabaseModule,
    registerTcpClient(
      'PRODUCT_SERVICE',
      'PRODUCT_SERVICE_HOST',
      'PRODUCT_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.PRODUCT_SERVICE],
    ),
  ],
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
