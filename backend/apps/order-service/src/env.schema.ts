// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import * as Joi from 'joi';
import { baseEnvSchema } from '@app/common';

export const envSchema = Joi.object({
  ...baseEnvSchema,
  MSSQL_HOST: Joi.string().required(),
  MSSQL_PORT: Joi.number().default(1433),
  MSSQL_USER: Joi.string().required(),
  MSSQL_PASSWORD: Joi.string().required(),
  MSSQL_DATABASE: Joi.string().required(),
  PRODUCT_SERVICE_HOST: Joi.string().default('localhost'),
  PRODUCT_SERVICE_TCP_PORT: Joi.number().default(4003),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ENDPOINT_URL: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().default('test'),
  AWS_SECRET_ACCESS_KEY: Joi.string().default('test'),
  SNS_ORDER_EVENTS_TOPIC_ARN: Joi.string().required(),
  ORDER_SVC_PAYMENT_QUEUE_URL: Joi.string().required(),
  OUTBOX_POLL_INTERVAL_MS: Joi.number().default(2000),
});
