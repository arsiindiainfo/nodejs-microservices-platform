// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import * as Joi from 'joi';
import { baseEnvSchema } from '@app/common';

export const envSchema = Joi.object({
  ...baseEnvSchema,
  USER_SERVICE_HOST: Joi.string().default('localhost'),
  USER_SERVICE_TCP_PORT: Joi.number().default(4002),
  JWT_REFRESH_EXPIRES_IN_SECONDS: Joi.number().default(60 * 60 * 24 * 7),
});
