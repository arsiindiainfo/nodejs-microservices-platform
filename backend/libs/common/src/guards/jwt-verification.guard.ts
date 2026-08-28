import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { TcpEnvelope } from '../microservice/tcp-envelope.interface';

/**
 * Independently re-verifies the JWT signature + expiry on every hop — HTTP
 * at the Gateway, TCP at every internal service. No service trusts a call
 * just because it arrived on the internal network (§6.3).
 */
@Injectable()
export class JwtVerificationGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    if (context.getType() === 'rpc') {
      return this.authenticateRpc(context);
    }
    return this.authenticateHttp(context);
  }

  private authenticateHttp(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }
    (request as Request & { user: AuthenticatedUser }).user =
      this.verify(token);
    return true;
  }

  private authenticateRpc(context: ExecutionContext): boolean {
    const envelope = context
      .switchToRpc()
      .getData<TcpEnvelope<unknown> & { user?: AuthenticatedUser }>();
    const token = envelope?.meta?.jwt;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token on internal call.');
    }
    envelope.user = this.verify(token);
    return true;
  }

  private extractBearerToken(authorizationHeader?: string): string | undefined {
    if (!authorizationHeader) return undefined;
    const [scheme, token] = authorizationHeader.split(' ');
    return scheme === 'Bearer' ? token : undefined;
  }

  private verify(token: string): AuthenticatedUser {
    try {
      return this.jwtService.verify<AuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
