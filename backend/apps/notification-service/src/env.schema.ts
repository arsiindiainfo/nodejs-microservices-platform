// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import * as Joi from 'joi';
import { baseEnvSchema } from '@app/common';

export const envSchema = Joi.object({
  ...baseEnvSchema,
  MONGO_URI: Joi.string().uri().required(),
  ORDER_SERVICE_HOST: Joi.string().default('localhost'),
  ORDER_SERVICE_TCP_PORT: Joi.number().default(4004),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ENDPOINT_URL: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().default('test'),
  AWS_SECRET_ACCESS_KEY: Joi.string().default('test'),
  NOTIFICATION_SVC_ORDER_QUEUE_URL: Joi.string().required(),
  NOTIFICATION_SVC_PAYMENT_QUEUE_URL: Joi.string().required(),
});
