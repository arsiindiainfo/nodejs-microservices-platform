import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { deriveEventId, EventType, wrapEvent } from '@app/events';
import { OutboxPublisherBase, SnsPublisherService } from '@app/messaging';
import { ServiceName } from '@app/common';

interface ClaimedRow {
  OutboxId: number;
  EventType: string;
  Payload: string;
  CreatedAt: string;
}

@Injectable()
export class OrderOutboxPublisherService extends OutboxPublisherBase {
  private readonly topicArn: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly snsPublisher: SnsPublisherService,
    config: ConfigService,
  ) {
    super(config.get<number>('OUTBOX_POLL_INTERVAL_MS', 2000));
    this.topicArn = config.getOrThrow<string>('SNS_ORDER_EVENTS_TOPIC_ARN');
  }

  protected async runOnce(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const claimed = (await queryRunner.query(
        'EXEC dbo.usp_OutboxEvent_ClaimBatch @BatchSize = @0',
        [20],
      )) as ClaimedRow[];

      for (const row of claimed) {
        const envelope = wrapEvent(
          deriveEventId(ServiceName.ORDER_SERVICE, row.OutboxId),
          row.EventType as EventType,
          randomUUID(),
          JSON.parse(row.Payload),
          new Date(row.CreatedAt).toISOString(),
        );
        await this.snsPublisher.publish(this.topicArn, envelope);
        await queryRunner.query(
          'EXEC dbo.usp_OutboxEvent_MarkPublished @OutboxId = @0',
          [row.OutboxId],
        );
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
