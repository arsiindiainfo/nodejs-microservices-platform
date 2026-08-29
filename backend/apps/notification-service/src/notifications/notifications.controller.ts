// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  NotificationIdDto,
  NOTIFICATION_PATTERNS,
  PaginationQueryDto,
  RpcExceptionFilter,
  validateDto,
} from '@app/common';
import type {
  AuthenticatedUser,
  NotificationView,
  PaginatedResult,
  TcpEnvelope,
} from '@app/common';
import { NotificationsService } from './notifications.service';

interface AuthenticatedEnvelope<T> extends TcpEnvelope<T> {
  user?: AuthenticatedUser;
}

@UseFilters(RpcExceptionFilter)
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @MessagePattern(NOTIFICATION_PATTERNS.LIST)
  async list(
    @Payload() envelope: AuthenticatedEnvelope<PaginationQueryDto>,
  ): Promise<PaginatedResult<NotificationView>> {
    const dto = await validateDto(PaginationQueryDto, envelope.data);
    return this.notificationsService.list(envelope.user!.sub, dto);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_READ)
  async markRead(
    @Payload() envelope: AuthenticatedEnvelope<NotificationIdDto>,
  ): Promise<{ read: true }> {
    const dto = await validateDto(NotificationIdDto, envelope.data);
    await this.notificationsService.markRead(
      envelope.user!.sub,
      dto.notificationId,
    );
    return { read: true };
  }
}
