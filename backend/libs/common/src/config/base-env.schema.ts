import * as Joi from 'joi';

/**
 * Config validated at boot via Joi (§5) — a service refuses to start rather
 * than run with a missing secret or connection string. Every service's own
 * Joi.object({ ...baseEnvSchema, ...itsOwnKeys }) extends this.
 */
export const baseEnvSchema = {
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  TCP_PORT: Joi.number().default(4000),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
};
