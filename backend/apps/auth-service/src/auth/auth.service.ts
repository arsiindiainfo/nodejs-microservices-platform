// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import Redis from 'ioredis';
import {
  callTcpService,
  LoginDto,
  RegisterDto,
  REDIS_CLIENT,
  ServiceName,
  TcpMeta,
  USER_PATTERNS,
} from '@app/common';
import type {
  AuthSession,
  JwtPayload,
  TokenPair,
  UserProfile,
} from '@app/common';
import { RecaptchaService } from './recaptcha.service';

const REFRESH_KEY_PREFIX = 'refresh:';

interface RefreshRecord {
  userId: string;
  email: string;
  role: JwtPayload['role'];
}

/**
 * Stateless JWT issuance (§4) — auth-service owns only the Redis-backed
 * refresh-token ledger (§9); every credential check is delegated to
 * user-service, which never hands back a password hash (§6.2). The refresh
 * record caches the minimal claims needed to reissue an access token so
 * `/auth/refresh` never needs a still-valid JWT to authorize an internal
 * lookup — the refresh token itself, checked against Redis, is the credential.
 */
@Injectable()
export class AuthService {
  private readonly refreshTtlSeconds: number;

  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly recaptcha: RecaptchaService,
    config: ConfigService,
  ) {
    this.refreshTtlSeconds = config.get<number>(
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
      60 * 60 * 24 * 7,
    );
  }

  async register(dto: RegisterDto, meta: TcpMeta): Promise<AuthSession> {
    await this.recaptcha.verify(dto.recaptchaToken);
    const user = await callTcpService<UserProfile>(
      this.userClient,
      USER_PATTERNS.REGISTER,
      dto,
      meta,
      ServiceName.USER_SERVICE,
    );
    return this.issueSession(user);
  }

  async login(dto: LoginDto, meta: TcpMeta): Promise<AuthSession> {
    await this.recaptcha.verify(dto.recaptchaToken);
    const user = await callTcpService<UserProfile>(
      this.userClient,
      USER_PATTERNS.VERIFY_CREDENTIALS,
      dto,
      meta,
      ServiceName.USER_SERVICE,
    );
    return this.issueSession(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hash(refreshToken);
    const raw = await this.redis.get(REFRESH_KEY_PREFIX + tokenHash);
    if (!raw) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    await this.redis.del(REFRESH_KEY_PREFIX + tokenHash);

    const record = JSON.parse(raw) as RefreshRecord;
    return this.issueTokenPair(record);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.redis.del(REFRESH_KEY_PREFIX + this.hash(refreshToken));
  }

  private async issueSession(user: UserProfile): Promise<AuthSession> {
    const tokens = await this.issueTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return { ...tokens, user };
  }

  private async issueTokenPair(record: RefreshRecord): Promise<TokenPair> {
    const accessToken = this.jwtService.sign({
      sub: record.userId,
      email: record.email,
      role: record.role,
    });
    const refreshToken = randomBytes(32).toString('hex');
    await this.redis.set(
      REFRESH_KEY_PREFIX + this.hash(refreshToken),
      JSON.stringify(record),
      'EX',
      this.refreshTtlSeconds,
    );
    return { accessToken, refreshToken };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
