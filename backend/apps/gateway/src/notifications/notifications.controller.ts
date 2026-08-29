// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  callTcpService,
  PaginationQueryDto,
  ServiceName,
  NOTIFICATION_PATTERNS,
} from '@app/common';
import type { NotificationView, PaginatedResult, TcpMeta } from '@app/common';
import { RequestMeta } from '../common/request-meta.decorator';

/** §20 — reverse-proxies to notification-service over TCP. */
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {}

  @Get()
  list(
    @Query() query: PaginationQueryDto,
    @RequestMeta() meta: TcpMeta,
  ): Promise<PaginatedResult<NotificationView>> {
    return callTcpService(
      this.notificationClient,
      NOTIFICATION_PATTERNS.LIST,
      query,
      meta,
      ServiceName.NOTIFICATION_SERVICE,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/read')
  markRead(
    @Param('id') notificationId: string,
    @RequestMeta() meta: TcpMeta,
  ): Promise<{ read: true }> {
    return callTcpService(
      this.notificationClient,
      NOTIFICATION_PATTERNS.MARK_READ,
      { notificationId },
      meta,
      ServiceName.NOTIFICATION_SERVICE,
    );
  }
}
