// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Module } from '@nestjs/common';
import { SnsPublisherService } from '@app/messaging';
import { DatabaseModule } from '../database/database.module';
import { OrderOutboxPublisherService } from './order-outbox-publisher.service';

@Module({
  imports: [DatabaseModule],
  providers: [SnsPublisherService, OrderOutboxPublisherService],
})
export class OutboxModule {}
