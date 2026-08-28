import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { OrderCreatedConsumer } from './order-created.consumer';

@Module({
  imports: [PaymentsModule],
  providers: [OrderCreatedConsumer],
})
export class ConsumersModule {}
