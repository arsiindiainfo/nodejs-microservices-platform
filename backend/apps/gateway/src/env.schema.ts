import * as Joi from 'joi';
import { baseEnvSchema } from '@app/common';

export const envSchema = Joi.object({
  ...baseEnvSchema,
  AUTH_SERVICE_HOST: Joi.string().default('localhost'),
  AUTH_SERVICE_TCP_PORT: Joi.number().default(4001),
  USER_SERVICE_HOST: Joi.string().default('localhost'),
  USER_SERVICE_TCP_PORT: Joi.number().default(4002),
  PRODUCT_SERVICE_HOST: Joi.string().default('localhost'),
  PRODUCT_SERVICE_TCP_PORT: Joi.number().default(4003),
  ORDER_SERVICE_HOST: Joi.string().default('localhost'),
  ORDER_SERVICE_TCP_PORT: Joi.number().default(4004),
  PAYMENT_SERVICE_HOST: Joi.string().default('localhost'),
  PAYMENT_SERVICE_TCP_PORT: Joi.number().default(4005),
  NOTIFICATION_SERVICE_HOST: Joi.string().default('localhost'),
  NOTIFICATION_SERVICE_TCP_PORT: Joi.number().default(4006),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
});
