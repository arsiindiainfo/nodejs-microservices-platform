import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { normalizeToErrorBody } from '../exceptions/normalize-exception.util';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

/**
 * The HTTP half of §5's shared exception filter. Every service registers
 * this globally so an unhandled failure never leaks a bare 500 — it always
 * comes back as the §15 error envelope with a catalog error code (§16).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.headers[CORRELATION_ID_HEADER] as
      string | undefined;

    const { status, body } = normalizeToErrorBody(exception);
    if (status >= 500) {
      this.logger.error(
        `[${correlationId ?? '-'}] ${request.method} ${request.originalUrl} -> ${status} ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${correlationId ?? '-'}] ${request.method} ${request.originalUrl} -> ${status} ${body.code}: ${body.message}`,
      );
    }
    response.status(status).json({ success: false, error: body });
  }
}
