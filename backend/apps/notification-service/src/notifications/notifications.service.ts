import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationQueryDto } from '@app/common';
import type { NotificationView, PaginatedResult } from '@app/common';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    message: string,
  ): Promise<void> {
    await this.notificationModel.create({ userId, type, message, read: false });
  }

  async list(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<NotificationView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { userId };

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toView(item)),
      page,
      limit,
      total,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationModel
      .updateOne({ _id: notificationId, userId }, { $set: { read: true } })
      .exec();
    if (result.matchedCount === 0) {
      throw new NotFoundException('Notification was not found.');
    }
  }

  private toView(notification: NotificationDocument): NotificationView {
    return {
      id: notification._id,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      createdAt: (notification.createdAt ?? new Date()).toISOString(),
    };
  }
}
