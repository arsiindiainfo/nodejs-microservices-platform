// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { EventEnvelope } from '@app/events';
import { buildAwsClientConfig } from './aws-client.config';

export interface SqsConsumerOptions {
  queueUrl: string;
  waitTimeSeconds?: number;
  visibilityTimeoutSeconds?: number;
  errorBackoffMs?: number;
}

/**
 * Long-polls one SQS queue and hands each message to `handleEvent`. A
 * message is deleted only after `handleEvent` resolves — if it throws, the
 * message becomes visible again after the visibility timeout and SQS's own
 * redrive policy eventually moves it to the DLQ after 5 attempts (§12.3).
 * Idempotency (§12.2) is the concrete subclass's job, not this base class's.
 */
@Injectable()
export abstract class SqsConsumerBase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(this.constructor.name);
  private readonly client: SQSClient;
  private running = false;

  protected constructor(
    config: ConfigService,
    private readonly options: SqsConsumerOptions,
  ) {
    this.client = new SQSClient(buildAwsClientConfig(config));
  }

  onModuleInit(): void {
    this.running = true;
    void this.pollLoop();
  }

  onModuleDestroy(): void {
    this.running = false;
    this.client.destroy();
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        const { Messages } = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.options.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: this.options.waitTimeSeconds ?? 10,
            VisibilityTimeout: this.options.visibilityTimeoutSeconds ?? 30,
          }),
        );
        for (const message of Messages ?? []) {
          await this.handleMessage(message);
        }
      } catch (error) {
        this.logger.error(
          `SQS poll failed on ${this.options.queueUrl}: ${(error as Error).message}`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.options.errorBackoffMs ?? 2000),
        );
      }
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      const envelope = JSON.parse(
        message.Body ?? '{}',
      ) as EventEnvelope<unknown>;
      await this.handleEvent(envelope);
      await this.client.send(
        new DeleteMessageCommand({
          QueueUrl: this.options.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to process message ${message.MessageId}: ${(error as Error).message}`,
      );
    }
  }

  protected abstract handleEvent(
    envelope: EventEnvelope<unknown>,
  ): Promise<void>;
}
