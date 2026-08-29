// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

/**
 * §12.1's OutboxPublisher: on an interval, claims a batch of unpublished
 * rows and publishes them to SNS. The claim (§10.4's UPDLOCK/READPAST
 * procedure), the SNS publish, and marking the rows published must all
 * happen inside the SAME database transaction the concrete subclass opens —
 * that's what makes "if the publisher crashes mid-batch, the unpublished
 * rows are simply still unpublished" true. Because that transaction scoping
 * is inherently engine-specific (SQL Server vs MySQL client libraries), this
 * base class only drives the interval and leaves `runOnce()` to do the work.
 */
@Injectable()
export abstract class OutboxPublisherBase
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(this.constructor.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;

  protected constructor(private readonly pollIntervalMs = 2000) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), this.pollIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    if (this.ticking) {
      return; // previous tick still publishing a batch — don't overlap
    }
    this.ticking = true;
    try {
      await this.runOnce();
    } catch (error) {
      this.logger.error(
        `Outbox publish tick failed: ${(error as Error).message}`,
      );
    } finally {
      this.ticking = false;
    }
  }

  /**
   * Claim a batch, publish each row to SNS, mark published — all inside one
   * transaction so a crash anywhere in this sequence leaves claimed-but-
   * unpublished rows rolled back to plain unpublished, not lost or stuck.
   */
  protected abstract runOnce(): Promise<void>;
}
