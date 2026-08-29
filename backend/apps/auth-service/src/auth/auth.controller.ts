// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  LoginDto,
  Public,
  RefreshTokenDto,
  RegisterDto,
  RpcExceptionFilter,
  validateDto,
} from '@app/common';
import type { AuthSession, TcpEnvelope, TokenPair } from '@app/common';
import { AuthService } from './auth.service';

@UseFilters(RpcExceptionFilter)
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @MessagePattern(AUTH_PATTERNS.REGISTER)
  async register(
    @Payload() envelope: TcpEnvelope<RegisterDto>,
  ): Promise<AuthSession> {
    const dto = await validateDto(RegisterDto, envelope.data);
    return this.authService.register(dto, envelope.meta);
  }

  @Public()
  @MessagePattern(AUTH_PATTERNS.LOGIN)
  async login(
    @Payload() envelope: TcpEnvelope<LoginDto>,
  ): Promise<AuthSession> {
    const dto = await validateDto(LoginDto, envelope.data);
    return this.authService.login(dto, envelope.meta);
  }

  @Public()
  @MessagePattern(AUTH_PATTERNS.REFRESH)
  async refresh(
    @Payload() envelope: TcpEnvelope<RefreshTokenDto>,
  ): Promise<TokenPair> {
    const dto = await validateDto(RefreshTokenDto, envelope.data);
    return this.authService.refresh(dto.refreshToken);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async logout(
    @Payload() envelope: TcpEnvelope<RefreshTokenDto>,
  ): Promise<{ loggedOut: true }> {
    const dto = await validateDto(RefreshTokenDto, envelope.data);
    await this.authService.logout(dto.refreshToken);
    return { loggedOut: true };
  }
}
