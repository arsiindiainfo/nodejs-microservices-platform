// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../constants/role.enum';
import { ForbiddenRoleException } from '../exceptions/domain.exceptions';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { TcpEnvelope } from '../microservice/tcp-envelope.interface';

/** Runs after JwtVerificationGuard — checks the already-attached user's role against @Roles(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user = this.resolveUser(context);
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenRoleException();
    }
    return true;
  }

  private resolveUser(
    context: ExecutionContext,
  ): AuthenticatedUser | undefined {
    if (context.getType() === 'rpc') {
      return context
        .switchToRpc()
        .getData<TcpEnvelope<unknown> & { user?: AuthenticatedUser }>().user;
    }
    return context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>().user;
  }
}
