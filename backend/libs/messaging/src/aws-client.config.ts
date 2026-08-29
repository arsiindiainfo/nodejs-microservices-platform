// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { ConfigService } from '@nestjs/config';
import { SNSClientConfig } from '@aws-sdk/client-sns';
import { SQSClientConfig } from '@aws-sdk/client-sqs';

/**
 * Local dev/CI points every AWS SDK client at LocalStack (§28) via
 * AWS_ENDPOINT_URL; the deployed AWS path (§29) leaves it unset and the SDK
 * talks to real SNS/SQS. `maxAttempts` gives every publish/receive call the
 * SDK's own exponential-backoff retry — the client-side half of §12.1/§12.3's
 * "retry/backoff policy".
 */
export function buildAwsClientConfig(
  config: ConfigService,
): SNSClientConfig & SQSClientConfig {
  const endpoint = config.get<string>('AWS_ENDPOINT_URL');
  return {
    region: config.get<string>('AWS_REGION', 'us-east-1'),
    maxAttempts: 5,
    ...(endpoint
      ? {
          endpoint,
          credentials: {
            accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', 'test'),
            secretAccessKey: config.get<string>(
              'AWS_SECRET_ACCESS_KEY',
              'test',
            ),
          },
        }
      : {}),
  };
}
