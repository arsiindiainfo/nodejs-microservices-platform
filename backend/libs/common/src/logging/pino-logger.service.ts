// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { LoggerService } from '@nestjs/common';
import pino, { Logger as Pino } from 'pino';

type PinoLevel = 'info' | 'error' | 'warn' | 'debug' | 'trace';

/**
 * Structured JSON logs (pino) everywhere (§5) — swapped in as Nest's default
 * logger in every service's main.ts via `app.useLogger(new PinoLoggerService(name))`.
 * Never logs a raw JWT or password: the `authorization`/`password` keys are redacted
 * wherever a caller passes them inside a log object.
 */
export class PinoLoggerService implements LoggerService {
  private readonly pino: Pino;

  constructor(serviceName: string) {
    this.pino = pino({
      name: serviceName,
      level: process.env.LOG_LEVEL ?? 'info',
      redact: {
        paths: [
          'authorization',
          'password',
          'passwordHash',
          '*.authorization',
          '*.password',
        ],
        censor: '[REDACTED]',
      },
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: { colorize: true, singleLine: true },
            },
    });
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('trace', message, optionalParams);
  }

  private write(
    level: PinoLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const context =
      optionalParams.length > 0
        ? { context: optionalParams[optionalParams.length - 1] }
        : {};
    this.pino[level](context, String(message));
  }

  child(bindings: Record<string, unknown>): Pino {
    return this.pino.child(bindings);
  }

  get raw(): Pino {
    return this.pino;
  }
}
