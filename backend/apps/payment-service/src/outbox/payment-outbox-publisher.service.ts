// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { deriveEventId, EventType, wrapEvent } from '@app/events';
import { OutboxPublisherBase, SnsPublisherService } from '@app/messaging';
import { ServiceName } from '@app/common';

interface ClaimedRow {
  id: number;
  event_type: string;
  payload: string | object;
  created_at: string;
}

@Injectable()
export class PaymentOutboxPublisherService extends OutboxPublisherBase {
  private readonly topicArn: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly snsPublisher: SnsPublisherService,
    config: ConfigService,
  ) {
    super(config.get<number>('OUTBOX_POLL_INTERVAL_MS', 2000));
    this.topicArn = config.getOrThrow<string>('SNS_PAYMENT_EVENTS_TOPIC_ARN');
  }

  protected async runOnce(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const claimed = (await queryRunner.query(
        'CALL sp_outbox_claim_batch(?)',
        [20],
      )) as ClaimedRow[] | [ClaimedRow[], unknown];
      const rows = Array.isArray(claimed[0])
        ? claimed[0]
        : (claimed as ClaimedRow[]);

      for (const row of rows) {
        const payload: object =
          typeof row.payload === 'string'
            ? (JSON.parse(row.payload) as object)
            : row.payload;
        const envelope = wrapEvent(
          deriveEventId(ServiceName.PAYMENT_SERVICE, row.id),
          row.event_type as EventType,
          randomUUID(),
          payload,
          new Date(row.created_at).toISOString(),
        );
        await this.snsPublisher.publish(this.topicArn, envelope);
        await queryRunner.query('CALL sp_outbox_mark_published(?)', [row.id]);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
