// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { EventEnvelope } from '@app/events';
import { buildAwsClientConfig } from './aws-client.config';

@Injectable()
export class SnsPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(SnsPublisherService.name);
  private readonly client: SNSClient;

  constructor(config: ConfigService) {
    this.client = new SNSClient(buildAwsClientConfig(config));
  }

  async publish(
    topicArn: string,
    envelope: EventEnvelope<unknown>,
  ): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(envelope),
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: envelope.eventType },
          correlationId: {
            DataType: 'String',
            StringValue: envelope.correlationId,
          },
        },
      }),
    );
    this.logger.log(
      `Published ${envelope.eventType} (eventId=${envelope.eventId}) to ${topicArn}`,
    );
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}
