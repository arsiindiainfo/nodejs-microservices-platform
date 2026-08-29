// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  callTcpService,
  LoginDto,
  Public,
  RefreshTokenDto,
  RegisterDto,
  ServiceName,
} from '@app/common';
import type { AuthSession, TokenPair } from '@app/common';
import { RequestMeta } from '../common/request-meta.decorator';
import type { TcpMeta } from '@app/common';

/** §17 — reverse-proxies to auth-service over TCP. */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Public()
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<AuthSession> {
    return callTcpService(
      this.authClient,
      AUTH_PATTERNS.REGISTER,
      dto,
      meta,
      ServiceName.AUTH_SERVICE,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<AuthSession> {
    return callTcpService(
      this.authClient,
      AUTH_PATTERNS.LOGIN,
      dto,
      meta,
      ServiceName.AUTH_SERVICE,
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<TokenPair> {
    return callTcpService(
      this.authClient,
      AUTH_PATTERNS.REFRESH,
      dto,
      meta,
      ServiceName.AUTH_SERVICE,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(
    @Body() dto: RefreshTokenDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<{ loggedOut: true }> {
    return callTcpService(
      this.authClient,
      AUTH_PATTERNS.LOGOUT,
      dto,
      meta,
      ServiceName.AUTH_SERVICE,
    );
  }
}
