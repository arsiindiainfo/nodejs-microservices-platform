import { Module } from '@nestjs/common';
import { SnsPublisherService } from '@app/messaging';
import { DatabaseModule } from '../database/database.module';
import { PaymentOutboxPublisherService } from './payment-outbox-publisher.service';

@Module({
  imports: [DatabaseModule],
  providers: [SnsPublisherService, PaymentOutboxPublisherService],
})
export class OutboxModule {}
