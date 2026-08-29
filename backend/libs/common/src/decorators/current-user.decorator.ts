// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/** HTTP-side accessor for the user attached by JwtVerificationGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>().user;
  },
);
