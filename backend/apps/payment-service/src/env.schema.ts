import * as Joi from 'joi';
import { baseEnvSchema } from '@app/common';

export const envSchema = Joi.object({
  ...baseEnvSchema,
  MYSQL_HOST: Joi.string().required(),
  MYSQL_PORT: Joi.number().default(3306),
  MYSQL_USER: Joi.string().required(),
  MYSQL_PASSWORD: Joi.string().required(),
  MYSQL_DATABASE: Joi.string().required(),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ENDPOINT_URL: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().default('test'),
  AWS_SECRET_ACCESS_KEY: Joi.string().default('test'),
  SNS_PAYMENT_EVENTS_TOPIC_ARN: Joi.string().required(),
  PAYMENT_SVC_ORDER_QUEUE_URL: Joi.string().required(),
  OUTBOX_POLL_INTERVAL_MS: Joi.number().default(2000),
});
