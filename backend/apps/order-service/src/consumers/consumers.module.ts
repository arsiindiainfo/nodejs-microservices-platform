// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentResultConsumer } from './payment-result.consumer';

@Module({
  imports: [OrdersModule],
  providers: [PaymentResultConsumer],
})
export class ConsumersModule {}
