import * as Joi from 'joi';
import { baseEnvSchema } from '@app/common';

export const envSchema = Joi.object({
  ...baseEnvSchema,
  MONGO_URI: Joi.string().uri().required(),
  ORDER_SERVICE_HOST: Joi.string().default('localhost'),
  ORDER_SERVICE_TCP_PORT: Joi.number().default(4004),
});
