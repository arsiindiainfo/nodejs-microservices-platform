// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Generates an X-Correlation-Id for every inbound request (or forwards one
 * already present) so a single "place an order" action can be traced end to
 * end across every service and event payload (§13.1).
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(CORRELATION_ID_HEADER);
    const correlationId =
      incoming && incoming.length > 0 ? incoming : randomUUID();
    req.headers[CORRELATION_ID_HEADER] = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}

export function getCorrelationId(req: Request): string {
  return (req.headers[CORRELATION_ID_HEADER] as string) ?? randomUUID();
}
