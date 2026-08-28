import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentResultConsumer } from './payment-result.consumer';

@Module({
  imports: [OrdersModule],
  providers: [PaymentResultConsumer],
})
export class ConsumersModule {}
