import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CORRELATION_ID_HEADER, TcpMeta } from '@app/common';

/** Builds the TcpMeta forwarded on every downstream TCP call from the inbound HTTP request (§6.3, §13.1). */
export const RequestMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TcpMeta => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    return {
      correlationId: request.headers[CORRELATION_ID_HEADER] as string,
      jwt: scheme === 'Bearer' ? token : undefined,
    };
  },
);
