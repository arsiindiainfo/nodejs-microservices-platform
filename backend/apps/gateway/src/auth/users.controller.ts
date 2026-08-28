import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  callTcpService,
  CurrentUser,
  ServiceName,
  USER_PATTERNS,
} from '@app/common';
import type { AuthenticatedUser, TcpMeta, UserProfile } from '@app/common';
import { RequestMeta } from '../common/request-meta.decorator';

/** §17 — GET /users/me, proxied directly to user-service. */
@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @Get('me')
  me(
    @CurrentUser() user: AuthenticatedUser,
    @RequestMeta() meta: TcpMeta,
  ): Promise<UserProfile> {
    return callTcpService(
      this.userClient,
      USER_PATTERNS.FIND_BY_ID,
      { userId: user.sub },
      meta,
      ServiceName.USER_SERVICE,
    );
  }
}
