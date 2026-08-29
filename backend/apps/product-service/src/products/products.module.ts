// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { registerTcpClient, ServiceName, SERVICE_TCP_PORTS } from '@app/common';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    registerTcpClient(
      'ORDER_SERVICE',
      'ORDER_SERVICE_HOST',
      'ORDER_SERVICE_TCP_PORT',
      'localhost',
      SERVICE_TCP_PORTS[ServiceName.ORDER_SERVICE],
    ),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
