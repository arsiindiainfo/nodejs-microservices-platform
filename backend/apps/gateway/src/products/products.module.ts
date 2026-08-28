import { Module } from '@nestjs/common';
import { registerTcpClient, ServiceName, SERVICE_TCP_PORTS } from '@app/common';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    registerTcpClient(
      'PRODUCT_SERVICE',
      'PRODUCT_SERVICE_HOST',
      'PRODUCT_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.PRODUCT_SERVICE],
    ),
  ],
  controllers: [ProductsController],
})
export class ProductsModule {}
